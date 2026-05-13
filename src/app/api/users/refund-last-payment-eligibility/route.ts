import { NextResponse } from "next/server";
import { auth, appUserAdmin } from "@/lib/auth/server-auth";
import {
  emailsFromAuthUser,
  resolveStripeCustomerId,
} from "@/lib/resolveStripeCustomerId";
import { getLastPaymentInstantRefundEligibility } from "@/lib/stripeLastPaymentSelfService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const authAdmin = await appUserAdmin();
    const user = await authAdmin.users.getUser(userId);

    const customerId = await resolveStripeCustomerId(userId, {
      stripeCustomerIdFromPrivate: user.privateMetadata?.stripeCustomerId as
        | string
        | undefined,
      emails: emailsFromAuthUser(user),
    });

    if (!customerId) {
      return NextResponse.json({
        eligible: false,
        reason: "no_stripe_customer",
        message:
          "Automatic refund is only available for card payments through our billing provider.",
      });
    }

    const elig = await getLastPaymentInstantRefundEligibility(customerId);
    if (!elig.eligible) {
      return NextResponse.json({
        eligible: false,
        reason: elig.reason,
        message: elig.message,
      });
    }

    return NextResponse.json({
      eligible: true,
      amountDisplay: elig.amountDisplay,
      paidAtIso: elig.paidAtIso,
      currency: elig.currency,
    });
  } catch (error) {
    console.error("[refund-last-payment-eligibility]", error);
    return NextResponse.json(
      { eligible: false, reason: "error", message: "Could not check eligibility." },
      { status: 500 }
    );
  }
}

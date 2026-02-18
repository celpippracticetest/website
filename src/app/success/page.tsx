import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import DashboardHome from "@/components/dashboard-app/dashboardHome";
import mongoClient from "@/lib/mongodb";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { Analytics } from "@customerio/cdp-analytics-node";
import SuccessPageTracking from "@/components/analytics/SuccessPageTracking";

export default async function Success({ searchParams }: any) {
  const params = searchParams ? await searchParams : {};
  const sessionIdRaw = params?.session_id;
  const session_id =
    typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : undefined;
  const user = await currentUser();

  // Cross-domain measurement can append extra query params (for example `_gl`).
  // Avoid throwing 500s when checkout-specific params are missing or malformed.
  if (!session_id || !session_id.startsWith("cs_")) {
    redirect("/");
  }

  let session;
  try {
    // Retrieve the session and expand payment_intent into an object
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items", "payment_intent"],
    });
  } catch (error) {
    console.error("[success] failed to retrieve checkout session", {
      session_id,
      error,
    });
    redirect("/");
  }

  const sessionData = JSON.parse(JSON.stringify(session));

  // Extract and guard session status
  const status = session.status;
  const paymentIntentExpanded = typeof session.payment_intent !== "string";

  // Other fields from session
  const amountTotal = session?.amount_total;
  const currency = session?.currency;
  const customerEmail = session?.customer_details?.email;
  const lineItems = session?.line_items?.data;

  if (status === "open") redirect("/");
  const userRepo = new CheckoutRepository(mongoClient);
  const prevCheckout = await userRepo.findCheckoutBySessionId(session_id);
  if (prevCheckout !== null) {
    return (
      <div className=" bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        <DashboardHome session={sessionData} email={customerEmail} />
      </div>
    );
  }
  if (!user) redirect("/");

  await userRepo.createCheckout({
    userId: user.id,
    checkoutId: session_id,
    createdAt: new Date(),
    status: status?.toString(),
    lineItems,
  });

  if (status === "complete" && paymentIntentExpanded) {
    const publicMetadata = (await auth()).sessionClaims?.metadata;
    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      publicMetadata: {
        ...publicMetadata,
        plan: "premium",
        // Ensure referral is disabled immediately after a successful purchase
        referralActive: false,
        referralDiscountUsed: true,
        referralDiscountUsedAt: new Date().toISOString(),
        referralDiscountActive: false,
      },
    });
    const cioanalytics = new Analytics({
      writeKey: "9c3070e20a6782f0f20d", // TODO fix it to read form ENV
      host: "https://cdp.customer.io",
    });
    cioanalytics.identify({
      userId: user.id,
      traits: {
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName,
        plan: "premium",
      },
    });

    return (
      <div className="bg-[#F4F7FF]  min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        <SuccessPageTracking
          transactionId={(session?.invoice as string) || session_id}
          value={(amountTotal ?? 0) / 100}
          currency={currency?.toUpperCase() || 'CAD'}
          items={lineItems || []}
          email={customerEmail?.trim().toLowerCase()}
        />

        <DashboardHome session={sessionData} email={customerEmail} />
      </div>
    );
  }
  redirect("/");
}

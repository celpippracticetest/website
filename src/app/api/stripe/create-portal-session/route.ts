import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { currentUser } from "@/lib/auth/server-auth";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import documentsClient from "@/lib/appDocumentsClient";
import { findLiveStripeCustomerId } from "@/lib/stripe/liveSubscription";

export async function POST(req: Request) {
  try {
    const user = await currentUser();

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const checkoutRepo = new CheckoutRepository(documentsClient);
    const lastCheckout = await checkoutRepo.findLatestCheckoutByUserId(user.id);

    const customerIds: string[] = [];
    let debugInfo = "";

    if (lastCheckout) {
      const session = await stripe.checkout.sessions.retrieve(
        lastCheckout.checkoutId,
      );
      if (session?.customer) {
        customerIds.push(session.customer as string);
      } else {
        debugInfo += "Checkout found but no customer in session. ";
      }
    } else {
      debugInfo += "No local checkout found. ";
    }

    const fromMeta = user.privateMetadata?.stripeCustomerId;
    if (typeof fromMeta === "string" && fromMeta.trim()) {
      const id = fromMeta.trim();
      if (!customerIds.includes(id)) customerIds.push(id);
    }

    const primaryEmailId =
      "primaryEmailAddressId" in user &&
      typeof (user as { primaryEmailAddressId?: string }).primaryEmailAddressId ===
        "string"
        ? (user as { primaryEmailAddressId: string }).primaryEmailAddressId
        : (user as { primaryEmailAddress?: { id?: string } }).primaryEmailAddress
            ?.id ??
          (user as { emailAddresses?: Array<{ id?: string }> }).emailAddresses?.[0]
            ?.id;
    const email = user.emailAddresses.find(
      (e: { id?: string; emailAddress?: string }) => e.id === primaryEmailId,
    )?.emailAddress;

    const emailsToSearch = [
      email,
      ...user.emailAddresses.map(
        (e: { emailAddress?: string }) => e.emailAddress,
      ),
    ].filter(
      (e, i, arr): e is string => Boolean(e) && arr.indexOf(e) === i,
    );

    for (const userEmail of emailsToSearch) {
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 5,
      });
      for (const customer of customers.data) {
        if (!customerIds.includes(customer.id)) {
          customerIds.push(customer.id);
        }
      }
    }

    const stripeCustomerId = await findLiveStripeCustomerId(customerIds);

    if (!stripeCustomerId) {
      console.error(`[STRIPE_PORTAL] No live subscription. Debug: ${debugInfo}`);
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 400 },
      );
    }

    const returnUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/profile`
      : `${req.headers.get("origin")}/profile`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (error: unknown) {
    console.error("[STRIPE_PORTAL]", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal Error: ${errorMessage}` },
      { status: 500 },
    );
  }
}

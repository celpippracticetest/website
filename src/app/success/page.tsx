import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import DashboardHome from "@/components/dashboard-app/dashboardHome";
import mongoClient, { getDb } from "@/lib/mongodb";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { Analytics } from "@customerio/cdp-analytics-node";
import SuccessPageTracking from "@/components/analytics/SuccessPageTracking";
import {
  resolveSuccessUpgradeOffer,
  toClientUpgradeOffer,
  type SuccessUpgradeOfferForClient,
} from "@/lib/successPageUpgrade";
import { waitForCheckoutRecord } from "@/lib/waitForCheckoutRecord";
import { findOrCreateClerkUserByEmail } from "@/lib/clerkGuestCheckout";
import { getRequestOriginFromHeaders } from "@/lib/requestOrigin";

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
  const checkoutMetadata = session?.metadata || {};

  let upgradeOffer: SuccessUpgradeOfferForClient | null = null;
  if (user?.id) {
    try {
      const db = await getDb();
      const resolved = await resolveSuccessUpgradeOffer(session_id, db, {
        clerkUserId: user.id,
        clerkEmail: user.primaryEmailAddress?.emailAddress ?? null,
      });
      if (resolved) upgradeOffer = toClientUpgradeOffer(resolved);
    } catch (err) {
      console.error("[success] upgrade offer:", err);
    }
  }
  const purchaseAttributionData = {
    attribution_source:
      checkoutMetadata.attribution_source || checkoutMetadata.utm_source || null,
    attribution_medium:
      checkoutMetadata.attribution_medium || checkoutMetadata.utm_medium || null,
    attribution_campaign:
      checkoutMetadata.attribution_campaign || checkoutMetadata.utm_campaign || null,
    attribution_gclid: checkoutMetadata.attribution_gclid || checkoutMetadata.gclid || null,
    utm_source: checkoutMetadata.utm_source || null,
    utm_medium: checkoutMetadata.utm_medium || null,
    utm_campaign: checkoutMetadata.utm_campaign || null,
    utm_content: checkoutMetadata.utm_content || null,
    utm_term: checkoutMetadata.utm_term || null,
    entry_page: checkoutMetadata.entry_page || checkoutMetadata.entryPage || null,
    purchase_page: checkoutMetadata.purchase_page || null,
  };

  if (status === "open") redirect("/");

  const guestCheckout =
    String(checkoutMetadata.guest_checkout ?? "").toLowerCase() === "true";

  // Guest checkout: ensure Clerk user exists (webhook may still be running), then
  // send payer to sign-up with a locked Stripe email + password (or Google for Gmail).
  if (!user && status === "complete" && guestCheckout && customerEmail?.trim()) {
    const emailNorm = customerEmail.trim().toLowerCase();
    try {
      await findOrCreateClerkUserByEmail(emailNorm);
    } catch (e) {
      console.error("[success] guest findOrCreateUser", e);
    }
    const origin = await getRequestOriginFromHeaders();
    redirect(
      `${origin}/sign-up?checkout_session=${encodeURIComponent(session_id)}`
    );
  }

  // Logged-out payer with an existing Clerk account (non-guest): magic link before dashboard.
  if (!user && status === "complete" && !guestCheckout && customerEmail?.trim()) {
    const emailNorm = customerEmail.trim().toLowerCase();
    const client = await clerkClient();
    const users = await client.users.getUserList({
      emailAddress: [emailNorm],
      limit: 1,
    });
    if (users.data.length > 0) {
      const signIn = await client.signInTokens.createSignInToken({
        userId: users.data[0].id,
        expiresInSeconds: 900,
      });
      if (signIn?.url) {
        redirect(signIn.url);
      }
    }
  }

  const userRepo = new CheckoutRepository(mongoClient);
  let prevCheckout = await userRepo.findCheckoutBySessionId(session_id);
  if (prevCheckout === null && status === "complete") {
    prevCheckout = await waitForCheckoutRecord(mongoClient, session_id);
  }
  if (prevCheckout !== null) {
    return (
      <div className=" bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        <DashboardHome
          session={sessionData}
          email={customerEmail}
          upgradeOffer={upgradeOffer}
        />
      </div>
    );
  }

  if (!user) {
    redirect("/");
  }

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
        plan: "plus",
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
        plan: "plus",
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
          attributionData={purchaseAttributionData}
        />

        <DashboardHome
          session={sessionData}
          email={customerEmail}
          upgradeOffer={upgradeOffer}
        />
      </div>
    );
  }
  redirect("/");
}

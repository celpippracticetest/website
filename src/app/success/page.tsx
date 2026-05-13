import { redirect } from "next/navigation";
import { stripe } from "../../lib/stripe";
import DashboardHome from "@/components/dashboard-app/dashboardHome";
import documentsClient, { getDb } from "@/lib/appDocumentsClient";
import { auth, appUserAdmin, currentUser } from "@/lib/auth/server-auth";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { Analytics } from "@customerio/cdp-analytics-node";
import SuccessPageTracking from "@/components/analytics/SuccessPageTracking";
import {
  resolveSuccessUpgradeOffer,
  toClientUpgradeOffer,
  type SuccessUpgradeOfferForClient,
} from "@/lib/successPageUpgrade";
import { waitForCheckoutRecord } from "@/lib/waitForCheckoutRecord";
import { findOrCreateWebUserByEmail } from "@/lib/guestCheckoutAuth";
import { getRequestOriginFromHeaders } from "@/lib/requestOrigin";

function inferSkillTypeFromPath(pathLike: unknown): "Speaking" | "Writing" | "Listening" | "Reading" | "General" {
  const value = typeof pathLike === "string" ? pathLike.toLowerCase() : "";
  if (value.includes("/speaking")) return "Speaking";
  if (value.includes("/writing")) return "Writing";
  if (value.includes("/listening")) return "Listening";
  if (value.includes("/reading")) return "Reading";
  return "General";
}

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
        webUserId: user.id,
        userEmail: user.primaryEmailAddress?.emailAddress ?? null,
      });
      if (resolved) upgradeOffer = toClientUpgradeOffer(resolved);
    } catch (err) {
      console.error("[success] upgrade offer:", err);
    }
  }
  const purchasePagePath = checkoutMetadata.purchase_page || null;
  const entryPagePath = checkoutMetadata.entry_page || checkoutMetadata.entryPage || null;
  const resolvedAttributionSource =
    checkoutMetadata.attribution_source || checkoutMetadata.utm_source || "(direct)";
  const resolvedAttributionMedium =
    checkoutMetadata.attribution_medium || checkoutMetadata.utm_medium || "(none)";
  const resolvedAttributionCampaign =
    checkoutMetadata.attribution_campaign || checkoutMetadata.utm_campaign || "(not set)";
  const resolvedPurchaseType =
    checkoutMetadata.purchase_type === "subscription_renewal"
      ? "subscription_renewal"
      : "first_purchase";
  const resolvedSkillType =
    checkoutMetadata.skill_type ||
    inferSkillTypeFromPath(purchasePagePath || entryPagePath);

  const purchaseAttributionData = {
    attribution_source: resolvedAttributionSource,
    attribution_medium: resolvedAttributionMedium,
    attribution_campaign: resolvedAttributionCampaign,
    attribution_gclid: checkoutMetadata.attribution_gclid || checkoutMetadata.gclid || null,
    attribution_gbraid: checkoutMetadata.attribution_gbraid || checkoutMetadata.gbraid || null,
    attribution_wbraid: checkoutMetadata.attribution_wbraid || checkoutMetadata.wbraid || null,
    attribution_fbclid: checkoutMetadata.attribution_fbclid || checkoutMetadata.fbclid || null,
    attribution_msclkid: checkoutMetadata.attribution_msclkid || checkoutMetadata.msclkid || null,
    attribution_ttclid: checkoutMetadata.attribution_ttclid || checkoutMetadata.ttclid || null,
    utm_source: checkoutMetadata.utm_source || resolvedAttributionSource,
    utm_medium: checkoutMetadata.utm_medium || resolvedAttributionMedium,
    utm_campaign: checkoutMetadata.utm_campaign || resolvedAttributionCampaign,
    utm_content: checkoutMetadata.utm_content || null,
    utm_term: checkoutMetadata.utm_term || null,
    gbraid: checkoutMetadata.gbraid || null,
    wbraid: checkoutMetadata.wbraid || null,
    fbclid: checkoutMetadata.fbclid || null,
    msclkid: checkoutMetadata.msclkid || null,
    ttclid: checkoutMetadata.ttclid || null,
    entry_page: entryPagePath,
    purchase_page: purchasePagePath,
    purchase_type: resolvedPurchaseType,
    skill_type: resolvedSkillType,
  };

  if (status === "open") redirect("/");

  const guestCheckout =
    String(checkoutMetadata.guest_checkout ?? "").toLowerCase() === "true";

  // Guest checkout: ensure web user exists (webhook may still be running), then
  // send payer to sign-up with a locked Stripe email + password (or Google for Gmail).
  if (!user && status === "complete" && guestCheckout && customerEmail?.trim()) {
    const emailNorm = customerEmail.trim().toLowerCase();
    try {
      await findOrCreateWebUserByEmail(emailNorm);
    } catch (e) {
      console.error("[success] guest findOrCreateUser", e);
    }
    const origin = await getRequestOriginFromHeaders();
    redirect(
      `${origin}/sign-up?checkout_session=${encodeURIComponent(session_id)}`
    );
  }

  // Logged-out payer with an existing account (non-guest): magic link before dashboard.
  if (!user && status === "complete" && !guestCheckout && customerEmail?.trim()) {
    const emailNorm = customerEmail.trim().toLowerCase();
    const client = await appUserAdmin();
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

  const userRepo = new CheckoutRepository(documentsClient);
  let prevCheckout = await userRepo.findCheckoutBySessionId(session_id);
  if (prevCheckout === null && status === "complete") {
    prevCheckout = await waitForCheckoutRecord(documentsClient, session_id);
  }
  if (prevCheckout !== null) {
    const transactionId = (session?.invoice as string) || session_id;
    const normalizedCurrency = currency?.toUpperCase() || "CAD";
    const normalizedEmail = customerEmail?.trim().toLowerCase();

    return (
      <div className=" bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
        {status === "complete" ? (
          <SuccessPageTracking
            transactionId={transactionId}
            value={(amountTotal ?? 0) / 100}
            currency={normalizedCurrency}
            items={lineItems || []}
            email={normalizedEmail}
            attributionData={purchaseAttributionData}
          />
        ) : null}
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
    const client = await appUserAdmin();
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

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { stripe } from "../../lib/stripe";
import DashboardHome from "@/components/dashboard-app/dashboardHome";
import documentsClient from "@/lib/appDocumentsClient";
import Script from "next/script";
import { getHybridCurrentUser } from "@/lib/auth/web-session-server";
import { appUserAdmin } from "@/lib/auth/server-auth";
import { CheckoutRepository } from "@/repositories/checkout.repo";
import { Analytics } from "@customerio/cdp-analytics-node";

export default async function Success({ searchParams }: any) {
  const params = searchParams ? await searchParams : {};
  const sessionIdRaw = params?.session_id;
  const session_id =
    typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : undefined;

  // Cross-domain measurement can append/mangle query params (for example `_gl`).
  // Never throw a 500 on a missing or malformed session id — send the visitor home.
  if (!session_id || !session_id.startsWith("cs_")) {
    redirect("/");
  }

  // Retrieve the session and expand payment_intent + line_items into objects.
  let session: Stripe.Checkout.Session;
  try {
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

  const status = session.status;
  if (status === "open") {
    redirect("/");
  }

  const sessionData = JSON.parse(JSON.stringify(session));
  const amountTotal = session?.amount_total;
  const currency = session?.currency;
  const customerEmail = session?.customer_details?.email;
  const lineItems = session?.line_items?.data;

  const hybridUser = await getHybridCurrentUser().catch((error) => {
    console.error("[success] getHybridCurrentUser failed", {
      session_id,
      error,
    });
    return null;
  });
  const user = hybridUser?.user ?? null;

  const userRepo = new CheckoutRepository(documentsClient);
  let prevCheckout = null;
  try {
    prevCheckout = await userRepo.findCheckoutBySessionId(session_id);
  } catch (error) {
    console.error("[success] findCheckoutBySessionId failed", {
      session_id,
      error,
    });
  }
  const alreadyRecorded = prevCheckout !== null;

  // The Stripe webhook (`checkout.session.completed`) is the source of truth for the
  // plan upgrade and the persisted checkout record. Everything below is best-effort:
  // a failure here must not crash the confirmation page for a customer who just paid.
  if (status === "complete" && !alreadyRecorded && user) {
    try {
      await userRepo.createCheckout({
        userId: user.id,
        checkoutId: session_id,
        createdAt: new Date(),
        status: status?.toString(),
        lineItems,
      });
    } catch (error) {
      console.error("[success] createCheckout failed", { session_id, error });
    }

    try {
      const publicMetadata = user.publicMetadata ?? {};
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
    } catch (error) {
      console.error("[success] plan upgrade failed", {
        userId: user.id,
        error,
      });
    }

    try {
      const email = user.emailAddresses?.[0]?.emailAddress;
      if (email) {
        const cioanalytics = new Analytics({
          writeKey: "9c3070e20a6782f0f20d", // TODO fix it to read form ENV
          host: "https://cdp.customer.io",
        });
        cioanalytics.identify({
          userId: user.id,
          traits: {
            email,
            name:
              [user.firstName, user.lastName].filter(Boolean).join(" ") ||
              undefined,
            plan: "plus",
          },
        });
      }
    } catch (error) {
      console.error("[success] customer.io identify failed", {
        userId: user.id,
        error,
      });
    }
  }

  // Only fire the conversion pixel on the first completed render of a session so a
  // refresh (or the webhook having recorded it already) does not double-count.
  const showConversion = status === "complete" && !alreadyRecorded;

  return (
    <div className="bg-[#F4F7FF] min-h-screen flex w-full lg:pt-[108px] pt-[70px]">
      {showConversion ? (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=AW-16871603801"
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-16871603801');
    `}
          </Script>
          <Script id="enhanced-conversions" strategy="afterInteractive">
            {`
      gtag('set', 'user_data', {
        email: '${customerEmail?.trim().toLowerCase() ?? ""}'
      });
  `}
          </Script>
          <Script id="conversion" strategy="afterInteractive">
            {`
      gtag('event', 'conversion', {
        send_to: 'AW-17024504219/OTSDCOvziL4aEJuj9bU_',
        transaction_id: '${session?.invoice ?? ""}',
        value: ${(amountTotal ?? 0) / 100},
        currency: '${currency?.toUpperCase() ?? ""}',
        
      });
  `}
          </Script>
        </>
      ) : null}

      <DashboardHome session={sessionData} email={customerEmail} />
    </div>
  );
}

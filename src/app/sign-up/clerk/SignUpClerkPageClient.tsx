"use client";

import { useUser } from "@clerk/nextjs";
import { CustomSignUpForm } from "@/components/auth/CustomSignUpForm";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CLERK_SUPPRESS_LOGIN_COMPLETED_ONCE_KEY } from "@/components/analytics/ClerkAuthGtmTracker";
import { trackAuth } from "@/lib/gtm";
import { useEcommerceTracking } from "@/hooks/useTracking";

type GuestCheckoutItem = {
  id?: string;
  description?: string;
  amount_total?: number;
  quantity?: number;
  price?: {
    product?: string;
  };
};

export default function SignUpPageClient() {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { purchase } = useEcommerceTracking();
  const [referralCode, setReferralCode] = useState<string>("");
  const [inviterName, setInviterName] = useState<string>("");
  const [guestCheckout, setGuestCheckout] = useState<{
    sessionId: string;
    email: string;
    amountTotalCents: number;
    currency: string;
    items: GuestCheckoutItem[];
  } | null>(null);
  const [guestCheckoutError, setGuestCheckoutError] = useState<string | null>(null);

  const readAttributionFromStorage = () => ({
    gclid: localStorage.getItem("pending_gclid"),
    gbraid: localStorage.getItem("pending_gbraid"),
    wbraid: localStorage.getItem("pending_wbraid"),
    fbclid: localStorage.getItem("pending_fbclid"),
    msclkid: localStorage.getItem("pending_msclkid"),
    ttclid: localStorage.getItem("pending_ttclid"),
    utm_source: localStorage.getItem("pending_utm_source"),
    utm_medium: localStorage.getItem("pending_utm_medium"),
    utm_campaign: localStorage.getItem("pending_utm_campaign"),
    utm_content: localStorage.getItem("pending_utm_content"),
    utm_term: localStorage.getItem("pending_utm_term"),
    entry_page: localStorage.getItem("pending_entry_page"),
    referrer: localStorage.getItem("pending_referrer"),
    attribution_session_id: localStorage.getItem("pending_attribution_session_id"),
  });

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(";").shift();
      return null;
    };

    const ref = getCookie("pendingReferralCode") || searchParams.get("ref");
    const inviter =
      getCookie("pendingInviterName") || searchParams.get("inviter");

    const gclid = searchParams.get("gclid");
    const gbraid = searchParams.get("gbraid");
    const wbraid = searchParams.get("wbraid");
    const fbclid = searchParams.get("fbclid");
    const msclkid = searchParams.get("msclkid");
    const ttclid = searchParams.get("ttclid");
    const utmSource = searchParams.get("utm_source");
    const utmMedium = searchParams.get("utm_medium");
    const utmCampaign = searchParams.get("utm_campaign");
    const utmContent = searchParams.get("utm_content");
    const utmTerm = searchParams.get("utm_term");
    const googleAdsCampaignId =
      searchParams.get("gad_campaignid") || searchParams.get("google_ads_campaign_id");

    if (gclid) localStorage.setItem("pending_gclid", gclid);
    if (gbraid) localStorage.setItem("pending_gbraid", gbraid);
    if (wbraid) localStorage.setItem("pending_wbraid", wbraid);
    if (fbclid) localStorage.setItem("pending_fbclid", fbclid);
    if (msclkid) localStorage.setItem("pending_msclkid", msclkid);
    if (ttclid) localStorage.setItem("pending_ttclid", ttclid);
    if (utmSource) localStorage.setItem("pending_utm_source", utmSource);
    if (utmMedium) localStorage.setItem("pending_utm_medium", utmMedium);
    if (utmCampaign) localStorage.setItem("pending_utm_campaign", utmCampaign);
    if (utmContent) localStorage.setItem("pending_utm_content", utmContent);
    if (utmTerm) localStorage.setItem("pending_utm_term", utmTerm);
    if (googleAdsCampaignId) {
      localStorage.setItem("pending_google_ads_campaign_id", googleAdsCampaignId);
    }

    if (ref) {
      setReferralCode(ref.trim());
      localStorage.setItem("pendingReferralCode", ref.trim());
    }

    if (inviter) {
      setInviterName(decodeURIComponent(inviter));
      localStorage.setItem("pendingInviterName", decodeURIComponent(inviter));
    }
  }, [searchParams]);

  useEffect(() => {
    const raw = searchParams.get("checkout_session")?.trim();
    if (!raw?.startsWith("cs_")) {
      setGuestCheckout(null);
      setGuestCheckoutError(null);
      return;
    }
    let cancelled = false;
    setGuestCheckoutError(null);
    setGuestCheckout(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/checkout/guest-signup-context?session_id=${encodeURIComponent(raw)}`
        );
        const data = (await res.json()) as {
          error?: string;
          email?: string;
          sessionId?: string;
          amountTotalCents?: number;
          currency?: string;
          items?: GuestCheckoutItem[];
        };
        if (cancelled) return;
        if (!res.ok || !data.email || !data.sessionId) {
          setGuestCheckoutError(data.error || "Could not verify your purchase.");
          return;
        }
        setGuestCheckout({
          sessionId: data.sessionId,
          email: data.email,
          amountTotalCents: Math.max(0, Number(data.amountTotalCents || 0)),
          currency: String(data.currency || "CAD").toUpperCase(),
          items: Array.isArray(data.items) ? data.items : [],
        });
      } catch {
        if (!cancelled) {
          setGuestCheckoutError("Could not verify your purchase.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const dedupeKey = `signup_conversion_tracked_${user.id}`;
    if (localStorage.getItem(dedupeKey) === "1") return;

    const signupAttribution = readAttributionFromStorage();

    trackAuth.signUpCompleted(user.id, "email", {
      email: user.primaryEmailAddress?.emailAddress?.trim().toLowerCase(),
      address: {
        first_name: user.firstName || "",
        last_name: user.lastName || "",
      },
    }, signupAttribution);

    localStorage.setItem(dedupeKey, "1");
    try {
      sessionStorage.setItem(CLERK_SUPPRESS_LOGIN_COMPLETED_ONCE_KEY, user.id);
    } catch {
      // ignore
    }
  }, [isSignedIn, user]);

  const tryApplyPartnerPendingCode = async (code: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/partners/apply-pending-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { kind?: string };
      return data.kind === "partner";
    } catch {
      return false;
    }
  };

  const applyReferralDiscount = async (referralCode: string) => {
    try {
      const processResponse = await fetch("/api/referrals/process-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode,
        }),
      });

      if (!processResponse.ok) {
        const errorData = await processResponse.json().catch(() => ({}));
        console.warn(
          "Referral process-signup did not complete (discount may still apply):",
          errorData
        );
      }

      // Always attempt apply-discount: process-signup can fail (e.g. invitation edge cases)
      // while the invitee should still receive the Stripe promotion for checkout.
      const discountResponse = await fetch("/api/referrals/apply-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referralCode,
          userId: user?.id,
          userEmail: user?.primaryEmailAddress?.emailAddress,
        }),
      });

      if (!discountResponse.ok) {
        const errorData = await discountResponse.json().catch(() => ({}));
        console.error("❌ Failed to apply referral discount:", errorData);
      }
    } catch (error) {
      console.error("❌ Failed to process referral:", error);
    }
  };

  const saveAttribution = async () => {
    try {
      const gclid = localStorage.getItem("pending_gclid");
      const gbraid = localStorage.getItem("pending_gbraid");
      const wbraid = localStorage.getItem("pending_wbraid");
      const fbclid = localStorage.getItem("pending_fbclid");
      const msclkid = localStorage.getItem("pending_msclkid");
      const ttclid = localStorage.getItem("pending_ttclid");
      const utm_source = localStorage.getItem("pending_utm_source");
      const utm_medium = localStorage.getItem("pending_utm_medium");
      const utm_campaign = localStorage.getItem("pending_utm_campaign");
      const utm_content = localStorage.getItem("pending_utm_content");
      const utm_term = localStorage.getItem("pending_utm_term");

      if (
        gclid ||
        gbraid ||
        wbraid ||
        fbclid ||
        msclkid ||
        ttclid ||
        utm_source ||
        utm_medium ||
        utm_campaign
      ) {
        const response = await fetch("/api/users/update-attribution", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gclid,
            gbraid,
            wbraid,
            fbclid,
            msclkid,
            ttclid,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            utm_term,
          }),
        });

        if (response.ok) {
          localStorage.removeItem("pending_gclid");
          localStorage.removeItem("pending_gbraid");
          localStorage.removeItem("pending_wbraid");
          localStorage.removeItem("pending_fbclid");
          localStorage.removeItem("pending_msclkid");
          localStorage.removeItem("pending_ttclid");
          localStorage.removeItem("pending_utm_source");
          localStorage.removeItem("pending_utm_medium");
          localStorage.removeItem("pending_utm_campaign");
          localStorage.removeItem("pending_utm_content");
          localStorage.removeItem("pending_utm_term");
        }
      }
    } catch (error) {
      console.error("Failed to save attribution:", error);
    }
  };

  useEffect(() => {
    if (!isSignedIn || !user) return;

    void (async () => {
      if (guestCheckout?.sessionId) {
        const dedupeKey = `guest_checkout_purchase_tracked_${guestCheckout.sessionId}`;
        if (sessionStorage.getItem(dedupeKey) !== "1") {
          const formattedItems =
            guestCheckout.items.length > 0
              ? guestCheckout.items.map((item) => ({
                  item_id: item.price?.product || item.id || "unknown",
                  item_name: item.description || "CELPIP Plan",
                  price: Math.max(0, Number(item.amount_total || 0)) / 100,
                  quantity: Math.max(1, Number(item.quantity || 1)),
                  item_brand: "CELPIP Practice Test",
                  item_category: "Subscription",
                  item_category2: "Digital Service",
                }))
              : [
                  {
                    item_id: "guest-checkout",
                    item_name: "CELPIP Plan",
                    price: guestCheckout.amountTotalCents / 100,
                    quantity: 1,
                    item_brand: "CELPIP Practice Test",
                    item_category: "Subscription",
                    item_category2: "Digital Service",
                  },
                ];

          purchase(
            guestCheckout.sessionId,
            formattedItems,
            guestCheckout.currency,
            guestCheckout.amountTotalCents / 100,
            undefined,
            user.primaryEmailAddress?.emailAddress
              ? { email: user.primaryEmailAddress.emailAddress.trim().toLowerCase() }
              : undefined,
            readAttributionFromStorage()
          );
          sessionStorage.setItem(dedupeKey, "1");
        }
      }

      await saveAttribution();

      const pendingReferralCode = localStorage.getItem("pendingReferralCode");

      if (pendingReferralCode) {
        const isPartner = await tryApplyPartnerPendingCode(pendingReferralCode);
        if (!isPartner) {
          await applyReferralDiscount(pendingReferralCode);
        }
        localStorage.removeItem("pendingReferralCode");
        localStorage.removeItem("pendingInviterName");
      }
      if (guestCheckout?.sessionId) {
        router.push("/exam-overview");
      } else {
        router.push("/practice-overview");
      }
    })();
  }, [guestCheckout, isSignedIn, purchase, user, router]);

  const rawCheckoutSession = searchParams.get("checkout_session")?.trim();
  const verifyingGuestCheckout =
    rawCheckoutSession?.startsWith("cs_") && !guestCheckout && !guestCheckoutError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Sign Up</h1>
        {referralCode ? (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 text-sm text-blue-800">
              <strong>Referral Code:</strong> {referralCode}
            </div>
            {inviterName ? (
              <div className="text-sm text-blue-700">
                Referred by: {inviterName}
              </div>
            ) : null}
            {/^REF-[A-Z0-9]{6}$/i.test(referralCode.trim()) ? (
              <div className="mt-2 text-xs text-blue-600">
                You&apos;ll automatically get 20% off your first purchase!
              </div>
            ) : (
              <div className="mt-2 text-xs text-blue-600">
                Partner link: after you sign up, a one-time discount will be saved on
                your account for your first subscription checkout (see program terms).
              </div>
            )}
          </div>
        ) : null}

        {guestCheckoutError ? (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {guestCheckoutError}
          </div>
        ) : null}

        {verifyingGuestCheckout ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm">
            Verifying your purchase…
          </div>
        ) : (
          <CustomSignUpForm
            checkoutSessionId={guestCheckout?.sessionId ?? null}
            lockedCheckoutEmail={guestCheckout?.email ?? null}
          />
        )}
      </div>
    </div>
  );
}

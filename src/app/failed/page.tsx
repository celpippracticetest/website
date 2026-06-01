"use client";

import ArrowBack from "@mui/icons-material/ArrowBack";
import CheckRounded from "@mui/icons-material/CheckRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import PauseCircleOutlineRounded from "@mui/icons-material/PauseCircleOutlineRounded";
import SupportEmailLink from "@/components/contact/SupportEmailLink";
import LoginModal from "@/components/modal/LoginModal";
import SvgFailed from "@/components/icons/Failed";
import CheckoutAttributionFields from "@/components/analytics/CheckoutAttributionFields";
import {
  safeInternalReturnPath,
  safeStripePriceId,
  safeStripeProductId,
} from "@/lib/checkoutCancelUrl";
import { useHybridWebUser } from "@/hooks/useHybridWebUser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { StripeCheckoutDiscountBadge } from "@/components/checkout/StripeCheckoutDiscountBadge";
import { getStripeCheckoutAutoDiscountLabel } from "@/lib/stripeCheckoutDiscountLabel";

function FailedPageContent() {
  const { isLoaded, isSignedIn, user } = useHybridWebUser();
  const [hasMounted, setHasMounted] = useState(false);
  const noUser = isLoaded ? !isSignedIn : false;
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const checkoutCanceled =
    searchParams.get("canceled") === "true" ||
    searchParams.get("canceled") === "1";

  const returnTo = safeInternalReturnPath(searchParams.get("returnTo"));

  const continueHref =
    returnTo ??
    (!isLoaded || !hasMounted
      ? "/landing/express-entry"
      : isSignedIn
        ? "/pricing"
        : "/landing/express-entry");

  const retryPrice = safeStripePriceId(searchParams.get("price"));
  const retryProduct = safeStripeProductId(searchParams.get("product"));
  const canStripeRetry = retryPrice !== null || retryProduct !== null;
  const checkoutSessionBase =
    !hasMounted || !isLoaded
      ? null
      : isSignedIn
        ? "/api/checkout_session"
        : "/api/checkout_session/guest";
  const checkoutQuery = retryPrice
    ? `price=${encodeURIComponent(retryPrice)}`
    : retryProduct
      ? `product=${encodeURIComponent(retryProduct)}`
      : "";
  const checkoutAction =
    canStripeRetry && checkoutSessionBase
      ? `${checkoutSessionBase}?${checkoutQuery}`
      : null;

  const stripeCheckoutDiscountLabel = useMemo(
    () =>
      isSignedIn && checkoutAction
        ? getStripeCheckoutAutoDiscountLabel({ userPublicMetadata: user?.publicMetadata })
        : null,
    [checkoutAction, isSignedIn, user?.publicMetadata]
  );

  const primaryCtaClassName =
    "inline-flex flex-1 min-h-[44px] items-center justify-center gap-1 rounded-full bg-[#4A7DFF] px-5 text-[15px] font-medium text-white shadow-sm hover:bg-[#3d6ce8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A7DFF] transition-colors disabled:opacity-60 disabled:pointer-events-none";

  const backLabel = noUser ? "Back to home" : "Back to dashboard";
  const backAction = () => (noUser ? router.push("/") : router.push("/practice-overview"));

  return (
    <main className="w-full min-h-screen bg-[#F4F7FF] pt-[96px] pb-16 px-4 flex flex-col items-center">
      {noUser ? (
        showLoginModal && <LoginModal setShowLoginModal={setShowLoginModal} />
      ) : null}

      <div
        className="w-full max-w-lg rounded-2xl bg-white px-8 py-10 shadow-sm border border-[#E4E9F4]"
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col items-center text-center gap-5">
          {checkoutCanceled ? (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EFFF]" aria-hidden>
              <PauseCircleOutlineRounded
                sx={{ fontSize: 40, color: "#4A7DFF" }}
              />
            </span>
          ) : (
            <SvgFailed className="shrink-0" />
          )}

          <div className="space-y-2">
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-[#212E42] leading-tight">
              {checkoutCanceled
                ? "Checkout paused — you’re all set"
                : "We couldn’t complete your payment"}
            </h1>
            <p className="text-[16px] sm:text-[17px] font-normal text-[#5C6778] leading-relaxed">
              {checkoutCanceled ? (
                <>
                  You closed the payment window before confirming, so{" "}
                  <span className="font-medium text-[#212E42]">
                    you have not been charged
                  </span>
                  . Your progress is safe — continue whenever you’re ready.
                </>
              ) : (
                <>
                  Something went wrong while processing your card. Try again,
                  or use a different payment method. If it keeps happening,
                  we’re happy to help.
                </>
              )}
            </p>
          </div>

          <ul className="w-full text-left rounded-xl bg-[#F4F7FF] px-4 py-3 space-y-2.5">
            {(checkoutCanceled
              ? [
                  "Your account and plan stay exactly as they are today",
                  "Same plans and pricing are waiting when you return",
                  "Need a minute? You can always come back later",
                ]
              : [
                  "Check that your card details, expiry, and ZIP/postal code match your bank",
                  "Try another card or payment method if one fails",
                  "Still stuck? Email us — we’ll sort it out with you",
                ]
            ).map((line) => (
              <li key={line} className="flex gap-2.5 text-[14px] text-[#4A5568]">
                <CheckRounded
                  className={`shrink-0 mt-0.5 text-[18px] ${checkoutCanceled ? "text-[#4A7DFF]" : "text-[#EE4266]"}`}
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="w-full flex flex-col sm:flex-row gap-3 pt-2">
            {canStripeRetry && (!hasMounted || !isLoaded) ? (
              <button type="button" disabled className={primaryCtaClassName}>
                {checkoutCanceled ? "Continue to plans" : "Try again"}
                <ChevronRightRounded className="text-[20px]" aria-hidden />
              </button>
            ) : checkoutAction ? (
              <form
                action={checkoutAction}
                method="POST"
                className="flex flex-1 min-w-0 flex-col gap-3 sm:flex-row"
              >
                <div className="hidden" aria-hidden>
                  <Suspense fallback={null}>
                    <CheckoutAttributionFields />
                  </Suspense>
                </div>
                <button type="submit" className={`${primaryCtaClassName} relative`}>
                  <StripeCheckoutDiscountBadge label={stripeCheckoutDiscountLabel} />
                  {checkoutCanceled ? "Continue to plans" : "Try again"}
                  <ChevronRightRounded className="text-[20px]" aria-hidden />
                </button>
              </form>
            ) : (
              <Link href={continueHref} className={primaryCtaClassName}>
                {checkoutCanceled ? "Continue to plans" : "Try again"}
                <ChevronRightRounded className="text-[20px]" aria-hidden />
              </Link>
            )}

            <button
              type="button"
              onClick={backAction}
              className="inline-flex flex-1 min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#C5CED9] bg-white px-5 text-[15px] font-medium text-[#212E42] hover:bg-[#F4F7FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4A7DFF] transition-colors"
            >
              <ArrowBack className="text-[18px]" aria-hidden />
              {backLabel}
            </button>
          </div>

          {checkoutCanceled && noUser ? (
            <p className="text-[13px] text-[#76808F] pt-1">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="font-medium text-[#4A7DFF] underline-offset-2 hover:underline"
              >
                Sign in
              </button>
            </p>
          ) : !checkoutCanceled ? (
            <p className="text-[13px] text-[#76808F] pt-1">
              <SupportEmailLink
                subject="Help with payment"
                className="font-medium text-[#4A7DFF] underline-offset-2 hover:underline"
              >
                Contact support
              </SupportEmailLink>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function FailedFallback() {
  return (
    <main className="w-full min-h-screen bg-[#F4F7FF] pt-[96px] pb-16 px-4 flex flex-col items-center">
      <div className="w-full max-w-lg rounded-2xl bg-white px-8 py-10 shadow-sm border border-[#E4E9F4] min-h-[280px]" />
    </main>
  );
}

export default function FailedPage() {
  return (
    <Suspense fallback={<FailedFallback />}>
      <FailedPageContent />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { isNonIndexableDeployment } from "@/lib/searchIndexing";
import { getDashboardLayoutAuthContext } from "@/lib/auth/web-session-server";
import { redirect } from "next/navigation";
import RefundRequestPortal from "@/components/dashboard-new/RefundRequestPortal";
import documentsClient from "@/lib/appDocumentsClient";
import { Box } from "@/components/ui/Box";
export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";

  return {
    title: "Refund Request Form | CELPIP Practice Test",
    description:
      "Submit and track your CELPIP Practice Test refund request directly from your premium dashboard account.",
    keywords: [
      "CELPIP refund request",
      "CELPIP subscription refund form",
      "refund status tracking",
      "premium account refund request",
    ],
    alternates: {
      canonical: "https://celpippracticetest.com/refund-request",
    },
    openGraph: {
      title: "Refund Request Form | CELPIP Practice Test",
      description:
        "Premium users can submit and track refund requests directly inside CELPIP Practice Test.",
      type: "website",
      url: "https://celpippracticetest.com/refund-request",
    },
    robots: {
      index: false,
      follow: !isNonIndexableDeployment(appBaseUrl),
    },
  };
}

export default async function RefundRequestPage() {
  const ctx = await getDashboardLayoutAuthContext();
  const REFUND_WINDOW_HOURS = 48;

  if (!ctx?.userId) {
    redirect("/sign-in");
  }

  const { userId, user } = ctx;
  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const userFullName = [firstName, lastName].filter(Boolean).join(" ");
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  /** `users` collection uses legacy BSON keys; `userId` here is the app-stable id (Supabase UUID and/or migrated Clerk id). */
  const userLookupFilter = {
    $or: [
      { clerkUserId: userId },
      { supabaseUserId: userId },
      { sub: userId },
      ...(userEmail ? [{ email: userEmail }] : []),
    ],
  };

  const rawUserEntity = await documentsClient
    .db()
    .collection("users")
    .findOne<{
      purchaseDate?: unknown;
      publicMetadata?: { purchaseDate?: unknown };
    }>(userLookupFilter, {
      projection: {
        purchaseDate: 1,
        "publicMetadata.purchaseDate": 1,
      },
    });
  const rawUserEntityProd = await documentsClient
    .db("prod")
    .collection("users")
    .findOne<{
      purchaseDate?: unknown;
      publicMetadata?: { purchaseDate?: unknown };
    }>(userLookupFilter, {
      projection: {
        purchaseDate: 1,
        "publicMetadata.purchaseDate": 1,
      },
    });
  const userPublicPurchaseDate = (user?.publicMetadata as { purchaseDate?: unknown } | null)?.purchaseDate;
  const rawDbRootPurchaseDate = rawUserEntity?.purchaseDate;
  const rawDbPublicPurchaseDate = rawUserEntity?.publicMetadata?.purchaseDate;
  const rawDbRootPurchaseDateProd = rawUserEntityProd?.purchaseDate;
  const rawDbPublicPurchaseDateProd = rawUserEntityProd?.publicMetadata?.purchaseDate;

  const rawPurchaseDate =
    userPublicPurchaseDate ??
    rawDbPublicPurchaseDateProd ??
    rawDbRootPurchaseDateProd ??
    rawDbPublicPurchaseDate ??
    rawDbRootPurchaseDate;
  const prevCheckoutDefault = await documentsClient
    .db()
    .collection("checkouts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  const prevCheckoutProd = await documentsClient
    .db("prod")
    .collection("checkouts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  const prevCheckout = prevCheckoutDefault || prevCheckoutProd;

  const purchaseAt = (() => {
    let fromMetadata: number | null = null;
    if (rawPurchaseDate instanceof Date) {
      const ts = rawPurchaseDate.getTime();
      if (Number.isFinite(ts)) fromMetadata = ts;
    } else if (typeof rawPurchaseDate === "number") {
      if (Number.isFinite(rawPurchaseDate)) fromMetadata = rawPurchaseDate;
    } else if (typeof rawPurchaseDate === "string" && rawPurchaseDate.trim() !== "") {
      const ts = new Date(rawPurchaseDate).getTime();
      if (Number.isFinite(ts)) fromMetadata = ts;
    }

    if (fromMetadata !== null) {
      return fromMetadata;
    }

    let fallbackTs: number | null = null;
    const createdAt = prevCheckout?.createdAt;
    if (createdAt instanceof Date) {
      const ts = createdAt.getTime();
      if (Number.isFinite(ts)) fallbackTs = ts;
    } else if (typeof createdAt === "number") {
      if (Number.isFinite(createdAt)) fallbackTs = createdAt;
    } else if (typeof createdAt === "string" && createdAt.trim() !== "") {
      const ts = new Date(createdAt).getTime();
      if (Number.isFinite(ts)) fallbackTs = ts;
    }
    return fallbackTs;
  })();
  const hoursSincePurchase = purchaseAt
    ? Number.isFinite(purchaseAt)
      ? (Date.now() - purchaseAt) / (1000 * 60 * 60)
      : null
    : null;
  const isOutside48HourWindow =
    typeof hoursSincePurchase === "number" && hoursSincePurchase > REFUND_WINDOW_HOURS;

  return (
    <Box className="w-full">
      <Box className="mx-auto w-full max-w-[980px] px-[16px] pt-[16px]">
        {isOutside48HourWindow ? (
          <Box
            role="alert"
            aria-labelledby="refund-window-expired-title"
            aria-describedby="refund-window-expired-desc"
            className="mb-[16px] flex gap-[14px] rounded-[16px] border border-[#F5C2C2] border-l-[4px] border-l-[#DC2626] bg-[#FEF2F2] p-[16px] shadow-[0_4px_20px_rgba(220,38,38,0.12)] screen744:mb-[20px]! screen744:gap-[16px] screen744:p-[20px]!"
          >
            <Box
              className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] bg-[#FEE2E2] screen744:h-[48px] screen744:w-[48px]!"
              aria-hidden
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-[#B91C1C]"
              >
                <path
                  d="M12 2L2 20h20L12 2z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9v5M12 17h.01"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </Box>
            <Box className="min-w-0 flex-1 pt-[2px]">
              <p
                id="refund-window-expired-title"
                className="text-[15px] font-semibold leading-[22px] text-[#7F1D1D] screen744:text-[16px]! screen744:leading-[24px]!"
              >
                The 48-hour automatic refund window has closed
              </p>
              <p
                id="refund-window-expired-desc"
                className="mt-[8px] text-[14px] leading-[22px] text-[#991B1B] screen744:leading-[23px]!"
              >
                You can still submit the form below if something went wrong. Our team may take
                up to <span className="font-semibold">10 business days</span> to review requests
                outside the standard window.
              </p>
            </Box>
          </Box>
        ) : null}
      </Box>
      <RefundRequestPortal initialFullName={userFullName} initialEmail={userEmail || ""} />
    </Box>
  );
}

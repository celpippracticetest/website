import type { Metadata } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import RefundRequestPortal from "@/components/dashboard-new/RefundRequestPortal";
import mongoClient from "@/lib/mongodb";
import { Box } from "@/components/ui/Box";
import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

export async function generateMetadata(): Promise<Metadata> {
  const appBaseUrl = process.env.APP_BASE_URL || "https://celpippracticetest.com";
  const isPreview = appBaseUrl.includes("vercel.app");

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
      follow: !isPreview,
    },
  };
}

export default async function RefundRequestPage() {
  const { userId, sessionClaims } = await auth();
  const plan = sessionClaims?.metadata?.plan as string | undefined;
  const REFUND_WINDOW_HOURS = 48;

  if (!userId) {
    redirect("/");
  }

  if (!hasPaidPracticeAccess(plan, sessionClaims?.metadata?.purchaseDate)) {
    redirect("/plans");
  }

  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const userFullName = clerkUser.fullName || "";
  const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || null;

  const userLookupFilter = {
    $or: [
      { clerkUserId: userId },
      { sub: userId },
      ...(userEmail ? [{ email: userEmail }] : []),
    ],
  };

  const rawUserEntity = await mongoClient
    .db()
    .collection("users")
    .findOne<{
      clerkUserId?: string;
      purchaseDate?: unknown;
      publicMetadata?: { purchaseDate?: unknown };
    }>(
      userLookupFilter,
      {
        projection: {
          clerkUserId: 1,
          purchaseDate: 1,
          "publicMetadata.purchaseDate": 1,
        },
      }
    );
  const rawUserEntityProd = await mongoClient
    .db("prod")
    .collection("users")
    .findOne<{
      clerkUserId?: string;
      purchaseDate?: unknown;
      publicMetadata?: { purchaseDate?: unknown };
    }>(userLookupFilter, {
      projection: {
        clerkUserId: 1,
        purchaseDate: 1,
        "publicMetadata.purchaseDate": 1,
      },
    });
  const sessionPurchaseDate = (sessionClaims?.metadata as { purchaseDate?: unknown } | undefined)?.purchaseDate;
  const clerkPublicPurchaseDate = (clerkUser.publicMetadata as { purchaseDate?: unknown } | null)?.purchaseDate;
  const clerkPrivatePurchaseDate = (clerkUser.privateMetadata as { purchaseDate?: unknown } | null)?.purchaseDate;
  const rawDbRootPurchaseDate = rawUserEntity?.purchaseDate;
  const rawDbPublicPurchaseDate = rawUserEntity?.publicMetadata?.purchaseDate;
  const rawDbRootPurchaseDateProd = rawUserEntityProd?.purchaseDate;
  const rawDbPublicPurchaseDateProd = rawUserEntityProd?.publicMetadata?.purchaseDate;

  const rawPurchaseDate =
    sessionPurchaseDate ??
    clerkPublicPurchaseDate ??
    clerkPrivatePurchaseDate ??
    rawDbPublicPurchaseDateProd ??
    rawDbRootPurchaseDateProd ??
    rawDbPublicPurchaseDate ??
    rawDbRootPurchaseDate;
  const prevCheckoutDefault = await mongoClient
    .db()
    .collection("checkouts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  const prevCheckoutProd = await mongoClient
    .db("prod")
    .collection("checkouts")
    .find({ userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .next();
  const prevCheckout = prevCheckoutDefault || prevCheckoutProd;

  const purchaseAt = (() => {
    if (rawPurchaseDate instanceof Date) {
      const ts = rawPurchaseDate.getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    if (typeof rawPurchaseDate === "number") {
      return Number.isFinite(rawPurchaseDate) ? rawPurchaseDate : null;
    }

    if (typeof rawPurchaseDate === "string") {
      const ts = new Date(rawPurchaseDate).getTime();
      return Number.isFinite(ts) ? ts : null;
    }

    const fallbackTs = prevCheckout?.createdAt
      ? new Date(prevCheckout.createdAt).getTime()
      : null;
    return typeof fallbackTs === "number" && Number.isFinite(fallbackTs)
      ? fallbackTs
      : null;
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
          <Box className="rounded-[12px] border border-[#FFD6D6] bg-[#FFF5F5] p-[12px]">
            <p className="text-[14px] leading-[22px] text-[#9E2D2D]">
              The refund time has passed. If you still think there is a problem
              and need to send a request, it takes up to 10 days to investigate.
            </p>
          </Box>
        ) : null}
      </Box>
      <RefundRequestPortal initialFullName={userFullName} initialEmail={userEmail || ""} />
    </Box>
  );
}

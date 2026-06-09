"use client";

import { useEffect, useRef } from "react";
import { refreshSupabaseSessionUser } from "@/lib/auth/refresh-supabase-session-user";
import { useEcommerceTracking } from "@/hooks/useTracking";

interface SuccessPageTrackingProps {
  transactionId: string;
  value: number;
  currency: string;
  items: any[];
  email?: string;
  attributionData?: Record<string, unknown>;
  purchaseType?: "first_purchase" | "subscription_renewal";
}

/**
 * Success page: refresh auth + fire GA4 `purchase` via gtag (client-side only).
 */
export default function SuccessPageTracking({
  transactionId,
  value,
  currency,
  items,
  email,
  attributionData,
  purchaseType = "first_purchase",
}: SuccessPageTrackingProps) {
  const { purchase } = useEcommerceTracking();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    void refreshSupabaseSessionUser({ force: true });
  }, []);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    if (!transactionId) return;

    const dedupeKey = `purchase_conversion_tracked_${transactionId}`;
    if (sessionStorage.getItem(dedupeKey) === "1") {
      hasTrackedRef.current = true;
      return;
    }

    const formattedItems = items.map((item) => ({
      item_id: item.price?.product || item.id || "unknown",
      item_name: item.description || "CELPIP Plan",
      price: (item.amount_total || 0) / 100,
      quantity: item.quantity || 1,
      item_brand: "CELPIP Practice Test",
      item_category: "Subscription",
      item_category2: "Digital Service",
    }));

    const userData = email ? { email } : undefined;

    purchase(
      transactionId,
      formattedItems,
      currency,
      value,
      undefined,
      userData,
      attributionData,
      purchaseType
    );
    hasTrackedRef.current = true;
    sessionStorage.setItem(dedupeKey, "1");
  }, [
    transactionId,
    value,
    currency,
    items,
    email,
    purchase,
    attributionData,
    purchaseType,
  ]);

  return null;
}

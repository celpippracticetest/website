"use client";

import { useEffect, useRef } from "react";
import { useEcommerceTracking } from "@/hooks/useTracking";

interface SuccessPageTrackingProps {
  transactionId: string;
  value: number;
  currency: string;
  items: any[];
  email?: string;
}

/**
 * SuccessPageTracking Component
 * Tracks successful purchase via GA4 e-commerce events
 */
export default function SuccessPageTracking({
  transactionId,
  value,
  currency,
  items,
  email,
}: SuccessPageTrackingProps) {
  const { purchase } = useEcommerceTracking();
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (hasTrackedRef.current) return;
    if (!transactionId) return;

    const dedupeKey = `purchase_conversion_tracked_${transactionId}`;
    if (sessionStorage.getItem(dedupeKey) === "1") {
      hasTrackedRef.current = true;
      return;
    }

    // Format items for GA4 e-commerce
    const formattedItems = items.map((item) => ({
      item_id: item.price?.product || item.id || 'unknown',
      item_name: item.description || 'CELPIP Plan',
      price: (item.amount_total || 0) / 100,
      quantity: item.quantity || 1,
      item_brand: 'CELPIP Practice Test',
      item_category: 'Subscription',
      item_category2: 'Digital Service',
    }));

    // Construct user data for Enhanced Conversions
    const userData = email ? { email } : undefined;

    // Track purchase event
    purchase(
      transactionId,
      formattedItems,
      currency,
      value,
      undefined, // coupon
      userData
    );
    hasTrackedRef.current = true;
    sessionStorage.setItem(dedupeKey, "1");

    if (process.env.NODE_ENV === 'development') {
      console.log('[E-commerce] Purchase tracked:', {
        transactionId,
        value,
        currency,
        items: formattedItems,
        userData
      });
    }
  }, [transactionId, value, currency, items, email, purchase]);

  return null;
}

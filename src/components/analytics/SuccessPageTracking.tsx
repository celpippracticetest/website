"use client";

import { useEffect } from "react";
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

  useEffect(() => {
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

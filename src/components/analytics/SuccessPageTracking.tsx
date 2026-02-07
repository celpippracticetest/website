"use client";

import { useEffect } from "react";
import { useEcommerceTracking } from "@/hooks/useTracking";

interface SuccessPageTrackingProps {
  transactionId: string;
  value: number;
  currency: string;
  items: any[];
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
    }));

    // Track purchase event
    purchase(
      transactionId,
      formattedItems,
      currency,
      value
    );

    if (process.env.NODE_ENV === 'development') {
      console.log('[E-commerce] Purchase tracked:', {
        transactionId,
        value,
        currency,
        items: formattedItems,
      });
    }
  }, [transactionId, value, currency, items, purchase]);

  return null;
}

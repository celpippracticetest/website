"use client";

import { useEffect } from "react";
import { refreshSupabaseSessionUser } from "@/lib/auth/refresh-supabase-session-user";

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
 * Success page side effects only.
 * GA4 `purchase` is sent server-side from the Stripe `checkout.session.completed` webhook
 * (Measurement Protocol) with the real amount and `session.id` as `transaction_id`.
 */
export default function SuccessPageTracking(_props: SuccessPageTrackingProps) {
  useEffect(() => {
    void refreshSupabaseSessionUser({ force: true });
  }, []);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HOME_AB_COOKIE } from "@/lib/homeAbTest";

const STORAGE_KEY_BY_FIELD = {
  gclid: "pending_gclid",
  utm_source: "pending_utm_source",
  utm_medium: "pending_utm_medium",
  utm_campaign: "pending_utm_campaign",
  utm_content: "pending_utm_content",
  utm_term: "pending_utm_term",
  entry_page: "pending_entry_page",
  referrer: "pending_referrer",
  attribution_session_id: "pending_attribution_session_id",
} as const;

const CHECKOUT_ATTRIBUTION_FIELDS = Object.keys(
  STORAGE_KEY_BY_FIELD
) as Array<keyof typeof STORAGE_KEY_BY_FIELD>;

type CheckoutAttributionState = Partial<
  Record<keyof typeof STORAGE_KEY_BY_FIELD, string>
>;

function readValue(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Key–value pairs to mirror a checkout POST (Stripe or PayPal create). */
export function useCheckoutAttributionPayload(): Record<string, string> {
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<CheckoutAttributionState>({});
  const [homeAbVariant, setHomeAbVariant] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const nextFields: CheckoutAttributionState = {};

    for (const field of CHECKOUT_ATTRIBUTION_FIELDS) {
      const value =
        readValue(searchParams.get(field)) ||
        readValue(localStorage.getItem(STORAGE_KEY_BY_FIELD[field]));

      if (value) {
        nextFields[field] = value;
      }
    }

    setFields(nextFields);

    const escaped = HOME_AB_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${escaped}=(classic|passport|legacy)`)
    );
    setHomeAbVariant(m?.[1] ?? null);
  }, [searchParams]);

  const payload: Record<string, string> = {};
  for (const field of CHECKOUT_ATTRIBUTION_FIELDS) {
    const value = readValue(searchParams.get(field)) || fields[field];
    if (value) payload[field] = value;
  }
  if (homeAbVariant) {
    payload.home_ab_variant = homeAbVariant;
  }
  return payload;
}

export default function CheckoutAttributionFields() {
  const payload = useCheckoutAttributionPayload();

  return (
    <>
      {Object.entries(payload).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
    </>
  );
}

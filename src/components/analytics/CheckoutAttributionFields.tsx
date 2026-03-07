"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const STORAGE_KEY_BY_FIELD = {
  gclid: "pending_gclid",
  utm_source: "pending_utm_source",
  utm_medium: "pending_utm_medium",
  utm_campaign: "pending_utm_campaign",
  utm_content: "pending_utm_content",
  utm_term: "pending_utm_term",
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

export default function CheckoutAttributionFields() {
  const searchParams = useSearchParams();
  const [fields, setFields] = useState<CheckoutAttributionState>({});

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
  }, [searchParams]);

  return (
    <>
      {CHECKOUT_ATTRIBUTION_FIELDS.map((field) => {
        const value = readValue(searchParams.get(field)) || fields[field];

        return value ? (
          <input key={field} type="hidden" name={field} value={value} />
        ) : null;
      })}
    </>
  );
}

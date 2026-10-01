"use client";

import { useSyncExternalStore } from "react";
import {
  planDiscountPercent,
  readBrowserPlanDiscountVariant,
} from "@/lib/planDiscountAb";

function subscribe() {
  return () => {};
}

/** 0 for arm A, 30 for arm B. Pass a server-read percent when the price is in the first HTML. */
export function usePlanDiscountPercent(serverPercent?: number): number {
  const fromCookie = useSyncExternalStore(
    subscribe,
    () => planDiscountPercent(readBrowserPlanDiscountVariant()),
    () => serverPercent ?? 0,
  );
  return serverPercent ?? fromCookie;
}

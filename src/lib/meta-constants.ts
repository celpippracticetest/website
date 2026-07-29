/**
 * Meta Pixel ID (public). Hardcoded default so browser + server CAPI keep
 * sending to the correct pixel even when env vars are unset; META_PIXEL_ID
 * still overrides for staging or account changes.
 */
export const META_PIXEL_ID =
  process.env.META_PIXEL_ID?.trim() ||
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ||
  "1255930053419869";

export const META_GRAPH_VERSION =
  process.env.META_GRAPH_VERSION?.trim() || "v21.0";

/** Standard Meta event names used by this app. */
export const META_EVENT = {
  PAGE_VIEW: "PageView",
  COMPLETE_REGISTRATION: "CompleteRegistration",
  INITIATE_CHECKOUT: "InitiateCheckout",
  PURCHASE: "Purchase",
} as const;

export type MetaStandardEventName =
  (typeof META_EVENT)[keyof typeof META_EVENT];

export function metaEventIdPageView(uuid: string): string {
  return `page_view:${uuid}`;
}

export function metaEventIdCompleteRegistration(userId: string): string {
  return `complete_registration:${userId}`;
}

export function metaEventIdInitiateCheckout(sessionId: string): string {
  return `initiate_checkout:${sessionId}`;
}

export function metaEventIdPurchase(transactionId: string): string {
  return `purchase:${transactionId}`;
}

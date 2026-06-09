# Deprecated — GTM removed

Google Tag Manager is **no longer used** on the CELPIP website.

Analytics events are sent directly to **GA4** from app code:

- [`src/lib/analytics.ts`](../src/lib/analytics.ts) — event definitions (`trackEvent`, `trackAuth`, `trackEcommerce`, …)
- [`src/lib/ga4Browser.ts`](../src/lib/ga4Browser.ts) — `gtag('event', …)` transport
- [`src/app/layout.tsx`](../src/app/layout.tsx) — loads gtag when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set

**Env:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` (browser) and `GA_MEASUREMENT_ID` + `GA_API_SECRET` (server Measurement Protocol).

The JSON exports in this folder are kept for historical reference only. You can unpublish or delete the GTM web container in [tagmanager.google.com](https://tagmanager.google.com/).

Reddit ads still use the in-app pixel ([`RedditPixelTracker.tsx`](../src/components/analytics/RedditPixelTracker.tsx)).

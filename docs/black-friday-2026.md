# Black Friday 2026 sale (temporary)

**Revert everything on Monday 2026-11-30.** The design and the discount are temporary; the site goes back to its pre-sale state, including the existing 30% plan-discount A/B test for everyone.

## What it does

- **Who:** visitors whose IP country (Vercel `x-vercel-ip-country`) is **CA, US or AU** and who have **never paid** (new accounts, or old accounts with no completed purchase).
- **Offer:** 50% off the **first payment** of a plan. Stripe coupon `black_friday_2026_50_first` (`percent_off: 50`, `duration: "once"`, `redeem_by` = sale end), created automatically on the first eligible checkout and attached automatically. Renewals are full price. Replaces the A/B 30% and referral/campaign codes for those users.
- **Ends:** Nov 29, 11:59 PM ET (`2026-11-30T04:59:59Z`). After that the UI hides itself and the coupon can't be redeemed, even before the code is reverted.
- **Everyone else:** unchanged (same A/B test as before).
- **UI:** pricing modal and `/pricing` (dark hero with countdown, red "50% OFF" chips, "Get 50% Off", "You save …"), `/plans` (same cards), homepage top bar (dismissible).

## Where the code is

Everything is named `blackFriday` / `BlackFriday` / `bf26`:

- `src/lib/blackFriday.ts`, `src/lib/blackFridayServer.ts`, `src/app/api/black-friday/route.ts`
- `src/hooks/useBlackFridayOffer.ts`, `src/components/black-friday/*`
- Small hooks into: `api/checkout_session/route.ts`, `PremiumPaywallOverlay.tsx`, `PricingPageClient.tsx`, `PricingBrandPlansSection.tsx`, `PricingBrandPlanCard.tsx`, `brandPlanPricing.ts` (`savingsLabel`), `(dashboard)/plans/page.tsx`, `HomePageClient.tsx`, `TopHeader.tsx` (`--bf26-bar-h` offset).

## How to revert

`git revert <black friday commit>` and deploy. Then check: the homepage has no bar, the pricing modal shows the normal header, and checkout for a CA user uses the A/B price. Leave the expired Stripe coupon (harmless) or archive it in the Stripe dashboard.

## Local testing

Set `BLACK_FRIDAY_DEV_COUNTRY=CA` for the dev server (ignored in production) to see the sale on localhost.

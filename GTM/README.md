# Google Tag Manager — CELPIP website (dataLayer) import template

This folder contains a **GTM container JSON** you can **Import** into your web container to recreate **GA4 Configuration** + **GA4 Event** wiring aligned with [`src/lib/gtm.ts`](../src/lib/gtm.ts) (dataLayer event names).

## Files

| File                                                             | Purpose                                                     |
| ---------------------------------------------------------------- | ----------------------------------------------------------- |
| [`celpip-web-ga4-template.json`](./celpip-web-ga4-template.json) | GTM **Import** file (tags, triggers, variables, built-ins). |

## Before you import

1. **Backup** your current container: GTM → **Admin** → **Export Container**.
2. Decide whether you will **Merge** (recommended) or **Overwrite** (destructive).
3. Have your **GA4 Measurement ID** ready (e.g. `G-XXXXXXXXXX` from GA4 → Admin → Data streams → Web).

## Import steps

1. Open [Google Tag Manager](https://tagmanager.google.com/) → select your **Web** container.
2. **Admin** → **Import Container**.
3. Choose **Merge** (map conflicting tags to “Rename” if prompted) or **Overwrite** (only on a new/empty workspace).
4. Upload `celpip-web-ga4-template.json`.
5. After import, open the variable **`CPT - GA4 Measurement ID`** and set the value to your real **Measurement ID**.
6. **Preview** the workspace:
   - Confirm **CPT - GA4 Config** fires on container load.
   - Complete a **sign-up** and confirm **`sign_up`** appears in GA4 **DebugView** (dataLayer `event` is **`sign_up`**; the GA4 Event tag sends the same name).
   - Start checkout / purchase and confirm **`begin_checkout`** / **`purchase`** with ecommerce payload.
7. **Publish** when satisfied.

## What the template does

- **GA4 Configuration** (`CPT - GA4 Config`) on **All Pages** using `{{CPT - GA4 Measurement ID}}`.
- **`sign_up`**: dedicated GA4 Event tag on dataLayer **`sign_up`** (GA4 recommended name), with **`method`** and **`user_id`** mapped from the data layer.
- **Ecommerce-style dataLayer events** (`begin_checkout`, `purchase`, `refund`, `view_item_list`, `select_item`): GA4 Event tags with **Send ecommerce data** from the data layer, plus explicit custom params (`purchase_type`, `skill_type`, `attribution_source`, `attribution_medium`, `attribution_campaign`, `utm_*`, `entry_page`, `purchase_page`, `attribution_session_id`) mapped from dataLayer variables.
- **All other app events** from `gtm.ts` (except `ads_enhanced_conversion` and `consent_update`): single **regex** Custom Event trigger + GA4 Event tag mirroring **`{{_event}}`** so event names in GA4 match the dataLayer (e.g. `page_view`, `login_completed`, …).

## Intentionally not sent to GA4 (by this template)

- **`ads_enhanced_conversion`** — keep for **Google Ads / Meta** tags only (PII); do **not** mirror into GA4 unless you intentionally add a tag and privacy review.
- **`consent_update`** — handle via **Consent Mode** / CMP tags, not as GA4 events.

Add separate tags in GTM for Ads/Meta if you use those platforms.

## Paid media: Google Ads, Meta, Reddit (pixels) — GTM checklist

You said you will handle **UTM** on links; that covers **session attribution** (source/medium/campaign in GA4). **Pixels** are separate: they fire **browser-side** conversions for **optimization** and **remarketing** in each ad platform.

### Data the site already gives you (from [`src/lib/gtm.ts`](../src/lib/gtm.ts))

| dataLayer `event`         | Use for                                                                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `page_view`               | GA4 + (optional) Meta PageView if you do not rely on Meta’s automatic PageView only.                                                                                                                                                                                         |
| `begin_checkout`          | GA4 ecommerce + **Google Ads** “begin checkout” / **Meta** InitiateCheckout (if you track funnel in ads).                                                                                                                                                                    |
| `purchase`                | GA4 ecommerce + **Google Ads** Purchase / **Meta** Purchase + value/currency/items (from `ecommerce`).                                                                                                                                                                       |
| `sign_up`                 | GA4 recommended signup + **Google Ads** signup + **Meta** CompleteRegistration.                                                                                                                                                                                              |
| `ads_enhanced_conversion` | **Google Ads + Meta enhanced conversions** — contains **`user_data`** (PII). **Do not** send this event to GA4. Fire **only** Ads/Meta tags on this event. Fields include `google_ads_send_to`, `value`, `currency`, `transaction_id`, `conversion_event`, `user_data`, etc. |

### Google Ads (recommended GTM setup)

1. **Conversion linker** (Google tag / linker tag) — fires on **All Pages** (or Consent Initialization + All Pages per your CMP).
2. **Conversion** tags (or one **Google Ads** conversion tag per action) with triggers:
   - **Purchase** → Custom Event `purchase` (use **Conversion value** from DL `value` / ecommerce; **Order ID** = `transaction_id`).
   - **Sign-up** → Custom Event **`sign_up`**.
   - **Begin checkout** (optional) → Custom Event `begin_checkout`.
3. **Enhanced conversions** — add tag(s) on **`ads_enhanced_conversion`** only, using:
   - `google_ads_send_to` (site already sets this from [`google-ads-constants`](../src/lib/google-ads-constants.ts) / env), and/or
   - **User-provided data** from the `user_data` object on that same event.  
     Match Google’s GTM UI for “Enhanced conversions” → **Provide manually** / **data layer** depending on your tag type.

Use **Consent Mode** so these tags respect `ad_storage` / `ad_user_data` after your CMP fires `consent_update`.

### Meta (Facebook / Instagram) Pixel

1. **Meta Pixel** base (Meta tag template or Custom HTML) — **one** Pixel ID per container; load early enough to catch conversions, still after consent if required.
2. **Standard events** (typical mapping to this site’s dataLayer):
   - **`PageView`** — either Meta’s default on load **or** fire on `page_view` (avoid **double** PageView if both fire).
   - **`Purchase`** — trigger on `purchase`; pass `value`, `currency`, `content_ids` / `contents` from `ecommerce.items` if you map them in GTM variables.
   - **`CompleteRegistration`** — trigger on **`sign_up`**.
   - **`InitiateCheckout`** (optional) — trigger on `begin_checkout`.
3. **Enhanced matching / Conversions API** — optional; browser pixel alone is what most teams start with. If you use **`ads_enhanced_conversion`**, you can add a **parallel Meta tag** on that same event for hashed user data (policy + implementation heavy).

### Reddit Ads

The **Reddit pixel is already loaded in the app** in production ([`RedditPixelTracker.tsx`](../src/components/analytics/RedditPixelTracker.tsx)): **init**, **PageVisit** on route changes, and **`gtm.ts`** calls **`rdt('track','SignUp')`** / **`Purchase`** with value/currency/transaction id when those fire.

**Recommendation:** do **not** add a second Reddit pixel in GTM unless you **remove** the app bootstrap (otherwise you risk **duplicate** PageVisit/conversions). If you prefer **GTM-owned** Reddit only, remove/disable the React tracker and move init + PageVisit into GTM.

### UTM (your scope)

UTMs affect **GA4 / ad platform reporting** when users land with `utm_*` / `gclid` / etc. They do **not** replace pixels. Keep UTMs consistent per channel; use the same campaign naming you use in each ads UI when possible.

### Order of operations (consent + dedupe)

1. **Consent defaults** → **Consent update** (CMP) → **Conversion Linker** → **Pixels / conversions** → **GA4** (whatever order your lawyer/agency approves; ads tags must not fire before consent if you’re in a regulated setup).
2. **Dedupe**: use **`transaction_id`** on `purchase` in each platform; align with what [`trackEcommerce.purchase`](../src/lib/gtm.ts) pushes.

## Import format note (trigger `type`)

GTM **container JSON import** uses **UI-style trigger types** (e.g. **`PAGEVIEW`** for “All Pages”), not always the same strings as the Tag Manager **REST API** enum (`pageview`). If import fails with “Unrecognized value `[pageview]`”, use **`PAGEVIEW`** in the JSON (as in this template).

## After import checklist

- [ ] Measurement ID variable updated.
- [ ] GA4 **DebugView** shows `page_view` + key conversions (`sign_up`, `purchase`).
- [ ] No duplicate `page_view` (if you also use a separate SPA/history tag, adjust firing conditions).
- [ ] **Consent Mode** order: Consent defaults / update tags still **before** GA4 where required.

## Regenerating from code

Event names are defined in `src/lib/gtm.ts` (`event: "..."`). If you add new events, either:

- extend the **regex** on trigger **CPT - CE - App events (regex)** in GTM, or
- add a dedicated GA4 Event tag + trigger for that event.

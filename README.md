This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Author majid.
.

# website

## Tracking Documentation

- Canonical tracking contract: `docs/tracking-spec.md`
- GTM export snapshot (ops artifact): `GTM_workspace.json`

## Google Analytics Dashboard Setup (GA4 + GTM)

This project already sends tracking events through Google Tag Manager (GTM) and GA4.

### 1) Configure environment variables

Set these in your deployment environment (and in local `.env.local` if needed):

- `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`
- `NEXT_PUBLIC_GTM_LEGACY_ID=GTM-XXXXXXX` (optional migration-only secondary container)
- `GA_MEASUREMENT_ID=G-XXXXXXXXXX` (canonical GA4 Measurement ID)
- `GA_API_SECRET=xxxxxxxxxxxxxxxx`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` (same value as `GA_MEASUREMENT_ID`; used in the browser so checkout can send GA4 `client_id` / `session_id` into Stripe metadata for Measurement Protocol renewals)

- `NEXT_PUBLIC_GTM_ID` loads GTM in `src/app/layout.tsx`.
- `NEXT_PUBLIC_GTM_LEGACY_ID` can load a second GTM container in parallel during migration.
- `GA_API_SECRET` is required for server-side GA4 events (heartbeat + Stripe webhook events).
- Server-side GA4 strictly uses `GA_MEASUREMENT_ID`.

### 2) GA4 property and data stream

In Google Analytics:

1. Create/select a GA4 property.
2. Create a Web data stream for your domain.
3. Copy the Measurement ID (`G-...`).
4. In Admin -> Data display -> Events, confirm incoming events after deployment.
5. For **practice-by-skill** in `/api/analytics/live-stats` and `/api/analytics/reports`, ensure an **event-scoped** custom dimension **`skill_type`** exists (Data API field `customEvent:skill_type`). From the repo root, run: **`yarn ga4:ensure-skill-dimension`** (`tooling/ga4-ensure-skill-type-dimension.js`). The script resolves credentials in this order: `ANALYTICS_CREDENTIALS_FILE` / `GOOGLE_APPLICATION_CREDENTIALS` / `secrets/gcp-bq-mcp-sa.json` / inline `ANALYTICS_CLIENT_EMAIL` + `ANALYTICS_PRIVATE_KEY`; it prefers a key whose `project_id` matches `GTM_PROJECT_ID` or `GOOGLE_CLOUD_PROJECT` (for this repo, `celpip-d8f02`). Ensure that service account has **Editor** (or another role that includes **Edit Google Analytics**) on the GA4 property and that **Google Analytics Admin API** is enabled on its GCP project (the script prints the exact [**APIs dashboard**](https://console.cloud.google.com/apis/dashboard?project=celpip-d8f02) URL).

**Consent Mode:** `public/scripts/gtm-consent-defaults.js` sets **`analytics_storage: granted`** and ad-related defaults **denied** so GA4 can collect while ads stay gated until you call `updateConsent()` (e.g. from a CMP). If you target regions that require opt-in for analytics, add a banner and push **`analytics_storage: denied`** until the user accepts.

### 3) GTM container wiring

1. Open your GTM container (`NEXT_PUBLIC_GTM_ID`).
2. Ensure a GA4 Configuration tag exists with your Measurement ID.
3. Ensure event tags map to `dataLayer` events already pushed by the app:
   - `page_view`
   - `sign_up`
   - `begin_checkout`
   - `purchase`
   - `practice_started`
   - `practice_completed`
4. Register custom dimensions for attribution params used in events:
   - `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`
   - `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid`
   - `purchase_type`, `attribution_source`, `attribution_session_id`
5. Publish the container.

### 4) Verify data flow

Use these checks after deploy:

- GA4 -> Realtime: verify active users and `page_view`.
- GTM Preview mode: verify `dataLayer` events fire.
- Browser DevTools Network: confirm calls to `/gtm/js` and `/g/collect`.
- Trigger one conversion path (signup or purchase) and verify the event in GA4 DebugView.
- Verify Stripe webhook → GA4 Measurement Protocol (when `GA_MEASUREMENT_ID` + `GA_API_SECRET` are set):
  - `purchase` on `checkout.session.completed` (same `transaction_id` as the Stripe Checkout Session id).
  - `purchase` on `invoice.payment_succeeded` for **subscription renewals** only (`billing_reason` = `subscription_cycle`).
  - `subscription_cancelled` on subscription deleted (unchanged).
- Verify Supabase sign-up: GTM Preview should show dataLayer **`sign_up`** after account creation (browser). Optional server backup: configure a Supabase Database Webhook or Auth hook on `auth.users` **INSERT** → `POST /api/users/webhook` with header `Authorization: Bearer $SUPABASE_AUTH_WEBHOOK_SECRET` (or `x-webhook-secret`) for GA4 MP **`sign_up`** when `GA_MEASUREMENT_ID` + `GA_API_SECRET` are set.

### 5) Build a useful GA4 dashboard

In GA4 Reports/Explore, start with:

- Traffic: Sessions by source/medium, landing page.
- Funnel: `page_view` -> `begin_checkout` -> `purchase`.
- Product: Revenue by item/plan, conversion rate by plan.
- Retention: New vs returning users, engagement by path.

### 6) BigQuery (SQL + KPIs on raw events)

To warehouse **GA4 event-level** data for custom KPIs, SQL funnels, and joins to cost data:

1. Follow **`docs/bigquery-setup-and-kpis.md`** — link the GA4 property to a GCP project, IAM, and starter queries (DAU, commerce funnel, sign-ups, practice/exam).
2. After the first tables land (~24–48h), use **`docs/bigquery-ga4-flow-after-24h.md`** to verify export, purchases, and campaign attribution.

Production GA4 export tables live under **`celpip-d8f02.analytics_533185817`** (default dataset for property `533185817`) or **`celpip-d8f02.analytics_celpip`** if the BigQuery link used a custom dataset name. Bootstrap SQL: [`sql/bigquery/01_bootstrap_checks.sql`](sql/bigquery/01_bootstrap_checks.sql). Table DDL: [`sql/bigquery/00_ad_spend_daily_ddl.sql`](sql/bigquery/00_ad_spend_daily_ddl.sql) (add `campaign_id` via [`00b_migrate_add_campaign_id.sql`](sql/bigquery/00b_migrate_add_campaign_id.sql) if upgrading). ROAS and daily views: [`sql/bigquery/02_campaign_roas_all_channels.sql`](sql/bigquery/02_campaign_roas_all_channels.sql); rollups: [`sql/bigquery/03_campaign_roas_by_campaign.sql`](sql/bigquery/03_campaign_roas_by_campaign.sql). **Meta / Bing / Reddit spend:** [`docs/multichannel-ad-spend.md`](docs/multichannel-ad-spend.md) and `yarn ads:meta-to-bq` / `yarn ads:csv-to-bq`.

**Revenue / finance / growth** (UTMs, consent, Looker-style dashboard, paid social tests, churn experiments, Semrush when API units are available): see [`docs/finance-growth-bq-dashboard.md`](docs/finance-growth-bq-dashboard.md) and the linked playbooks in that doc.

BigQuery receives **analytics events** (including `user_id` when set), not a full export of auth providers or billing systems; join other sources in your warehouse when you need complete user records.

### 7) Cursor MCP for BigQuery

The website repo ships [`.cursor/mcp.json`](.cursor/mcp.json) so the agent can run **BigQuery SQL** via MCP (`BIGQUERY_DATASETS` includes `analytics_533185817` and `analytics_celpip`). Add a GCP **service account JSON** at `secrets/gcp-bq-mcp-sa.json` (gitignored); the MCP subprocess does not pick up `gcloud` Application Default Credentials reliably. After changing `mcp.json`, reload MCP. Install steps and the Windows `C:\tmp` note are in **`docs/bigquery-setup-and-kpis.md`** (section _Cursor MCP_).

**Google Analytics (GA4) MCP** is also configured: [googleanalytics/google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) runs from a local venv `.venv-analytics-mcp` (gitignored; install with `pip install analytics-mcp` into that venv if you recreate it). `.cursor/mcp.json` starts it via **`.cursor/run-analytics-mcp.py`**, which sends the package’s startup `print` output to **stderr** so the MCP stdio stream is not corrupted. It uses the same **`secrets/gcp-bq-mcp-sa.json`** as BigQuery MCP for `GOOGLE_APPLICATION_CREDENTIALS`; that service account must have **Viewer** (or higher) on the GA4 property in **Admin → Property access management**. `GOOGLE_PROJECT_ID` and `GOOGLE_CLOUD_PROJECT` are both set to `celpip-d8f02`. On GCP ([**APIs dashboard**](https://console.cloud.google.com/apis/dashboard?project=celpip-d8f02)), enable **Google Analytics Data API** and **Google Analytics Admin API**. For OAuth user JSON instead, point `GOOGLE_APPLICATION_CREDENTIALS` at another path in `.cursor/mcp.json`. See Google’s [Analytics MCP guide](https://developers.google.com/analytics/devguides/MCP).

**Google Tag Manager MCP** uses the community [gtm-mcp](https://pypi.org/project/gtm-mcp/) package in a local venv `.venv-gtm-mcp` (gitignored; recreate with `python -m venv .venv-gtm-mcp` then `pip install gtm-mcp`). `.cursor/mcp.json` starts it via **`.cursor/run-gtm-mcp.py`**, which loads **`GTM_CLIENT_ID`**, **`GTM_CLIENT_SECRET`**, and **`GTM_PROJECT_ID`** from the workspace **`.env`** (if those variables are not already set in the environment). Any still-missing values are taken from optional **`secrets/gtm-client-auth.json`** (gitignored): a Google Cloud **Desktop app** OAuth client JSON with an `installed` object (`client_id`, `client_secret`, `project_id`). Enable the **Tag Manager API** and complete the OAuth consent screen. The first GTM tool call runs a **local browser** flow; refresh tokens live in **`.gtm-mcp-token.json`** in your user profile (see the package README). Optional: run `.venv-gtm-mcp/Scripts/gtm-mcp-setup.exe` for the setup wizard.

**Google Ads MCP** is not enabled in [`.cursor/mcp.json`](.cursor/mcp.json) until you have a **Google Ads developer token**. That token is required by Google for **any** programmatic access (single advertiser account or otherwise); it is **not** the same thing as a manager (MCC) account. You request it once in the [Google Ads API Center](https://ads.google.com/aw/apicenter) (from an Ads account with admin access); new tokens are often issued at Explorer or Test tier first, which is enough to try the API. Without a developer token, [google-ads-mcp](https://github.com/googleads/google-ads-mcp) cannot call the API, so there is nothing useful to put in MCP config yet.

When you have a developer token and OAuth-style credentials with the `https://www.googleapis.com/auth/adwords` scope (see the [MCP setup guide](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server)): install the server in a local venv `.venv-google-ads-mcp` (`pip install git+https://github.com/googleads/google-ads-mcp.git`), add `secrets/google-ads-mcp-credentials.json` (gitignored), enable **Google Ads API** on your GCP project, then add a `google-ads-mcp` entry under `mcpServers` with `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_PROJECT_ID`, and `GOOGLE_ADS_DEVELOPER_TOKEN`. Only if you sign in **through** a manager account to reach a client account should you also set `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (the manager’s numeric customer id, no dashes).

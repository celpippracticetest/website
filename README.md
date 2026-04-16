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

## Google Analytics Dashboard Setup (GA4 + GTM)

This project already sends tracking events through Google Tag Manager (GTM) and GA4.

### 1) Configure environment variables

Set these in your deployment environment (and in local `.env.local` if needed):

- `NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX`
- `NEXT_PUBLIC_GTM_LEGACY_ID=GTM-XXXXXXX` (optional migration-only secondary container)
- `GA_MEASUREMENT_ID=G-XXXXXXXXXX` (canonical GA4 Measurement ID)
- `GA_API_SECRET=xxxxxxxxxxxxxxxx`

Notes:

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

### 3) GTM container wiring

1. Open your GTM container (`NEXT_PUBLIC_GTM_ID`).
2. Ensure a GA4 Configuration tag exists with your Measurement ID.
3. Ensure event tags map to `dataLayer` events already pushed by the app:
   - `page_view`
   - `sign_up_completed`
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
- Verify Stripe webhook server events:
  - `stripe_checkout_completed`
  - `stripe_invoice_paid`
  - `subscription_renewed`
  - `subscription_cancelled`

### 5) Build a useful GA4 dashboard

In GA4 Reports/Explore, start with:

- Traffic: Sessions by source/medium, landing page.
- Funnel: `page_view` -> `begin_checkout` -> `purchase`.
- Product: Revenue by item/plan, conversion rate by plan.
- Retention: New vs returning users, engagement by path.

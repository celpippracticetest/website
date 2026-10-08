# Backend cleanup plan

Audit of the `develop` branch, October 2026. Work through the steps in order: **one commit and push per step**.
After each step, run `npx tsc --noEmit` and `npm run build`.

Already done:
- `758e2942`: removed `test.tasks.json` and `learner-parity-checklist.md`, tightened `.gitignore`
- Removed the npm scripts that point at missing files (`google-ads:refresh-token`, `migrate:plans:billing-fields`, `migrate:onboarding:new-to-onboarding`, `seed:profession-pages`) and the duplicate `buildverify`. This was in the working tree; commit it if it isn't committed yet.

Not running any database migration below causes **no bugs**. The migrations only remove tables that the code no longer reads.

---

## Decisions needed first

Commit `0131a774` ("Restore ed8d29fc UI … keeping Supabase backend") deleted about 50 API routes. Some live code still calls four of them, and those calls fail on every request:

| Caller | Missing route | Effect today | Suggested fix |
|---|---|---|---|
| `src/proxy.ts` (pending referral cookie on `/practice-overview`) | `/api/partners/apply-pending-code` | Referral and partner codes from the cookie are **never applied** | Restore the route from `git show 0131a774^:src/app/api/partners/apply-pending-code/route.ts` |
| `src/app/sign-in/SignSupabasePageClient.tsx:62` | `/api/users/update-attribution` | gclid and UTM attribution for new sign-ups is **lost** | Restore the route (check the history of `src/app/api/users/`) |
| `src/lib/accountSharingMiddleware.ts` → `src/proxy.ts:~161` | `/api/account/access-check` | The account-sharing guard is off. Every paid dashboard page view makes a wasted request and logs an error | Restore `account/access-check` and `account/devices/add-seat`, **or** remove the guard from `proxy.ts` and delete `accountSharingMiddleware.ts` |
| `src/hooks/useRecentSignupsLiveStat.ts` (used by `AuthPageChrome.tsx`) | `/api/analytics/live-stats` | The fallback number always shows | Restore the route, or remove the hook and keep the static number |

Also confirm that nothing outside the repo calls these:
- `src/app/api/cron/generate-blog`: not in `vercel.json`. Is an external scheduler calling it?
- `src/app/api/mobile/*`: used by the mobile app. **Keep.**

---

## Step 1: remaining repo leftovers

```bash
git rm -r data                                          # unused root data/ (code uses src/data)
git rm src/components/icons/BeavoShowsTime.tsx icons/svg/beavoShowsTime.svg   # 1.8 MB, never used
git rm --cached public/sw.js                            # build output, already in .gitignore
git rm -r exports/disputes                              # customer dispute PDFs (personal data)
```
- Remove the `BeavoShowsTime` line from `src/components/icons/index.ts`.
- `exports/disputes` stays in git history. If it must be purged, use `git filter-repo`, which rewrites history and needs a force-push. Coordinate with the team first.
- **Keep both** `templates/` and `supabase/templates/`. The Supabase CLI resolves `content_path` from the project root, so check which one is live before deleting either.
- Review by hand: the scratch files in `docs/` (`bugs to fix.xlsx`, `blured bear image issue.txt`, `ep1.md`, `ep2.md`, `Pricing.dc.html`, the KPI CSVs), `GTM_workspace.json`, `SENTRY_SETUP.md` and `public/images/review.png` (1.3 MB, not referenced in code).

Commit: `chore: remove unused data, icon and committed build output`

## Step 2: unused API routes

None of these has a caller in the repo:
```
src/app/api/whoami/route.ts                    (identical to users/whoami)
src/app/api/users/whoami/route.ts
src/app/api/cello_token/route.ts               (also signs JWTs with "YOUR_SECRET_KEY" fallback)
src/app/api/parse-doc/route.ts
src/app/api/referrals/store-referral/route.ts  (proxy sets the cookie directly)
src/app/api/plans/available/route.ts           (/api/plans is used)
src/app/api/practices/list/route.ts
src/app/api/blog/slug/[slug]/route.ts
src/app/api/blog/cms-posts/route.ts
src/app/api/user/subscription-status/route.ts
```
- Also remove the Cello sandbox script in `src/app/layout.tsx:~363` and the commented-out Cello block in `src/components/pages/referral/Referral.tsx`.
- After `cello_token` is gone, `jsonwebtoken` and `@types/jsonwebtoken` are unused.

Commit: `chore(api): remove unused routes`

## Step 3: dead lib, repository and model files

None of these has an importer, or the only importers are other dead files:
```
src/lib/accountDeviceAccess.ts  src/lib/accountDeviceBilling.ts  src/lib/accountSharingSignals.ts
src/lib/analytics/                       (whole folder: *Metrics.ts)
src/lib/abandoned-cart-email/  src/lib/nurture-email/  src/lib/reminder-email/
src/lib/cms/challengeAcceptances.ts  src/lib/content-linker-server.ts
src/lib/flow/                            (whole folder)
src/lib/ga4Credentials.ts  src/lib/gmailEmail.ts  src/lib/gtm.ts  src/lib/homepage-hero.ts
src/lib/indexnow.ts  src/lib/media.ts
src/lib/partner/createPartnerRefereeStripeDiscount.ts
src/lib/partner/generatePartnerCode.ts
src/lib/partner/syncPartnerFieldsToUserDocument.ts
src/lib/paypal/                          (whole folder)
src/lib/pendingHomeDiagnostic.ts  src/lib/practiceSeoCopy.ts  src/lib/practiceSubmitProgress.ts
src/lib/profession-pages/public.ts  src/lib/requestOrigin.ts
src/lib/stripe/reporting-sync.ts  src/lib/stripeCheckoutDiscountLabel.ts
src/lib/stripeLastPaymentSelfService.ts  src/lib/subscriptionPlan.ts
src/lib/successPageUpgrade.ts  src/lib/telegramLinkDb.ts  src/lib/userNeedsOnboardingSurvey.ts
src/lib/waitForCheckoutRecord.ts  src/lib/wiki/public.ts
src/lib/client/user/cancelUserPlan.ts  src/hooks/useCancelUserPlan.ts

src/repositories/users.repo.ts  lead-capture-config.repo.ts  lead-capture-lead.repo.ts
src/repositories/refund-request.repo.ts  homepage-hero-schedule.repo.ts
src/repositories/profession-page.repo.ts  stripe-reporting.repo.ts  wiki.repo.ts

src/models/internal-link.model.ts  userActivity.ts  users.mode.ts
src/models/homepage-hero-schedule.model.ts  lead-capture.model.ts
src/models/profession-page.model.ts  refund-request.model.ts  wiki.model.ts
```
- Before deleting each file, re-check it with `grep -rn "<file name without extension>" src tooling scripts tests`.
- Split this step into 2–3 commits (lib, repositories and models, client and hooks) if that's easier to review.

Commit: `chore: remove dead lib, repository and model modules`

## Step 4: stale route references

- `src/proxy.ts` `protectedPaths`: remove `POST:/api/practices/answers`, `GET:/api/practices/answers` and `POST:/api/paypal/create-subscription`.
- `src/lib/accountSharingMiddleware.ts:24-36`: redundant, because line 41 already returns early for every `/api/` path. Only applies if the guard is kept; see Decisions.
- `src/lib/stripeCheckoutPaymentMethods.ts:7`: the comment refers to the removed PayPal route.
- Stale Clerk comments in `campaignPromoConfig.ts`, `subscriptionAccess.ts` and `api/sessions/route.ts`.
- The disabled "NEW user discount" block in `src/app/api/checkout_session/route.ts:317-356`.

Commit: `chore: drop references to removed routes`

## Step 5: finished one-off migrations (tooling)

Remove these scripts. The Mongo→Postgres and Clerk→Supabase migrations are done.
```
tooling/migrate-clerk-to-supabase.ts  tooling/patch-clerk-to-supabase-snapshot.mjs
tooling/migrate-exams-mongo-to-pg.ts  tooling/migrate-mongo-collections-to-pg.ts
tooling/migrate-mongo-wiki-to-pg.ts   tooling/migrate-mongo-blogs-to-pg.ts
tooling/mongo-pg-sync-shared.ts       tooling/rewrite-mongodb-imports.mjs
tooling/migrate-answers-practice-history.mjs  tooling/pg-app-documents-drop-redundant-prefix.mjs
tooling/probe-exam-part.mjs
scripts/performance-test.js  scripts/reconcile-stale-stripe-plans.mjs
src/lib/migrations/clerkToSupabase*.ts
```
Remove these from `package.json`:
- `migrate:clerk:supabase`, `migrate:clerk:supabase:latest-500`
- `migrate:exams:mongo-to-pg`, `migrate:mongo:app-documents`, `migrate:mongo:wiki`, `migrate:mongo:blogs`

Keep the `tooling/pg-*.mjs` diagnostics unless nobody uses them. Keep `load-repo-env.mjs`, `load-website-dotenv.ts` and `bootstrap-website-env.ts` while other scripts still import them.

Commit: `chore(tooling): remove finished Mongo and Clerk migration scripts`

## Step 6: unused npm packages

```bash
npm uninstall @anthropic-ai/sdk @google-analytics/data customerio-node moment dayjs \
  @mui/x-date-pickers @mui/material-nextjs @emotion/server @radix-ui/react-dialog \
  @stripe/stripe-js next-sitemap next-themes nodemailer @types/nodemailer svix \
  @types/diff @types/react-day-picker mongodb jsonwebtoken @types/jsonwebtoken
```
These are only used by dead UI wrappers. Delete the wrappers first, then uninstall:
- `react-router-dom`: `src/components/dashboard-app/*-practice/hooks/useListeningRouteParams.tsx` (4 files)
- `vaul`: `src/components/ui/drawer.tsx`, `src/app/premiumPlanDrawer.tsx`
- `react-resizable-panels`: `src/components/ui/resizable.tsx`
- `react-day-picker`: `src/components/ui/calendar.tsx`
- `@radix-ui/react-menubar`, `-hover-card`, `-navigation-menu`, `-slider`, `-radio-group`: their `src/components/ui/*` wrappers. Also remove them from `optimizePackageImports` in `next.config.ts`.

`aws-sdk` (v2): delete the unused `import AWS from "aws-sdk"` line in the 7 files under `src/app/cms/dashboard/{exam,practice}/*/cms*Service.ts`, then uninstall it.

Also:
- `@tailwindcss/typography` is listed in both dependencies and devDependencies; keep one.
- Probably unused (verify with `npm run lint`): `@eslint/js`, `globals`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`.
- `package.json` declares `packageManager: yarn` but the repo uses `package-lock.json`. Pick one.

Commit: `chore(deps): remove unused packages`

## Step 7: refactor

Make each item a separate commit.
1. **A/B tests**: nothing sets the `site_ui_variant` and `pricing_ab_model` cookies anymore. Remove `src/lib/uiAbTest.ts`, `src/lib/pricingModelAbTest.ts`, `src/lib/analyticsStyleContext.ts` and `src/lib/analyticsPricingModelContext.ts`, along with their readers. Then merge the shared cookie/parse/preview logic of `pricingAbTest`, `homeAbTest` and `planDiscountAb` into one helper.
2. **Unused exports**: about 60 exports in live files have no users. Examples:
   - 11 in `lib/pricing.ts`
   - 5 in `lib/seo/siteSchema.ts`
   - 4 in `lib/subscriptionAccess.ts`
   - 3 in `lib/userActivity.ts`
   - 3 in `lib/mockExamAttemptId.ts`
   - 3 in `lib/email/resend-client.ts`

   A tool like `npx knip` gives the full list.
3. **Pricing modules**: `pricing.ts`, `pricingCatalog.ts`, `plansCatalog.ts`, `brandPlanPricing.ts`, `pricingPlanSections.ts`, `loadActivePlansWithStripePrices.ts` and `stripeRegionalPricing.ts` overlap. Consolidate them. The same goes for `sitewidePlanCoupon` and `sitewidePlanDiscount`, and for `campaignPromo` and `campaignPromoConfig`.
4. **Onboarding**: the old `/api/onboarding` POST has no caller, and the new survey uses `/api/onboarding-new`. Its GET and `/export` only show old survey data in the CMS. Remove the route, `onboarding.repo.ts` and the CMS view once that data is no longer needed.
5. **Subscriptions written twice**: `mirrorStripeSubscription.ts` writes both `public.stripe_subscriptions` and `doc_stripe_subscriptions`. Keep one.
6. **Bug, cancel subscription**: `src/app/api/users/cancel-subscription/route.ts:69-71,208-210` reads `subscription_created` from the legacy `useractivities` documents, which haven't been updated since the move to the `user_activities` table. Read from `user_activities` instead (see `src/lib/userActivity/userActivitiesPg.ts`).
7. `src/app/api/admin/users/route.ts:115` creates a `useractivities` handle and never uses it.

---

## Step 8: database (migration files; apply them yourself)

Write the files into `supabase/migrations/`. **Before applying:**
- Take a backup or confirm point-in-time recovery is on.
- Run the check query below.

### 8a. Check that nothing writes to these tables
```sql
-- dedicated tables
SELECT relname, n_live_tup, last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('blog_cms_posts','wiki_articles','doc_blog_target_keywords',
  'doc_stripe_customers','doc_stripe_invoices','doc_stripe_prices',
  'doc_stripe_balance_transactions','doc_stripe_sync_state','doc_ga_user_attribution',
  'doc_paypal_subscription_grants','doc_paypal_subscription_pending',
  'doc_telegram_links','doc_telegram_linking_tokens','doc_leadCaptureConfig',
  'doc_leadCaptureLeads','doc_refundRequests','doc_profession_pages',
  'doc_homepageHeroSchedules','doc_internalLinks','doc_account_access_signals',
  'doc_reminderEmailConfigs','doc_nurtureEmailConfigs','doc_abandonedCartEmailConfigs',
  'doc_account_deletion_surveys','doc_cancellation_surveys','doc_marketing_assets',
  'doc_onboarding_results','doc_onboarding_new_results','doc_user_activity',
  'doc_user_attribution_events','doc_useractivityreminderdispatchlocks',
  'doc_useractivityreminderstats');

-- generic table: newest row per collection
SELECT collection, count(*), max(updated_at) FROM app_documents GROUP BY 1 ORDER BY 3 DESC;
```
- Check the exact `doc_*` names in `supabase/migrations/20260729130000_create_dedicated_document_tables.sql` and `src/lib/pg/dedicatedDocumentTables.ts`.
- Drop any table from the list that turns out to still be written.

### 8b. Migration A: move unused tables aside (reversible)
`supabase/migrations/<timestamp>_archive_unused_tables.sql`:
```sql
CREATE SCHEMA IF NOT EXISTS archive;
ALTER TABLE IF EXISTS public.blog_cms_posts SET SCHEMA archive;
ALTER TABLE IF EXISTS public.wiki_articles  SET SCHEMA archive;
-- …one line per table from 8a that is confirmed unused
```
To undo: `ALTER TABLE archive.<name> SET SCHEMA public;`

Leave Migration A live for 1–2 weeks. Then check Sentry and the logs for "relation does not exist" errors.

### 8c. Migration B: drop for good (later)
`supabase/migrations/<timestamp>_drop_archive_schema.sql`:
```sql
DROP SCHEMA archive CASCADE;
```

### 8d. Old copies in `app_documents` (later, one collection at a time)
- `src/lib/pg/pgCollection.ts:27-52` falls back to `app_documents` whenever a `doc_*` table is empty. So for each migrated collection:
  1. Confirm that `doc_<name>` has all the rows.
  2. `DELETE FROM app_documents WHERE collection = '<name>';`
- Do **not** touch `answers`, `useractivities`, `nps_responses` or `mobile_push_tokens` yet. They are still read and written there.
- After the last collection is moved, remove the fallback code in `pgCollection.ts` and the `listAdminUsersFromUsersDocuments` path in `src/lib/admin/adminUsersDataSource.ts`.

Apply with your normal Supabase flow, e.g. `supabase db push`.

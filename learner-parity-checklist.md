# Learner parity (web vs native)

Use this when changing subscription access, exams, practices, or auth so mobile and web stay aligned.

## Authentication

- [ ] Clerk **publishable key** and **Frontend API** (custom domain) match the native app configuration.
- [ ] **`CLERK_AUTHORIZED_PARTIES`** on the server includes every JWT `azp` / origin the mobile apps use (comma-separated). Without this, `verifyToken` rejects mobile session JWTs.
- [ ] **`CLERK_JWT_KEY`** (JWKS public PEM) or **`CLERK_SECRET_KEY`** is set so `getAuthenticatedRequestContext` can verify Bearer tokens (`src/lib/auth/request-auth.ts`).
- [ ] **`GET /api/sessions`** returns **401** when `Authorization: Bearer` is present but invalid; returns **[]** when no auth (browser logged-out behavior).

## Bootstrap & profile

- [ ] **`GET /api/mobile/bootstrap`** returns the same shape as the KMP `MobileBootstrapResponse` (including `publicMetadata` for plan).
- [ ] Plan tier values match Stripe webhook semantics: **`premium`**, **`pro`** (premium plus), **`free`**.

## Practices & exams

- [ ] **`GET /api/practices`** pagination (`page`, `limit`) and item fields remain compatible with `PracticesPageResponse` in shared KMP.
- [ ] **`GET /api/mobile/exams`** pagination and `ExamListItemDto` fields (`id`, `name`, `order`, `isReady`) match `ExamsPageResponse` in shared KMP.

## In-app purchases

- [ ] **Google Play**: `POST /api/mobile/iap/google/verify` — service account JSON, expected package name, product → plan mapping (`MOBILE_IAP_PRODUCT_PLAN_JSON`).
- [ ] **Apple**: `POST /api/mobile/iap/apple/verify` — root CA DER base64 (`APPLE_IAP_ROOT_CA_BASE64`), bundle id, environment; production may require **`APPLE_APP_APPLE_ID`** per Apple’s verifier rules.
- [ ] After IAP verify, **Clerk `publicMetadata.plan`** and **Mongo `users`** (`clerkUserId`) stay in sync with web Stripe updates.

## Stripe / web checkout (reference)

- [ ] Mobile Stripe checkout routes (`/api/mobile/subscription/*`) still align with web entitlements where applicable.

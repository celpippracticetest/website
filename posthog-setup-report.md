<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog analytics were already partially instrumented (`sign_up_completed`, `plan_selected`, `checkout_session_created`, `referral_discount_applied`, `subscription_purchased`, `lead_capture_*`). This session extended coverage with 10 additional server-side events across the cancellation flow, AI chatbot, exam activity, and referral program. The `posthog-js` and `posthog-node` packages were installed. Environment variables `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` were confirmed and updated in `.env.local`. Client-side PostHog is initialized via `instrumentation-client.ts` (Next.js 15.3+ approach). Server-side events use the existing `getPostHogClient()` helper in `src/lib/posthog-server.ts`.

| Event | Description | File |
|---|---|---|
| `sign_up_completed` | User completes sign-up via Clerk | `src/app/sign-up/[[...rest]]/page.tsx` |
| `plan_selected` | User clicks a plan card to begin checkout | `src/components/pages/plans/PlanCard.tsx` |
| `lead_capture_shown` | Lead capture popup becomes visible | `src/components/lead-capture/LeadCapturePopup.tsx` |
| `lead_capture_dismissed` | User closes lead capture popup without submitting | `src/components/lead-capture/LeadCapturePopup.tsx` |
| `lead_capture_submitted` | User submits email in lead capture popup | `src/components/lead-capture/LeadCapturePopup.tsx` |
| `checkout_session_created` | Stripe checkout session created for a user | `src/app/api/checkout_session/route.ts` |
| `referral_discount_applied` | Referral discount applied during checkout | `src/app/api/checkout_session/route.ts` |
| `subscription_purchased` | Stripe webhook confirms payment received | `src/app/api/stripe/webhook/route.ts` |
| `subscription_deleted` | Stripe webhook confirms subscription fully expired | `src/app/api/stripe/webhook/route.ts` |
| `payment_failed` | Stripe webhook reports invoice payment failure | `src/app/api/stripe/webhook/route.ts` |
| `subscription_cancelled` | User confirms subscription cancellation | `src/app/api/users/cancel-subscription/route.ts` |
| `chatbot_message_sent` | Authenticated user sends a message to the AI tutor | `src/app/api/chatbot/route.ts` |
| `chatbot_limit_reached` | Free/guest user hits their daily chatbot message limit | `src/app/api/chatbot/route.ts` |
| `exam_answer_submitted` | User submits a listening/reading exam answer | `src/app/api/exams/answers/route.ts` |
| `writing_answer_submitted` | Premium user submits a writing answer for AI scoring | `src/app/api/exams/answers/writing/route.ts` |
| `referral_code_created` | User generates a new referral code | `src/app/api/users/create-referral-code/route.ts` |
| `referral_signup_completed` | New user signs up via a referral code | `src/app/api/referrals/process-signup/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/332784/dashboard/1334657
- **Signup to Purchase Conversion Funnel** (4-step funnel): https://us.posthog.com/project/332784/insights/XaR73W6X
- **Subscription Health: Purchases vs Cancellations vs Churn** (weekly trend): https://us.posthog.com/project/332784/insights/XsYDHVUw
- **Chatbot Engagement: Usage vs Limit Hits** (daily trend, upgrade signal): https://us.posthog.com/project/332784/insights/CrTaxS20
- **Referral Program Performance** (weekly funnel: codes → signups → discounts): https://us.posthog.com/project/332784/insights/7cxk0tYd
- **User Engagement: Signups & Exam Activity** (daily trend): https://us.posthog.com/project/332784/insights/teNE6tum

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>

-- Dedicated document tables replacing app_documents partitions.
-- Shape matches app_documents rows without the collection discriminator.

DO $$
DECLARE
  names text[] := ARRAY[
    'account_access_signals',
    'account_deletion_flow_events',
    'account_deletion_surveys',
    'account_device_restrictions',
    'blog_target_keywords',
    'cancellation_flow_events',
    'cancellation_surveys',
    'checkouts',
    'ga_user_attribution',
    'home_ab_events',
    'homepageHeroSchedules',
    'internalLinks',
    'leadCaptureConfig',
    'leadCaptureLeads',
    'league_group_counters',
    'league_groups',
    'league_raffle_winners',
    'league_seasons',
    'leagues',
    'marketing_assets',
    'messageCounts',
    'onboarding',
    'onboarding_new_results',
    'onboarding_results',
    'partnerCommissions',
    'partnerProgramSettings',
    'partners',
    'paypal_subscription_grants',
    'paypal_subscription_pending',
    'plans',
    'pricing_ab_events',
    'profession_pages',
    'referralCodes',
    'referralInvitations',
    'referralRewards',
    'refundRequests',
    'reminderEmailConfigs',
    'stripe_balance_transactions',
    'stripe_customers',
    'stripe_invoices',
    'stripe_prices',
    'stripe_subscriptions',
    'stripe_sync_state',
    'tasks',
    'telegram_links',
    'telegram_linking_tokens',
    'user_activity',
    'user_attribution_events',
    'user_league_points',
    'useractivityreminderdispatchlocks',
    'useractivityreminderstats',
    'users',
    'userwords',
    'userwordstudyactivities',
    'withdrawalRequests',
    'worddetails',
    'abandonedCartEmailConfigs',
    'nurtureEmailConfigs'
  ];
  n text;
  tbl text;
  suffix text;
BEGIN
  FOREACH n IN ARRAY names LOOP
    suffix := lower(regexp_replace(n, '[^a-zA-Z0-9]+', '_', 'g'));
    suffix := trim(both '_' from suffix);
    suffix := left(suffix, 50);
    tbl := 'doc_' || suffix;
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (
         mongo_id text PRIMARY KEY,
         body jsonb NOT NULL,
         updated_at timestamptz NOT NULL DEFAULT now()
       )',
      tbl
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (updated_at DESC)',
      tbl || '_updated_at_idx',
      tbl
    );
  END LOOP;
END $$;

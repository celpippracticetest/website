-- ROAS by campaign/channel across Google Ads, Meta, Reddit, etc.
-- Project: celpip-d8f02
-- GA4 export dataset: analytics_533185817 (default name = analytics_<PROPERTY_ID> for property 533185817)
--
-- GA4 daily tables in this dataset (examples):
--   events_YYYYMMDD          — purchases, params, traffic_source (used here)
--   pseudonymous_users_*     — user-level rollups (not used in this view)
--   users_*                  — user export (not used in this view)
--
-- Usage:
-- 0) If `ad_spend_daily` has no schema or is missing, run FIRST:
--      sql/bigquery/00_ad_spend_daily_ddl.sql
-- 1) Load rows into `ad_spend_daily` (columns: spend_date, platform, source, medium, campaign, spend).
--    Use lowercase source/medium where possible so joins match GA4 revenue keys.
-- 2) Run this file to create/update the Looker Studio-ready view.
--
-- If your GA4 link used a custom dataset id (e.g. analytics_celpip), replace
-- `analytics_533185817` everywhere below.

CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_campaign_roas_daily` AS
WITH purchase_events AS (
  SELECT
    PARSE_DATE('%Y%m%d', event_date) AS date,
    -- Priority: explicit attribution params -> UTM params -> GA defaults.
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'attribution_source'), ''),
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'utm_source'), ''),
      NULLIF(collected_traffic_source.manual_source, ''),
      NULLIF(traffic_source.source, ''),
      '(direct)'
    ) AS source,
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'attribution_medium'), ''),
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'utm_medium'), ''),
      NULLIF(collected_traffic_source.manual_medium, ''),
      '(none)'
    ) AS medium,
    LOWER(TRIM(COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'attribution_campaign'), ''),
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'utm_campaign'), ''),
      NULLIF(collected_traffic_source.manual_campaign_name, ''),
      '(not set)'
    ))) AS campaign,
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'purchase_type'), ''),
      'first_purchase'
    ) AS purchase_type,
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'skill_type'), ''),
      'General'
    ) AS skill_type,
    COALESCE(
      ecommerce.purchase_revenue,
      (SELECT ep.value.double_value FROM UNNEST(event_params) ep WHERE ep.key = 'value'),
      CAST((SELECT ep.value.int_value FROM UNNEST(event_params) ep WHERE ep.key = 'value') AS NUMERIC),
      0
    ) AS revenue,
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'currency'), ''),
      'CAD'
    ) AS currency,
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'transaction_id'), ''),
      CONCAT(user_pseudo_id, '-', event_timestamp)
    ) AS transaction_id
  FROM `celpip-d8f02.analytics_533185817.events_*`
  WHERE event_name = 'purchase'
),
revenue_daily AS (
  -- Roll up revenue to the same grain as spend (date + source + medium + campaign only).
  -- Do NOT group by purchase_type / skill_type here: spend has no those dimensions, so extra
  -- revenue groups would fan out the join and duplicate spend (ROAS looks 0 or nonsensical).
  SELECT
    date,
    LOWER(source) AS source,
    LOWER(medium) AS medium,
    campaign,
    ANY_VALUE(currency) AS currency,
    COUNT(DISTINCT transaction_id) AS purchases,
    SUM(revenue) AS revenue
  FROM purchase_events
  GROUP BY date, LOWER(source), LOWER(medium), campaign
),
spend_daily AS (
  -- Table: ad_spend_daily — see 00_ad_spend_daily_ddl.sql (column spend_date, not reserved `date`)
  SELECT
    spend_date AS date,
    LOWER(source) AS source,
    LOWER(medium) AS medium,
    LOWER(TRIM(campaign)) AS campaign,
    platform,
    spend
  FROM `celpip-d8f02.analytics_533185817.ad_spend_daily`
),
combined AS (
  SELECT
    COALESCE(s.date, r.date) AS date,
    COALESCE(s.platform, 'unattributed') AS platform,
    COALESCE(s.source, r.source, '(direct)') AS source,
    COALESCE(s.medium, r.medium, '(none)') AS medium,
    COALESCE(s.campaign, r.campaign, '(not set)') AS campaign,
    IFNULL(s.spend, 0) AS spend,
    IFNULL(r.purchases, 0) AS purchases,
    IFNULL(r.revenue, 0) AS revenue,
    IFNULL(r.currency, 'CAD') AS currency
  FROM spend_daily s
  FULL OUTER JOIN revenue_daily r
    ON s.date = r.date
   AND s.source = r.source
   AND s.medium = r.medium
   AND s.campaign = r.campaign
)
SELECT
  date,
  platform,
  source,
  medium,
  campaign,
  spend,
  purchases,
  revenue,
  currency,
  SAFE_DIVIDE(revenue, NULLIF(spend, 0)) AS roas,
  SAFE_DIVIDE(spend, NULLIF(purchases, 0)) AS cpa,
  revenue - spend AS gross_margin_after_ads
FROM combined;

-- Optional: if you do not have a unified ad_spend table yet, build one like this:
--
-- CREATE OR REPLACE TABLE `celpip-d8f02.analytics_533185817.ad_spend_daily` AS
-- SELECT spend_date, 'google_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_533185817.google_ads_campaign_spend_daily`
-- UNION ALL
-- SELECT spend_date, 'meta_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_533185817.meta_ads_campaign_spend_daily`
-- UNION ALL
-- SELECT spend_date, 'reddit_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_533185817.reddit_ads_campaign_spend_daily`;

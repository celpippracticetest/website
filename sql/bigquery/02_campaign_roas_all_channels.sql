-- ROAS by campaign/channel across Google Ads, Meta, Reddit, etc.
-- Project: celpip-d8f02
-- GA4 export dataset: analytics_celpip
--
-- Usage:
-- 1) Set up a unified spend table with columns:
--    date DATE, platform STRING, source STRING, medium STRING, campaign STRING, spend NUMERIC
-- 2) Replace `analytics_celpip.ad_spend_daily` below with your spend table name.
-- 3) Run this file to create/update a Looker Studio-ready view.

CREATE OR REPLACE VIEW `celpip-d8f02.analytics_celpip.v_campaign_roas_daily` AS
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
    COALESCE(
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'attribution_campaign'), ''),
      NULLIF((SELECT ep.value.string_value FROM UNNEST(event_params) ep WHERE ep.key = 'utm_campaign'), ''),
      NULLIF(collected_traffic_source.manual_campaign_name, ''),
      '(not set)'
    ) AS campaign,
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
  FROM `celpip-d8f02.analytics_celpip.events_*`
  WHERE event_name = 'purchase'
),
revenue_daily AS (
  SELECT
    date,
    LOWER(source) AS source,
    LOWER(medium) AS medium,
    campaign,
    purchase_type,
    skill_type,
    currency,
    COUNT(DISTINCT transaction_id) AS purchases,
    SUM(revenue) AS revenue
  FROM purchase_events
  GROUP BY 1,2,3,4,5,6,7
),
spend_daily AS (
  -- Expected schema:
  -- date DATE, platform STRING, source STRING, medium STRING, campaign STRING, spend NUMERIC
  SELECT
    date,
    LOWER(source) AS source,
    LOWER(medium) AS medium,
    campaign,
    platform,
    spend
  FROM `celpip-d8f02.analytics_celpip.ad_spend_daily`
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
-- CREATE OR REPLACE TABLE `celpip-d8f02.analytics_celpip.ad_spend_daily` AS
-- SELECT date, 'google_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_celpip.google_ads_campaign_spend_daily`
-- UNION ALL
-- SELECT date, 'meta_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_celpip.meta_ads_campaign_spend_daily`
-- UNION ALL
-- SELECT date, 'reddit_ads' AS platform, LOWER(source) AS source, LOWER(medium) AS medium, campaign, spend
-- FROM `celpip-d8f02.analytics_celpip.reddit_ads_campaign_spend_daily`;

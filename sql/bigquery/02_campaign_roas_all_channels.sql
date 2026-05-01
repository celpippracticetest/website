-- Campaign-level ROAS: all rows in `ad_spend_daily` (Google, Meta, Microsoft/Bing, Reddit, …).
-- Prerequisites:
--   1) Run 00b_migrate_add_campaign_id.sql if ad_spend_daily existed without campaign_id
--   2) Load spend via tooling/google-ads-spend-to-bq.js, meta-ads-spend-to-bq.js, ad-spend-csv-to-bq.js, etc.
--   3) In BigQuery, verify GA4 `events_*` have `collected_traffic_source`:
--        `SELECT collected_traffic_source FROM `...events_*` LIMIT 1`
--      If missing, only the event_params 'campaign' fallback is used.
--
-- Join: `ad_spend_daily.campaign_id` must match `manual_campaign_id` and/or `event_params.campaign`
-- (set **`utm_id`** on ads to that id for every network). See docs/multichannel-ad-spend.md.
-- Purchase revenue: `ecommerce.purchase_revenue` and `event_params` value (double/int).

-- Daily grain (spend + purchases). Used by sql/bigquery/03_campaign_roas_by_campaign.sql.
-- Events look back 540 days; extend the suffix filter if you need a longer join window.
CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_campaign_roas_daily` AS
WITH spend_d AS (
  SELECT
    a.spend_date AS `date`,
    a.platform,
    COALESCE(NULLIF(TRIM(a.source), ''), 'unknown') AS source,
    COALESCE(NULLIF(TRIM(a.medium), ''), 'unknown') AS medium,
    a.campaign,
    a.campaign_id,
    SUM(a.spend) AS spend
  FROM `celpip-d8f02.analytics_533185817.ad_spend_daily` a
  GROUP BY 1, 2, 3, 4, 5, 6
),
pur_d AS (
  SELECT
    DATE(TIMESTAMP_MICROS(e.event_timestamp), 'America/Vancouver') AS d,
    COALESCE(
      e.collected_traffic_source.manual_campaign_id,
      (SELECT value.string_value
       FROM UNNEST(e.event_params) ep
       WHERE ep.key = 'campaign' LIMIT 1
      )
    ) AS campaign_id,
    COUNTIF(e.event_name = 'purchase') AS purchases,
    SUM(
      COALESCE(
        e.ecommerce.purchase_revenue,
        (SELECT value.double_value
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' LIMIT 1
        ),
        (SELECT CAST(value.int_value AS FLOAT64)
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' AND value.int_value IS NOT NULL
         LIMIT 1
        )
      )
    ) AS revenue
  FROM `celpip-d8f02.analytics_533185817.events_*` e
  WHERE e._TABLE_SUFFIX >= FORMAT_DATE(
    '%Y%m%d', DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 540 DAY)
  )
    AND e.event_name = 'purchase'
  GROUP BY 1, 2
)
SELECT
  COALESCE(s.date, p.d) AS `date`,
  COALESCE(s.platform, '(purchase_only)') AS platform,
  COALESCE(s.source, '(n/a)') AS source,
  COALESCE(s.medium, '(n/a)') AS medium,
  COALESCE(s.campaign, '(no spend row)') AS campaign,
  COALESCE(s.campaign_id, p.campaign_id) AS campaign_id,
  COALESCE(s.spend, 0) AS spend,
  COALESCE(p.purchases, 0) AS purchases,
  COALESCE(p.revenue, 0) AS revenue,
  'CAD' AS currency
FROM spend_d s
FULL OUTER JOIN pur_d p
  ON s.date = p.d
  AND s.campaign_id = p.campaign_id;

CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_campaign_roas_by_campaign_id_last_30d` AS
WITH spend AS (
  SELECT
    platform,
    campaign_id,
    ANY_VALUE(campaign) AS campaign,
    SUM(spend) AS spend
  FROM `celpip-d8f02.analytics_533185817.ad_spend_daily`
  WHERE spend_date BETWEEN
      DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
      AND CURRENT_DATE('America/Vancouver')
    AND campaign_id IS NOT NULL
  GROUP BY platform, campaign_id
),
purchases AS (
  SELECT
    COALESCE(
      e.collected_traffic_source.manual_campaign_id,
      (SELECT value.string_value
       FROM UNNEST(e.event_params) ep
       WHERE ep.key = 'campaign' LIMIT 1
      )
    ) AS campaign_id,
    COUNTIF(e.event_name = 'purchase') AS purchase_events,
    SUM(
      COALESCE(
        e.ecommerce.purchase_revenue,
        (SELECT value.double_value
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' LIMIT 1
        ),
        (SELECT CAST(value.int_value AS FLOAT64)
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' AND value.int_value IS NOT NULL
         LIMIT 1
        )
      )
    ) AS revenue
  FROM `celpip-d8f02.analytics_533185817.events_*` e
  WHERE e._TABLE_SUFFIX
    BETWEEN FORMAT_DATE(
      '%Y%m%d', DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
    )
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE('America/Vancouver'))
    AND e.event_name = 'purchase'
  GROUP BY 1
)
SELECT
  s.platform,
  s.campaign,
  s.campaign_id,
  s.spend,
  COALESCE(p.purchase_events, 0) AS purchase_events,
  COALESCE(p.revenue, 0) AS revenue,
  'CAD' AS currency,
  SAFE_DIVIDE(COALESCE(p.revenue, 0), NULLIF(s.spend, 0)) AS roas,
  SAFE_DIVIDE(s.spend, NULLIF(p.purchase_events, 0)) AS cost_per_purchase
FROM spend s
LEFT JOIN purchases p ON s.campaign_id = p.campaign_id;

-- Spend with no joinable purchase row on campaign_id (mismatch, lag, or naming), all platforms
CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_unjoined_ad_spend_last_30d` AS
WITH spend AS (
  SELECT
    platform,
    campaign_id,
    ANY_VALUE(campaign) AS campaign,
    SUM(spend) AS spend
  FROM `celpip-d8f02.analytics_533185817.ad_spend_daily`
  WHERE spend_date BETWEEN
      DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
      AND CURRENT_DATE('America/Vancouver')
    AND campaign_id IS NOT NULL
  GROUP BY platform, campaign_id
),
purchases AS (
  SELECT
    campaign_id,
    TRUE AS has_revenue
  FROM (
    SELECT
      COALESCE(
        e.collected_traffic_source.manual_campaign_id,
        (SELECT value.string_value
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'campaign' LIMIT 1
        )
      ) AS campaign_id
    FROM `celpip-d8f02.analytics_533185817.events_*` e
    WHERE e._TABLE_SUFFIX
      BETWEEN FORMAT_DATE(
        '%Y%m%d', DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
      )
      AND FORMAT_DATE('%Y%m%d', CURRENT_DATE('America/Vancouver'))
      AND e.event_name = 'purchase'
  )
  WHERE campaign_id IS NOT NULL
  GROUP BY campaign_id
)
SELECT
  s.platform,
  s.campaign_id,
  s.campaign,
  s.spend
FROM spend s
LEFT JOIN purchases p ON s.campaign_id = p.campaign_id
WHERE p.has_revenue IS NULL
  AND s.spend > 0
  AND s.campaign_id IS NOT NULL;

-- Back-compat: Google Ads only (same shape as before: no platform column)
CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_unjoined_google_ads_spend_last_30d` AS
SELECT
  campaign_id,
  campaign,
  spend
FROM `celpip-d8f02.analytics_533185817.v_unjoined_ad_spend_last_30d`
WHERE platform = 'google_ads';

-- Purchase revenue for campaign_id not present in ad_spend (organic, other channels, or id gap)
CREATE OR REPLACE VIEW `celpip-d8f02.analytics_533185817.v_unattributed_purchase_revenue_last_30d` AS
WITH spend_ids AS (
  SELECT DISTINCT campaign_id
  FROM `celpip-d8f02.analytics_533185817.ad_spend_daily`
  WHERE spend_date BETWEEN
      DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
      AND CURRENT_DATE('America/Vancouver')
    AND campaign_id IS NOT NULL
),
purchases AS (
  SELECT
    COALESCE(
      e.collected_traffic_source.manual_campaign_id,
      (SELECT value.string_value
       FROM UNNEST(e.event_params) ep
       WHERE ep.key = 'campaign' LIMIT 1
      )
    ) AS campaign_id,
    COUNTIF(e.event_name = 'purchase') AS purchase_events,
    SUM(
      COALESCE(
        e.ecommerce.purchase_revenue,
        (SELECT value.double_value
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' LIMIT 1
        ),
        (SELECT CAST(value.int_value AS FLOAT64)
         FROM UNNEST(e.event_params) ep
         WHERE ep.key = 'value' AND value.int_value IS NOT NULL
         LIMIT 1
        )
      )
    ) AS revenue
  FROM `celpip-d8f02.analytics_533185817.events_*` e
  WHERE e._TABLE_SUFFIX
    BETWEEN FORMAT_DATE(
      '%Y%m%d', DATE_SUB(CURRENT_DATE('America/Vancouver'), INTERVAL 30 DAY)
    )
    AND FORMAT_DATE('%Y%m%d', CURRENT_DATE('America/Vancouver'))
    AND e.event_name = 'purchase'
  GROUP BY 1
)
SELECT
  p.campaign_id,
  p.purchase_events,
  p.revenue
FROM purchases p
LEFT JOIN spend_ids s ON p.campaign_id = s.campaign_id
WHERE p.campaign_id IS NOT NULL
  AND p.revenue > 0
  AND s.campaign_id IS NULL;

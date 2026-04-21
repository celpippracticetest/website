-- Run in BigQuery (celpip-d8f02) after GA4 export is linked.
-- Dataset name for this property: analytics_celpip (not the default analytics_<PROPERTY_ID>).

-- 1) Tables present (expect events_YYYYMMDD once export has started)
SELECT table_name, creation_time
FROM `celpip-d8f02.analytics_celpip.INFORMATION_SCHEMA.TABLES`
WHERE table_type = 'BASE TABLE'
ORDER BY creation_time DESC
LIMIT 50;

-- 2) Row count for latest daily shard (adjust suffix after tables exist)
-- SELECT COUNT(*) AS n FROM `celpip-d8f02.analytics_celpip.events_*`
-- WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY));

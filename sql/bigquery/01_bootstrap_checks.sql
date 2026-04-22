-- Run in BigQuery (celpip-d8f02) after GA4 export is linked.
-- Default GA4 export dataset for property 533185817: analytics_533185817
-- (If you linked with a custom name, e.g. analytics_celpip, swap the dataset id below.)

-- 1) Tables present (expect events_YYYYMMDD, users_*, pseudonymous_users_*)
SELECT table_name, creation_time
FROM `celpip-d8f02.analytics_533185817.INFORMATION_SCHEMA.TABLES`
WHERE table_type = 'BASE TABLE'
ORDER BY creation_time DESC
LIMIT 50;

-- 2) Row count for latest daily shard (adjust suffix after tables exist)
-- SELECT COUNT(*) AS n FROM `celpip-d8f02.analytics_533185817.events_*`
-- WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY));

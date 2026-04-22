/**
 * Google Ads Script (Tools > Scripts): load daily campaign cost into BigQuery `ad_spend_daily`.
 *
 * SETUP (once) — REQUIRED or you will see "BigQuery is not defined"
 * 1. Script editor TOP TOOLBAR (not the code menu): click "Advanced APIs" → CHECK
 *    "Google BigQuery" → close the dialog. This defines the global `BigQuery`.
 * 2. In that same Advanced APIs dialog, click "Google API Console" → enable "BigQuery API"
 *    on the Cloud project linked to this script.
 * 3. The Google user who authorizes this script must have BigQuery access on the target
 *    project (e.g. BigQuery Job User + BigQuery Data Editor on the dataset or project).
 * 4. Replace PROJECT_ID, DATASET_ID, TABLE_ID, and optionally BQ_LOCATION below.
 * 5. Authorize the script, then Preview or schedule it (e.g. daily after midnight).
 *
 * OUTPUT ROWS (aligned with sql/bigquery/00_ad_spend_daily_ddl.sql):
 *   spend_date, platform='google_ads', source='google', medium='cpc',
 *   campaign=<campaign name>, spend=<cost from metrics.cost_micros>
 *
 * BEHAVIOR: Rewrites the table with one CREATE OR REPLACE TABLE … AS SELECT (no DELETE).
 * That avoids BigQuery's streaming-buffer rule (DELETE cannot touch rows loaded via
 * streaming insert for ~30 minutes — including older test runs that used insertAll).
 *
 * Docs: https://developers.google.com/google-ads/scripts/docs/integrations/advanced-apis
 *       https://developers.google.com/google-ads/scripts/docs/examples/google-bigquery
 */

// --- BigQuery target (edit to match your project)
var PROJECT_ID = "celpip-d8f02";
var DATASET_ID = "analytics_533185817";
var TABLE_ID = "ad_spend_daily";
/** Job location; must match your dataset region (e.g. US, EU, us-central1). */
var BQ_LOCATION = "US";

/** How many calendar days back from today to refresh (inclusive of today). */
var LOOKBACK_DAYS = 7;

/**
 * Optional: pin Google Ads API version for AdsApp.search (see AdsApp.search optArgs).
 * Example: { apiVersion: 'v23' }
 */
var ADS_SEARCH_OPTIONS = null;

/**
 * Without the Advanced API, `BigQuery` is undefined and every BQ call throws ReferenceError.
 * @see https://developers.google.com/google-ads/scripts/docs/integrations/advanced-apis
 */
function assertBigQueryAdvancedService_() {
  if (typeof BigQuery === "undefined") {
    throw new Error(
      "BigQuery is not enabled for this Google Ads script. Fix: in THIS script editor's top " +
        'toolbar click "Advanced APIs" → enable "Google BigQuery" → close. Then open ' +
        '"Google API Console" from that dialog and enable the "BigQuery API". Save the script, ' +
        "re-authorize if prompted, run again. (Only the user who created the script can change Advanced APIs.)",
    );
  }
}

function main() {
  assertBigQueryAdvancedService_();

  var range = getDateRangeIso_(LOOKBACK_DAYS);
  var start = range.start;
  var end = range.end;

  var gaql =
    "SELECT campaign.id, campaign.name, segments.date, metrics.cost_micros " +
    "FROM campaign " +
    'WHERE segments.date BETWEEN "' +
    start +
    '" AND "' +
    end +
    '" ' +
    'AND campaign.status IN ("ENABLED","PAUSED")';

  var agg = {};
  var search = ADS_SEARCH_OPTIONS
    ? AdsApp.search(gaql, ADS_SEARCH_OPTIONS)
    : AdsApp.search(gaql);

  while (search.hasNext()) {
    var row = search.next();
    var dateStr = row.segments.date;
    var id = String(row.campaign.id);
    var name = row.campaign.name;
    var micros =
      row.metrics.costMicros != null ? Number(row.metrics.costMicros) : 0;
    if (!isFinite(micros)) micros = 0;
    var spend = micros / 1000000;
    var key = dateStr + "\t" + id;
    if (!agg[key]) {
      agg[key] = {
        spend_date: dateStr,
        campaign_id: id,
        campaign: name,
        spend: 0,
      };
    }
    agg[key].spend += spend;
  }

  var rows = [];
  for (var k in agg) {
    if (!Object.prototype.hasOwnProperty.call(agg, k)) continue;
    rows.push(agg[k]);
  }

  Logger.log(
    "Aggregated %s campaign-day rows for %s … %s",
    String(rows.length),
    start,
    end,
  );

  rewriteAdSpendDailyGoogleAdsWindow_(
    PROJECT_ID,
    DATASET_ID,
    TABLE_ID,
    BQ_LOCATION,
    start,
    end,
    rows,
  );
  Logger.log(
    rows.length === 0
      ? "BigQuery: rewrote table (dropped google_ads rows in window only)."
      : "BigQuery: rewrote table with refreshed google_ads rows.",
  );
}

/** @return {{start:string,end:string}} ISO date YYYY-MM-DD (account timezone via Utilities.formatDate) */
function getDateRangeIso_(lookbackDays) {
  var tz = AdsApp.currentAccount().getTimeZone();
  var now = new Date();
  var endStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  var startInstant = new Date(
    now.getTime() - (lookbackDays - 1) * 24 * 60 * 60 * 1000,
  );
  var startStr = Utilities.formatDate(startInstant, tz, "yyyy-MM-dd");
  return { start: startStr, end: endStr };
}

function waitForJobDone_(projectId, jobId, location) {
  var sleepMs = 1000;
  for (var i = 0; i < 200; i++) {
    var status = BigQuery.Jobs.get(projectId, jobId, { location: location });
    if (status.status.state === "DONE") {
      if (status.status.errorResult) {
        throw new Error(status.status.errorResult.message);
      }
      return;
    }
    Utilities.sleep(sleepMs);
    sleepMs = Math.min(Math.floor(sleepMs * 1.5), 8000);
  }
  throw new Error("BigQuery job timed out: " + jobId);
}

/** Escape a value for a BigQuery SQL string literal (single quotes doubled). */
function bqSqlString_(s) {
  return "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
}

function newGoogleAdsRowSelect_(r) {
  var spendLit = String(Number(r.spend.toFixed(6)));
  return (
    "SELECT DATE '" +
    r.spend_date +
    "' AS spend_date, 'google_ads' AS platform, 'google' AS source, 'cpc' AS medium, " +
    bqSqlString_(r.campaign || "") +
    " AS campaign, CAST(" +
    spendLit +
    " AS NUMERIC) AS spend"
  );
}

/**
 * Replace google_ads rows in [start,end] by rebuilding the table (no DELETE — avoids
 * streaming-buffer errors if this table was ever loaded via streaming insert).
 */
function rewriteAdSpendDailyGoogleAdsWindow_(
  projectId,
  datasetId,
  tableId,
  location,
  start,
  end,
  rows,
) {
  var tableFqn = "`" + projectId + "." + datasetId + "." + tableId + "`";
  var keepSql =
    "SELECT spend_date, platform, source, medium, campaign, spend FROM " +
    tableFqn +
    " WHERE NOT (platform = 'google_ads' AND spend_date BETWEEN DATE('" +
    start +
    "') AND DATE('" +
    end +
    "'))";

  var branches = ["(" + keepSql + ")"];
  for (var i = 0; i < rows.length; i++) {
    branches.push("(" + newGoogleAdsRowSelect_(rows[i]) + ")");
  }
  var inner = branches.join(" UNION ALL ");
  var sql =
    "CREATE OR REPLACE TABLE " +
    tableFqn +
    " AS SELECT * FROM (" +
    inner +
    ") AS _rewritten";

  var job = {
    configuration: {
      query: {
        query: sql,
        useLegacySql: false,
      },
    },
    jobReference: {
      projectId: projectId,
      location: location,
    },
  };

  var submitted = BigQuery.Jobs.insert(job, projectId);
  var jobId = submitted.jobReference.jobId;
  var loc = submitted.jobReference.location || location;
  waitForJobDone_(projectId, jobId, loc);
}

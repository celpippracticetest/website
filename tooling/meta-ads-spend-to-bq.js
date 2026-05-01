/**
 * Load Meta (Facebook/Instagram) campaign spend into BigQuery `ad_spend_daily` (meta_ads rows).
 *
 * Uses Marketing API insights at campaign level, daily breakdown.
 *
 * Prereqs:
 * - Meta: META_ACCESS_TOKEN (long-lived user or system token with ads_read),
 *   META_AD_ACCOUNT_ID (digits only, or act_123… — dashes stripped).
 * - Optional: META_UTM_SOURCE (default `facebook`), META_UTM_MEDIUM (default `paid_social`)
 *   — set these to match GA4 session source/medium from your landing UTMs.
 * - BigQuery: same service account env as tooling/google-ads-spend-to-bq.js
 *
 * Run:
 *   node tooling/meta-ads-spend-to-bq.js
 *   node tooling/meta-ads-spend-to-bq.js --days=14
 *   node tooling/meta-ads-spend-to-bq.js --from=2026-04-01 --to=2026-04-30
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v21.0";
const BQ_JOBS_URL = (projectId) =>
  `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/jobs`;

const DEFAULT_SA = path.join(__dirname, "..", "secrets", "gcp-bq-mcp-sa.json");

function parseArgs(argv) {
  const out = { days: 7, from: null, to: null };
  for (const a of argv.slice(2)) {
    const m = /^--(\w+)=(.+)$/.exec(a);
    if (!m) continue;
    if (m[1] === "days") out.days = Math.max(1, Math.min(366, parseInt(m[2], 10) || 7));
    if (m[1] === "from") out.from = m[2].trim();
    if (m[1] === "to") out.to = m[2].trim();
  }
  return out;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10);
}

function dateRange(args) {
  if (args.from && args.to) {
    return { start: args.from, end: args.to };
  }
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (args.days - 1));
  return { start: fmtDate(start), end: fmtDate(end) };
}

function normalizePrivateKey(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function readServiceAccountJson() {
  const candidates = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    process.env.ANALYTICS_CREDENTIALS_FILE,
    DEFAULT_SA,
  ].filter(Boolean);
  for (const p of candidates) {
    const abs = path.resolve(String(p));
    if (!fs.existsSync(abs)) continue;
    try {
      const j = JSON.parse(fs.readFileSync(abs, "utf8"));
      const email = String(j.client_email || "").trim();
      const privateKey = normalizePrivateKey(j.private_key);
      if (email && privateKey) return { email, privateKey, file: abs };
    } catch {
      /* continue */
    }
  }
  return null;
}

function sqlStringLiteral(s) {
  return `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function metaAccountPath() {
  let id = (process.env.META_AD_ACCOUNT_ID || "").trim().replace(/-/g, "");
  if (!id) throw new Error("Missing META_AD_ACCOUNT_ID (numeric ad account id).");
  if (!id.startsWith("act_")) id = `act_${id}`;
  return id;
}

function getMetaConfig() {
  const token = (process.env.META_ACCESS_TOKEN || "").trim();
  if (!token) throw new Error("Missing META_ACCESS_TOKEN.");
  const source = (process.env.META_UTM_SOURCE || "facebook").trim() || "facebook";
  const medium = (process.env.META_UTM_MEDIUM || "paid_social").trim() || "paid_social";
  return { token, source, medium };
}

async function getBqAccessToken(sa) {
  const { JWT } = require("google-auth-library");
  const client = new JWT({
    email: sa.email,
    key: sa.privateKey,
    scopes: ["https://www.googleapis.com/auth/bigquery"],
  });
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("BigQuery: failed to get access token from service account.");
  return token.token;
}

async function runBqQuery(projectId, location, accessToken, query) {
  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const body = {
    configuration: {
      query: {
        query,
        useLegacySql: false,
      },
    },
    jobReference: {
      projectId,
      location: location || "US",
    },
  };
  const res = await fetch(BQ_JOBS_URL(projectId), {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  /** @type {any} */
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`BigQuery job insert failed: ${j.error?.message || JSON.stringify(j)}`);
  }
  const jobId = j.jobReference?.jobId;
  const loc = j.jobReference?.location || location || "US";
  if (!jobId) throw new Error("BigQuery: no job id returned.");

  const statusUrl = `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/jobs/${encodeURIComponent(jobId)}?location=${encodeURIComponent(loc)}`;

  for (let i = 0; i < 120; i++) {
    const st = await fetch(statusUrl, { headers: authHeaders });
    const sj = await st.json();
    if (sj.status?.state === "DONE") {
      if (sj.status.errorResult) {
        throw new Error(`BigQuery job error: ${sj.status.errorResult.message}`);
      }
      return sj;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("BigQuery job timed out waiting for DONE.");
}

/**
 * @param {string} start YYYY-MM-DD
 * @param {string} end YYYY-MM-DD
 * @returns {Promise<Array<{ spend_date: string, campaign: string, campaign_id: string, spend: number }>>}
 */
async function fetchMetaInsights(start, end) {
  const { token } = getMetaConfig();
  const account = metaAccountPath();
  const timeRange = encodeURIComponent(JSON.stringify({ since: start, until: end }));
  const fields =
    "campaign_id,campaign_name,spend,date_start,date_stop,account_currency";
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/${account}/insights?access_token=${encodeURIComponent(
    token,
  )}&level=campaign&time_increment=1&fields=${fields}&time_range=${timeRange}&limit=500`;

  /** @type {Map<string, { spend_date: string, campaign: string, campaign_id: string, spend: number }>} */
  const byKey = new Map();

  while (url) {
    const res = await fetch(url);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = j?.error?.message || JSON.stringify(j) || res.status;
      throw new Error(`Meta insights failed: ${msg}`);
    }
    const data = Array.isArray(j.data) ? j.data : [];
    for (const row of data) {
      const spendDate = String(row.date_start || row.date_stop || "").slice(0, 10);
      const cid = String(row.campaign_id || "").trim();
      const name = String(row.campaign_name || cid || "unknown").trim();
      const spend = parseFloat(String(row.spend || "0")) || 0;
      if (!spendDate || !cid) continue;
      const key = `${spendDate}\t${cid}`;
      const prev = byKey.get(key);
      if (prev) {
        prev.spend += spend;
      } else {
        byKey.set(key, { spend_date: spendDate, campaign: name, campaign_id: cid, spend });
      }
    }
    const next = j.paging && j.paging.next ? String(j.paging.next) : "";
    url = next || "";
  }

  return Array.from(byKey.values());
}

async function main() {
  const args = parseArgs(process.argv);
  const { start, end } = dateRange(args);
  const { source, medium } = getMetaConfig();
  const sa = readServiceAccountJson();
  if (!sa) {
    throw new Error(
      "No BigQuery service account JSON found. Set GOOGLE_APPLICATION_CREDENTIALS or place secrets/gcp-bq-mcp-sa.json",
    );
  }

  const projectId = (process.env.BIGQUERY_PROJECT || "celpip-d8f02").trim();
  const dataset = (process.env.BIGQUERY_ANALYTICS_DATASET || "analytics_533185817").trim();
  const location = (process.env.BIGQUERY_LOCATION || "US").trim();
  const tableFqn = `\`${projectId}.${dataset}.ad_spend_daily\``;

  console.log(`Meta Ads insights: ${start} … ${end}`);
  const list = await fetchMetaInsights(start, end);
  console.log(`Aggregated rows: ${list.length}`);

  if (list.length === 0) {
    console.log("No insight rows; skipping BigQuery write.");
    return;
  }

  const valueRows = list
    .map(
      (r) =>
        `(DATE ${sqlStringLiteral(r.spend_date)}, 'meta_ads', ${sqlStringLiteral(
          source,
        )}, ${sqlStringLiteral(medium)}, ${sqlStringLiteral(r.campaign)}, ${sqlStringLiteral(
          r.campaign_id,
        )}, CAST(${Number(r.spend.toFixed(6))} AS NUMERIC))`,
    )
    .join(",\n    ");

  const sql = `
BEGIN
  DELETE FROM ${tableFqn}
  WHERE platform = 'meta_ads'
    AND spend_date BETWEEN DATE('${start}') AND DATE('${end}');
  INSERT INTO ${tableFqn} (spend_date, platform, source, medium, campaign, campaign_id, spend)
  VALUES
    ${valueRows};
END;
`;

  const bqToken = await getBqAccessToken(sa);
  await runBqQuery(projectId, location, bqToken, sql);
  console.log(`BigQuery: merged meta_ads spend into ${projectId}.${dataset}.ad_spend_daily`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});

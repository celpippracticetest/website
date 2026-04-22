/**
 * Load Google Ads campaign cost into BigQuery `ad_spend_daily` (google_ads rows).
 *
 * Prereqs:
 * - Same Google Ads API env as CMS quick report: GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN,
 *   GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN
 *   (or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)
 * - Optional: GOOGLE_ADS_LOGIN_CUSTOMER_ID (MCC) if you authenticate via manager.
 * - BigQuery: service account JSON with BigQuery Job User + Data Editor (or roles that can run DML).
 *   Set GOOGLE_APPLICATION_CREDENTIALS or ANALYTICS_CREDENTIALS_FILE, or default secrets/gcp-bq-mcp-sa.json
 * - Optional: BIGQUERY_PROJECT (default celpip-d8f02), BIGQUERY_ANALYTICS_DATASET (default analytics_533185817)
 *
 * Run from repo root:
 *   node tooling/google-ads-spend-to-bq.js
 *   node tooling/google-ads-spend-to-bq.js --days=30
 *   node tooling/google-ads-spend-to-bq.js --from=2026-04-01 --to=2026-04-20
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ADS_API_BASE_URL =
  process.env.GOOGLE_ADS_API_VERSION || "https://googleads.googleapis.com/v18";
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

function getAdsConfig() {
  const customerId = (process.env.GOOGLE_ADS_CUSTOMER_ID || "").trim().replace(/-/g, "");
  const developerToken = (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim();
  const clientId =
    (process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret =
    (process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken =
    (process.env.GOOGLE_ADS_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || "").trim();
  const loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || "")
    .trim()
    .replace(/-/g, "");
  if (!customerId || !developerToken || !clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google Ads env: GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, " +
        "GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_REFRESH_TOKEN " +
        "(or GOOGLE_* equivalents).",
    );
  }
  return { customerId, developerToken, clientId, clientSecret, refreshToken, loginCustomerId };
}

async function refreshAdsAccessToken(cfg) {
  const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.access_token) {
    throw new Error(`Google Ads OAuth failed: ${j.error || res.status}`);
  }
  return String(j.access_token);
}

async function searchStreamAds(cfg, accessToken, query) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "developer-token": cfg.developerToken,
    ...(cfg.loginCustomerId ? { "login-customer-id": cfg.loginCustomerId } : {}),
  };
  const res = await fetch(
    `${GOOGLE_ADS_API_BASE_URL}/customers/${cfg.customerId}/googleAds:searchStream`,
    { method: "POST", headers, body: JSON.stringify({ query }) },
  );
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = payload?.error?.message || JSON.stringify(payload) || res.status;
    throw new Error(`Google Ads searchStream failed: ${msg}`);
  }
  const chunks = Array.isArray(payload) ? payload : [];
  return chunks.flatMap((c) => (Array.isArray(c.results) ? c.results : []));
}

function costMicros(row) {
  const m = row?.metrics || {};
  const v = m.costMicros ?? m.cost_micros ?? 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sqlStringLiteral(s) {
  return `'${String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
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

async function main() {
  const args = parseArgs(process.argv);
  const { start, end } = dateRange(args);
  const ads = getAdsConfig();
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

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      segments.date,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${start}' AND '${end}'
      AND campaign.status IN ('ENABLED', 'PAUSED')
  `;

  console.log(`Google Ads: ${start} … ${end}`);
  const adsToken = await refreshAdsAccessToken(ads);
  const rows = await searchStreamAds(ads, adsToken, query);

  /** @type {Map<string, { spend_date: string, campaign: string, spend: number }>} */
  const byKey = new Map();
  for (const row of rows) {
    const date = row?.segments?.date || "";
    const name = row?.campaign?.name || `id_${row?.campaign?.id || "unknown"}`;
    const micros = costMicros(row);
    const spend = micros / 1_000_000;
    const key = `${date}\t${name}`;
    const prev = byKey.get(key);
    if (prev) prev.spend += spend;
    else byKey.set(key, { spend_date: date, campaign: name, spend });
  }

  const list = Array.from(byKey.values());
  console.log(`Aggregated rows: ${list.length}`);

  if (list.length === 0) {
    console.log("No cost rows; skipping BigQuery write.");
    return;
  }

  const valueRows = list
    .map(
      (r) =>
        `(DATE ${sqlStringLiteral(r.spend_date)}, 'google_ads', 'google', 'cpc', ${sqlStringLiteral(r.campaign)}, CAST(${r.spend} AS NUMERIC))`,
    )
    .join(",\n    ");

  const sql = `
BEGIN
  DELETE FROM ${tableFqn}
  WHERE platform = 'google_ads'
    AND spend_date BETWEEN DATE('${start}') AND DATE('${end}');
  INSERT INTO ${tableFqn} (spend_date, platform, source, medium, campaign, spend)
  VALUES
    ${valueRows};
END;
`;

  const bqToken = await getBqAccessToken(sa);
  await runBqQuery(projectId, location, bqToken, sql);
  console.log(`BigQuery: merged google_ads spend into ${projectId}.${dataset}.ad_spend_daily`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});

/**
 * Load ad spend from a CSV into BigQuery `ad_spend_daily` for any platform (Bing, Reddit, TikTok, …).
 *
 * CSV header (required columns, order flexible):
 *   spend_date,platform,source,medium,campaign,campaign_id,spend
 *
 * - spend_date: YYYY-MM-DD
 * - platform: e.g. microsoft_ads, reddit_ads (must match sql/bigquery/00_ad_spend_daily_ddl.sql)
 * - source / medium: match your GA4 UTMs (e.g. bing + cpc, reddit + paid_social)
 * - campaign: display name
 * - campaign_id: same value you pass as utm_id for joins to purchases
 * - spend: decimal number (account currency; CAD for CPT)
 *
 * Deletes existing rows for the same platform and date range (min–max dates in file) then inserts.
 *
 * Run:
 *   node tooling/ad-spend-csv-to-bq.js --file=./exports/bing-apr.csv --platform=microsoft_ads
 *
 * If --platform is omitted, each row’s `platform` column is used (batch mixed export).
 */

const path = require("path");
const fs = require("fs");
const readline = require("readline");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const BQ_JOBS_URL = (projectId) =>
  `https://bigquery.googleapis.com/bigquery/v2/projects/${encodeURIComponent(projectId)}/jobs`;

const DEFAULT_SA = path.join(__dirname, "..", "secrets", "gcp-bq-mcp-sa.json");

function parseArgs(argv) {
  const out = { file: null, platform: null };
  for (const a of argv.slice(2)) {
    const m = /^--(\w+)=(.+)$/.exec(a);
    if (!m) continue;
    if (m[1] === "file") out.file = m[2].trim();
    if (m[1] === "platform") out.platform = m[2].trim() || null;
  }
  return out;
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

/** @param {string} line */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if (c === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/**
 * @param {string} absPath
 * @param {string | null} defaultPlatform from --platform=
 */
async function readCsvRows(absPath, defaultPlatform) {
  const rl = readline.createInterface({
    input: fs.createReadStream(absPath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });
  /** @type {string[]} */
  let header = [];
  /** @type {Record<string, string>[]} */
  const rows = [];
  let i = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const cells = parseCsvLine(line);
    if (i === 0) {
      header = cells.map((h) => h.trim().toLowerCase());
      const need = ["spend_date", "source", "medium", "campaign", "campaign_id", "spend"];
      for (const k of need) {
        if (!header.includes(k)) {
          throw new Error(`CSV missing column "${k}". Found: ${header.join(", ")}`);
        }
      }
      if (!defaultPlatform && !header.includes("platform")) {
        throw new Error(
          'CSV missing column "platform" (or pass --platform=microsoft_ads on the command line).',
        );
      }
    } else {
      const rec = {};
      for (let j = 0; j < header.length; j++) {
        rec[header[j]] = cells[j] != null ? String(cells[j]).trim() : "";
      }
      rows.push(rec);
    }
    i++;
  }
  return rows;
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
  if (!args.file) {
    throw new Error("Usage: node tooling/ad-spend-csv-to-bq.js --file=path/to.csv [--platform=microsoft_ads]");
  }
  const abs = path.resolve(args.file);
  if (!fs.existsSync(abs)) throw new Error(`File not found: ${abs}`);

  const sa = readServiceAccountJson();
  if (!sa) {
    throw new Error(
      "No BigQuery service account JSON found. Set GOOGLE_APPLICATION_CREDENTIALS or place secrets/gcp-bq-mcp-sa.json",
    );
  }

  const rawRows = await readCsvRows(abs, args.platform);
  const rows = rawRows.map((r) => ({
    spend_date: r.spend_date.slice(0, 10),
    platform: (args.platform || r.platform || "").trim(),
    source: (r.source || "").trim(),
    medium: (r.medium || "").trim(),
    campaign: (r.campaign || "").trim(),
    campaign_id: (r.campaign_id || "").trim(),
    spend: parseFloat(String(r.spend || "0").replace(/,/g, "")) || 0,
  }));

  for (const r of rows) {
    if (!r.platform) throw new Error("Row missing platform (set CSV column or --platform=…).");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.spend_date)) {
      throw new Error(`Invalid spend_date: ${r.spend_date}`);
    }
  }

  let minD = rows[0].spend_date;
  let maxD = rows[0].spend_date;
  const platforms = new Set();
  for (const r of rows) {
    if (r.spend_date < minD) minD = r.spend_date;
    if (r.spend_date > maxD) maxD = r.spend_date;
    platforms.add(r.platform);
  }

  const projectId = (process.env.BIGQUERY_PROJECT || "celpip-d8f02").trim();
  const dataset = (process.env.BIGQUERY_ANALYTICS_DATASET || "analytics_533185817").trim();
  const location = (process.env.BIGQUERY_LOCATION || "US").trim();
  const tableFqn = `\`${projectId}.${dataset}.ad_spend_daily\``;

  const valueRows = rows
    .map(
      (r) =>
        `(DATE ${sqlStringLiteral(r.spend_date)}, ${sqlStringLiteral(r.platform)}, ${sqlStringLiteral(
          r.source,
        )}, ${sqlStringLiteral(r.medium)}, ${sqlStringLiteral(r.campaign)}, ${
          r.campaign_id ? sqlStringLiteral(r.campaign_id) : "CAST(NULL AS STRING)"
        }, CAST(${Number(r.spend.toFixed(6))} AS NUMERIC))`,
    )
    .join(",\n    ");

  const platformList = Array.from(platforms)
    .map((p) => sqlStringLiteral(p))
    .join(", ");

  const sql = `
BEGIN
  DELETE FROM ${tableFqn}
  WHERE platform IN (${platformList})
    AND spend_date BETWEEN DATE('${minD}') AND DATE('${maxD}');
  INSERT INTO ${tableFqn} (spend_date, platform, source, medium, campaign, campaign_id, spend)
  VALUES
    ${valueRows};
END;
`;

  console.log(`CSV → BQ: ${rows.length} rows, platforms [${[...platforms].join(", ")}], dates ${minD}…${maxD}`);
  const bqToken = await getBqAccessToken(sa);
  await runBqQuery(projectId, location, bqToken, sql);
  console.log(`BigQuery: merged into ${projectId}.${dataset}.ad_spend_daily`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exitCode = 1;
});

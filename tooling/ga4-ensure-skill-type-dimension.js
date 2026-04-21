/**
 * Ensures GA4 event-scoped custom dimension `skill_type` exists (Admin API).
 *
 * Requires the same env as server GA4 Data API, plus Admin API access:
 *   GA4_PROPERTY_ID          numeric property id
 *   ANALYTICS_CLIENT_EMAIL   (or ANALYTICS_CLIENT_ID)
 *   ANALYTICS_PRIVATE_KEY    PEM, \n escaped ok
 *
 * The service account must have at least Editor on the GA4 property
 * (Viewer is not enough for customDimensions.create).
 *
 * Enable **Google Analytics Admin API** on the **GCP project that owns this JWT**
 * (numeric id or `celpip-d8f02`). On `SERVICE_DISABLED`, Google names that project;
 * the script prints the matching Cloud Console **APIs dashboard** link.
 *
 * Usage:  yarn ga4:ensure-skill-dimension
 *      or  node tooling/ga4-ensure-skill-type-dimension.js
 */

const path = require("path");
const fs = require("fs");
const { JWT } = require("google-auth-library");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ADMIN_SCOPE = "https://www.googleapis.com/auth/analytics.edit";
const BASE = "https://analyticsadmin.googleapis.com/v1beta";
const DEFAULT_ANALYTICS_SA_FILE = path.join(
  __dirname,
  "..",
  "secrets",
  "gcp-bq-mcp-sa.json",
);

const GC_APIS_DASHBOARD_FALLBACK_PROJECT = "celpip-d8f02";

function apisDashboardUrl(projectId) {
  const id = String(projectId || GC_APIS_DASHBOARD_FALLBACK_PROJECT).replace(
    /^projects\//,
    "",
  );
  return `https://console.cloud.google.com/apis/dashboard?project=${encodeURIComponent(id)}`;
}

/** GCP project id from SERVICE_DISABLED (consumer / containerInfo), or null. */
function serviceDisabledGcpProjectId(j) {
  const details = j?.error?.details;
  if (!Array.isArray(details)) return null;
  for (const d of details) {
    if (d?.reason !== "SERVICE_DISABLED") continue;
    const consumer = d?.metadata?.consumer;
    if (consumer) return String(consumer).replace(/^projects\//, "");
    const container = d?.metadata?.containerInfo;
    if (container) return String(container).replace(/^projects\//, "");
  }
  return null;
}

function printAdminApiEnableHint(parsedJson, responseText) {
  const gcpProject =
    serviceDisabledGcpProjectId(parsedJson) ||
    (responseText && /project (\d{6,})/i.exec(responseText)?.[1]) ||
    GC_APIS_DASHBOARD_FALLBACK_PROJECT;
  console.error(
    `\nEnable the Google Analytics Admin API on this GCP project (API consumer for your service account key), then retry:\n  ${apisDashboardUrl(gcpProject)}`,
  );
  console.error("\nWait a few minutes after enabling, then retry.");
}

function normalizePrivateKey(raw) {
  if (!raw) return "";
  return String(raw)
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function readServiceAccountFile(filePath) {
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const email = String(j.client_email || "").trim();
    const privateKey = normalizePrivateKey(j.private_key);
    const projectId = String(j.project_id || "").trim();
    if (!email || !privateKey) return null;
    return { email, privateKey, projectId, source: `file:${p}` };
  } catch {
    return null;
  }
}

function resolveAnalyticsCredentials() {
  const preferredProject =
    String(process.env.GTM_PROJECT_ID || "").trim() ||
    String(process.env.GOOGLE_CLOUD_PROJECT || "").trim() ||
    String(process.env.GOOGLE_PROJECT_ID || "").trim() ||
    "celpip-d8f02";

  const candidates = [
    process.env.ANALYTICS_CREDENTIALS_FILE,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    DEFAULT_ANALYTICS_SA_FILE,
  ].filter(Boolean);

  let firstFileCreds = null;
  for (const c of candidates) {
    const creds = readServiceAccountFile(String(c));
    if (!creds) continue;
    if (!firstFileCreds) firstFileCreds = creds;
    if (creds.projectId && creds.projectId === preferredProject) {
      return creds;
    }
  }

  const envEmail =
    process.env.ANALYTICS_CLIENT_EMAIL?.trim() ||
    process.env.ANALYTICS_CLIENT_ID?.trim();
  const envPrivateKey = normalizePrivateKey(process.env.ANALYTICS_PRIVATE_KEY);
  if (envEmail && envPrivateKey) {
    return { email: envEmail, privateKey: envPrivateKey, source: "env" };
  }

  return firstFileCreds;
}

/** @returns {Promise<number>} process exit code */
async function main() {
  const propertyId = String(process.env.GA4_PROPERTY_ID || "").trim();
  const resolved = resolveAnalyticsCredentials();
  const email = resolved?.email || "";
  const privateKey = resolved?.privateKey || "";

  if (!propertyId || !email || !privateKey) {
    console.error(
      "Missing GA4_PROPERTY_ID or analytics credentials. Set ANALYTICS_CLIENT_EMAIL/ANALYTICS_PRIVATE_KEY or provide GOOGLE_APPLICATION_CREDENTIALS / ANALYTICS_CREDENTIALS_FILE.",
    );
    return 1;
  }
  if (!privateKey.includes("BEGIN") || !privateKey.includes("END")) {
    console.error("ANALYTICS_PRIVATE_KEY does not look like a PEM key.");
    return 1;
  }
  if (resolved?.source && resolved.source !== "env") {
    console.log(`Using analytics credentials from ${resolved.source}`);
  }

  const auth = new JWT({
    email,
    key: privateKey,
    scopes: [ADMIN_SCOPE],
  });
  const tokenResponse = await auth.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string" ?
      tokenResponse
    : tokenResponse?.token || tokenResponse?.access_token;
  if (!accessToken) {
    console.error("Could not obtain access token.");
    return 1;
  }

  const parent = `properties/${propertyId}`;
  const listUrl = `${BASE}/${parent}/customDimensions?pageSize=200`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const t = await listRes.text();
    console.error(`List custom dimensions failed (${listRes.status}):`, t);
    try {
      const j = JSON.parse(t);
      const details = j?.error?.details;
      const serviceDisabled =
        Array.isArray(details) &&
        details.some((d) => d?.reason === "SERVICE_DISABLED");
      if (serviceDisabled || /analyticsadmin/.test(t)) {
        printAdminApiEnableHint(j, t);
      }
    } catch {
      /* ignore */
    }
    return 1;
  }
  const listJson = await listRes.json();
  const existing = (listJson.customDimensions || []).some(
    (d) => d.parameterName === "skill_type",
  );
  if (existing) {
    console.log("Custom dimension skill_type already exists. Nothing to do.");
    return 0;
  }

  const createUrl = `${BASE}/${parent}/customDimensions`;
  const body = {
    parameterName: "skill_type",
    displayName: "Skill type",
    description:
      "CELPIP practice skill (Speaking, Writing, Listening, Reading) for Data API reports.",
    scope: "EVENT",
  };
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const createText = await createRes.text();
  if (createRes.ok) {
    console.log("Created custom dimension skill_type:", createText);
    return 0;
  }
  if (createRes.status === 409 || createText.includes("ALREADY_EXISTS")) {
    console.log("Dimension already exists (race or duplicate). OK.");
    return 0;
  }
  console.error(`Create failed (${createRes.status}):`, createText);
  try {
    const j = JSON.parse(createText);
    const details = j?.error?.details;
    const serviceDisabled =
      Array.isArray(details) &&
      details.some((d) => d?.reason === "SERVICE_DISABLED");
    if (serviceDisabled || /analyticsadmin/.test(createText)) {
      printAdminApiEnableHint(j, createText);
    }
  } catch {
    /* ignore */
  }
  if (createRes.status === 403) {
    console.error(
      "\nHint: grant this service account a GA4 role that can edit property config (e.g. Editor), not only Viewer.",
    );
  }
  return 1;
}

async function runAndExit() {
  let code = 1;
  try {
    code = await main();
  } catch (e) {
    console.error(e);
    code = 1;
  }
  // Avoid forced process.exit on Windows; let Node close libuv handles naturally.
  process.exitCode = code;
}

runAndExit();

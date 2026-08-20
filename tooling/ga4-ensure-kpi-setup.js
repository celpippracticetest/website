/**
 * Registers GA4 custom dimensions, custom metrics, and key events used by
 * the CELPIP web KPI catalog (activation, engagement, funnel, reliability).
 *
 * Requires the same env as `ga4-ensure-skill-type-dimension.js`:
 *   GA4_PROPERTY_ID
 *   ANALYTICS_CLIENT_EMAIL + ANALYTICS_PRIVATE_KEY
 *   (or ANALYTICS_CREDENTIALS_FILE / GOOGLE_APPLICATION_CREDENTIALS)
 *
 * Service account needs Editor on the GA4 property.
 * Enable Google Analytics Admin API on the GCP project that owns the JWT.
 *
 * Usage:
 *   node ./tooling/ga4-ensure-kpi-setup.js
 *   node ./tooling/ga4-ensure-kpi-setup.js --login
 *
 * If the service account is Viewer-only, the script opens a browser using the
 * desktop OAuth client in gtm-mcp.json (`http://localhost`).
 */
const path = require("path");
const fs = require("fs");
const http = require("http");
const { exec } = require("child_process");
const { URL } = require("url");
const { JWT } = require("google-auth-library");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ADMIN_SCOPE = "https://www.googleapis.com/auth/analytics.edit";
const BASE_BETA = "https://analyticsadmin.googleapis.com/v1beta";
const BASE_ALPHA = "https://analyticsadmin.googleapis.com/v1alpha";
const DEFAULT_ANALYTICS_SA_FILE = path.join(
  __dirname,
  "..",
  "secrets",
  "gcp-bq-mcp-sa.json",
);
const GC_APIS_DASHBOARD_FALLBACK_PROJECT = "celpip-d8f02";

/** Event-scoped custom dimensions (parameterName max 24 chars). */
const EVENT_DIMENSIONS = [
  {
    parameterName: "module",
    displayName: "Module",
    description: "Listening, Reading, Writing, or Speaking.",
  },
  {
    parameterName: "test_type",
    displayName: "Test type",
    description: "full_mock, module, quiz, or diagnostic.",
  },
  {
    parameterName: "content_group",
    displayName: "Content group",
    description: "wiki, blog, score-guide, product, or pricing.",
  },
  {
    parameterName: "step_name",
    displayName: "Onboarding step",
    description: "Onboarding wizard step name.",
  },
  {
    parameterName: "trigger_source",
    displayName: "Trigger source",
    description: "Paywall, NPS, or promo trigger.",
  },
  {
    parameterName: "exit_reason",
    displayName: "Test exit reason",
    description: "Why a started test was abandoned.",
  },
  {
    parameterName: "error_type",
    displayName: "Error type",
    description: "Audio, AI scoring, or checkout error class.",
  },
  {
    parameterName: "decline_reason",
    displayName: "Decline reason",
    description: "Payment decline reason from checkout/Stripe.",
  },
  {
    parameterName: "skill_type",
    displayName: "Skill type",
    description: "CELPIP skill for Data API reports.",
  },
  {
    parameterName: "is_diagnostic",
    displayName: "Is diagnostic",
    description: "True when the attempt is the first full mock diagnostic.",
  },
  {
    parameterName: "is_free",
    displayName: "Is free",
    description: "Whether the attempt or task was on the free plan.",
  },
  {
    parameterName: "attribution_source",
    displayName: "Attribution source",
    description: "First-touch source used on conversion events.",
  },
  {
    parameterName: "entry_page",
    displayName: "Entry page",
    description: "Original landing page path.",
  },
  {
    parameterName: "cancellation_reason",
    displayName: "Cancellation reason",
    description: "User- or system-selected cancel reason.",
  },
  {
    parameterName: "rating",
    displayName: "AI feedback rating",
    description: "Thumbs up/down or score on ai_feedback_rated.",
  },
  {
    parameterName: "coupon",
    displayName: "Coupon",
    description: "Discount code applied at checkout.",
  },
  {
    parameterName: "cta_location",
    displayName: "CTA location",
    description: "Where a CTA was clicked.",
  },
  {
    parameterName: "method",
    displayName: "Auth method",
    description: "email, google, apple, or facebook.",
  },
  {
    parameterName: "browser",
    displayName: "Browser",
    description: "Browser reported on errors and mic permission.",
  },
  {
    parameterName: "device",
    displayName: "Device",
    description: "Device reported on errors and mic permission.",
  },
  {
    parameterName: "survey_trigger",
    displayName: "Survey trigger",
    description: "NPS / CSAT prompt source.",
  },
  {
    parameterName: "mic_result",
    displayName: "Microphone result",
    description: "granted, denied, or dismissed.",
  },
  {
    parameterName: "promotion_id",
    displayName: "Promotion ID",
    description: "Promo banner identifier.",
  },
  {
    parameterName: "metric_name",
    displayName: "Web vital name",
    description: "LCP, INP, or CLS.",
  },
  {
    parameterName: "from_plan",
    displayName: "From plan",
    description: "Plan before an upgrade or downgrade.",
  },
  {
    parameterName: "to_plan",
    displayName: "To plan",
    description: "Plan after an upgrade or downgrade.",
  },
  {
    parameterName: "direction",
    displayName: "Plan change direction",
    description: "upgrade, downgrade, or lateral.",
  },
  {
    parameterName: "payment_type",
    displayName: "Payment type",
    description: "Card, wallet, or other payment method.",
  },
  {
    parameterName: "explain_source",
    displayName: "Explanation source",
    description: "score_report, practice_review, or ask_ai.",
  },
];

/** User-scoped custom dimensions (must be unique vs event-scoped names). */
const USER_DIMENSIONS = [
  {
    parameterName: "user_plan",
    displayName: "User plan",
    description: "free, plus, premium, or pro.",
  },
  {
    parameterName: "days_until_test_bucket",
    displayName: "Days until test bucket",
    description: "0-13, 14-29, 30-59, 60+, or unknown.",
  },
  {
    parameterName: "target_clb",
    displayName: "Target CLB",
    description: "Self-declared target CLB level.",
  },
  {
    parameterName: "has_test_date",
    displayName: "Has test date",
    description: "true when the user provided a scheduled exam date.",
  },
  // `style` and `pricing_ab_model` already exist as EVENT dimensions on this property.
];

const CUSTOM_METRICS = [
  {
    parameterName: "duration_sec",
    displayName: "Duration sec",
    measurementUnit: "SECONDS",
    description: "Time spent on a test, task, or onboarding.",
  },
  {
    parameterName: "latency_ms",
    displayName: "AI scoring latency ms",
    measurementUnit: "MILLISECONDS",
    description: "Time from AI scoring request to feedback.",
  },
  {
    parameterName: "percent_complete",
    displayName: "Percent complete",
    measurementUnit: "STANDARD",
    description: "Progress when a test is abandoned.",
  },
  {
    parameterName: "estimated_clb",
    displayName: "Estimated CLB",
    measurementUnit: "STANDARD",
    description: "Model-estimated CLB on a completed attempt.",
  },
  {
    parameterName: "days_until_test",
    displayName: "Days until test",
    measurementUnit: "STANDARD",
    description: "Days remaining before the scheduled exam.",
  },
  {
    parameterName: "discount_pct",
    displayName: "Discount percent",
    measurementUnit: "STANDARD",
    description: "Coupon discount depth.",
  },
  {
    parameterName: "hours_to_verify",
    displayName: "Hours to verify email",
    measurementUnit: "STANDARD",
    description: "Hours from signup to email verification.",
  },
  {
    parameterName: "questions_attempted",
    displayName: "Questions attempted",
    measurementUnit: "STANDARD",
    description: "Questions answered on a submitted test.",
  },
  {
    parameterName: "completion_rate",
    displayName: "Attempt completion rate",
    measurementUnit: "STANDARD",
    description: "Share of questions completed on submit.",
  },
  {
    parameterName: "word_count",
    displayName: "Writing word count",
    measurementUnit: "STANDARD",
    description: "Words submitted on a Writing task.",
  },
  {
    parameterName: "mrr_delta",
    displayName: "MRR delta",
    measurementUnit: "STANDARD",
    description: "MRR change on plan_change.",
  },
  {
    parameterName: "days_dormant",
    displayName: "Days dormant",
    measurementUnit: "STANDARD",
    description: "Inactive days before a reactivation session.",
  },
  {
    parameterName: "raw_score",
    displayName: "Raw score",
    measurementUnit: "STANDARD",
    description: "Raw practice or mock score.",
  },
  {
    parameterName: "attempt_number",
    displayName: "Attempt number",
    measurementUnit: "STANDARD",
    description: "Nth attempt of this test.",
  },
  {
    parameterName: "incorrect_count",
    displayName: "Incorrect answer count",
    measurementUnit: "STANDARD",
    description: "Wrong or unanswered questions in a review.",
  },
  {
    parameterName: "question_count",
    displayName: "Question count",
    measurementUnit: "STANDARD",
    description: "Questions in the reviewed section.",
  },
  {
    parameterName: "time_on_feedback_sec",
    displayName: "Time on feedback sec",
    measurementUnit: "SECONDS",
    description: "Time spent reading AI feedback.",
  },
  {
    parameterName: "sections_expanded",
    displayName: "Sections expanded",
    measurementUnit: "STANDARD",
    description: "AI feedback sections the user opened.",
  },
  {
    parameterName: "days_subscribed",
    displayName: "Days subscribed",
    measurementUnit: "STANDARD",
    description: "Tenure at cancel-flow start.",
  },
  {
    parameterName: "mrr_lost",
    displayName: "MRR lost",
    measurementUnit: "STANDARD",
    description: "MRR removed on subscription_cancel.",
  },
  {
    parameterName: "hours_since_pause",
    displayName: "Hours since pause",
    measurementUnit: "STANDARD",
    description: "Hours between abandon and resume.",
  },
];

const KEY_EVENTS = [
  "sign_up",
  "onboarding_complete",
  "test_date_set",
  "target_score_set",
  "practice_test_start",
  "practice_test_complete",
  "practice_test_abandon",
  "diagnostic_test_complete",
  "speaking_task_submit",
  "mic_permission_result",
  "ai_scoring_requested",
  "ai_score_returned",
  "ai_scoring_failed",
  "ai_feedback_rated",
  "score_report_view",
  "explanation_open",
  "paywall_view",
  "begin_checkout",
  "purchase",
  "payment_failed",
  "cancel_reason_submit",
  "subscription_cancel",
  "nps_response",
  "cta_click",
];

/**
 * Funnel ratios (test completion, paywall->purchase, checkout, AI scoring,
 * onboarding) belong in Explorations. GA4 calculated metrics can only
 * reference predefined/custom metrics, not `keyEvents:event_name`.
 */

/** Prefer these if the property is already at the key-event cap. */
const HIGH_PRIORITY_KEY_EVENTS = [
  "subscription_cancel",
  "nps_response",
  "cta_click",
];

/** Noisy or redundant key events we can unmark to free slots. */
const KEY_EVENTS_RELEASABLE = [
  "onboarding_step_complete",
  "diagnostic_test_start",
  "view_item_list",
  "incorrect_answer",
];

const OAUTH_TOKEN_FILE = path.join(__dirname, "..", ".ga4-admin-oauth.json");

function apisDashboardUrl(projectId) {
  const id = String(projectId || GC_APIS_DASHBOARD_FALLBACK_PROJECT).replace(
    /^projects\//,
    "",
  );
  return `https://console.cloud.google.com/apis/dashboard?project=${encodeURIComponent(id)}`;
}

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
    `\nEnable the Google Analytics Admin API on this GCP project, then retry:\n  ${apisDashboardUrl(gcpProject)}`,
  );
}

function isServiceDisabled(json, text) {
  const details = json?.error?.details;
  return (
    (Array.isArray(details) &&
      details.some((d) => d?.reason === "SERVICE_DISABLED")) ||
    /SERVICE_DISABLED|has not been used in project/i.test(text || "")
  );
}

function printEditorGrantHint(propertyId, email) {
  const sa = email || "the analytics service account";
  console.error(`
The Admin API is enabled, but ${sa} can only READ this GA4 property.

Fastest path: rerun with your Editor Google account (desktop OAuth client, http://localhost):
  node ./tooling/ga4-ensure-kpi-setup.js --login

Or grant the service account Editor:
  1. Open GA4 Admin → Property access management
     https://analytics.google.com/analytics/web/#/p${propertyId}/admin/property-settings
  2. Add ${sa} with role Editor
  3. Wait a minute, then rerun: node ./tooling/ga4-ensure-kpi-setup.js
`);
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
  if (!filePath?.trim()) return null;
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    const email = String(j.client_email || "").trim();
    const privateKey = normalizePrivateKey(j.private_key);
    if (!email || !privateKey) return null;
    return { email, privateKey, source: `file:${p}` };
  } catch {
    return null;
  }
}

function resolveAnalyticsCredentials() {
  const candidates = [
    process.env.ANALYTICS_CREDENTIALS_FILE,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    DEFAULT_ANALYTICS_SA_FILE,
  ].filter(Boolean);

  for (const c of candidates) {
    const creds = readServiceAccountFile(String(c));
    if (creds) return creds;
  }

  const envEmail =
    process.env.ANALYTICS_CLIENT_EMAIL?.trim() ||
    process.env.ANALYTICS_CLIENT_ID?.trim();
  const envPrivateKey = normalizePrivateKey(process.env.ANALYTICS_PRIVATE_KEY);
  if (envEmail && envPrivateKey) {
    return { email: envEmail, privateKey: envPrivateKey, source: "env" };
  }
  return null;
}

async function gaFetch(accessToken, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { res, text, json };
}

async function listAll(accessToken, firstUrl, collectionKey) {
  const items = [];
  let url = firstUrl;
  while (url) {
    const { res, json, text } = await gaFetch(accessToken, url);
    if (!res.ok) {
      return { ok: false, status: res.status, text, json, items };
    }
    items.push(...(json[collectionKey] || []));
    const token = json.nextPageToken;
    if (!token) break;
    const sep = firstUrl.includes("?") ? "&" : "?";
    url = `${firstUrl.split("?")[0]}${sep}pageSize=200&pageToken=${encodeURIComponent(token)}`;
  }
  return { ok: true, items };
}

function alreadyExists(status, text) {
  return status === 409 || /ALREADY_EXISTS|already exists/i.test(text || "");
}

function ga4DisplayName(name) {
  return String(name || "")
    .replace(/[^A-Za-z0-9_ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isKeyEventLimit(status, text) {
  return (
    status === 429 &&
    /limit-exceeded|maximum resource limit/i.test(text || "")
  );
}

function loadSavedOauth() {
  try {
    return JSON.parse(fs.readFileSync(OAUTH_TOKEN_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveOauthTokens(client, json) {
  const existing = loadSavedOauth() || {};
  const refreshToken = json.refresh_token || existing.refresh_token;
  if (!refreshToken) return;
  fs.writeFileSync(
    OAUTH_TOKEN_FILE,
    JSON.stringify(
      {
        client_id: client.clientId,
        refresh_token: refreshToken,
        saved_at: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(`Saved OAuth refresh token to ${OAUTH_TOKEN_FILE}`);
}

async function refreshAccessToken(clientId, clientSecret, refreshToken) {
  if (!clientId || !clientSecret || !refreshToken) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    console.warn(
      "OAuth refresh failed:",
      json.error || res.status,
      json.error_description || "",
    );
    return null;
  }
  return json.access_token;
}

async function accessTokenFromJwt() {
  const resolved = resolveAnalyticsCredentials();
  const email = resolved?.email || "";
  const privateKey = resolved?.privateKey || "";
  if (!email || !privateKey || !privateKey.includes("BEGIN")) return null;
  const auth = new JWT({
    email,
    key: privateKey,
    scopes: [ADMIN_SCOPE],
  });
  const tokenResponse = await auth.getAccessToken();
  const accessToken =
    typeof tokenResponse === "string"
      ? tokenResponse
      : tokenResponse?.token || tokenResponse?.access_token;
  return accessToken || null;
}

async function accessTokenFromOauth() {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  const refreshToken = String(process.env.GOOGLE_REFRESH_TOKEN || "").trim();
  return refreshAccessToken(clientId, clientSecret, refreshToken);
}

async function accessTokenFromSavedFile() {
  const client = loadInteractiveOauthClient();
  const saved = loadSavedOauth();
  const refreshToken = String(saved?.refresh_token || "").trim();
  if (!client || !refreshToken) return null;
  return refreshAccessToken(client.clientId, client.clientSecret, refreshToken);
}

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? `cmd /c start "" "${url.replace(/"/g, '""')}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command, () => {});
}

function loadInteractiveOauthClient() {
  const desktopPaths = [
    path.join(__dirname, "..", "..", "gtm-mcp.json"),
    path.join(__dirname, "..", "gtm-mcp.json"),
    process.env.GA4_OAUTH_CLIENT_FILE,
  ].filter(Boolean);

  for (const filePath of desktopPaths) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
      const installed = json.installed || json.web;
      const clientId = String(installed?.client_id || "").trim();
      const clientSecret = String(installed?.client_secret || "").trim();
      const redirectUris = Array.isArray(installed?.redirect_uris)
        ? installed.redirect_uris
        : [];
      if (clientId && clientSecret) {
        return { clientId, clientSecret, redirectUris, source: filePath };
      }
    } catch {
      /* ignore */
    }
  }

  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
  if (clientId && clientSecret) {
    return { clientId, clientSecret, redirectUris: [], source: "env" };
  }
  return null;
}

function pickLoopbackRedirect(port, registeredUris) {
  const exactLocalhost = `http://localhost:${port}`;
  const exactLoopback = `http://127.0.0.1:${port}`;
  if (registeredUris.includes("http://localhost") || registeredUris.includes(exactLocalhost)) {
    return exactLocalhost;
  }
  if (registeredUris.includes("http://127.0.0.1") || registeredUris.includes(exactLoopback)) {
    return exactLoopback;
  }
  if (registeredUris.includes("http://localhost/")) {
    return `http://localhost:${port}/`;
  }
  return exactLocalhost;
}

/** Browser login with analytics.edit using the desktop OAuth client (`http://localhost`). */
async function accessTokenFromInteractiveOauth() {
  const client = loadInteractiveOauthClient();
  if (!client) {
    console.error("No OAuth client found. Need gtm-mcp.json or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.");
    return null;
  }

  const port = Number(process.env.GA4_OAUTH_PORT || 53682);
  const redirectUri = pickLoopbackRedirect(port, client.redirectUris);

  return new Promise((resolve) => {
    let settled = false;
    let timeoutId;
    const finish = (token) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      try {
        server.close();
      } catch {
        /* ignore */
      }
      resolve(token);
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);
      const err = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      if (!code && !err) {
        res.writeHead(404);
        res.end();
        return;
      }
      if (err || !code) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(`OAuth error: ${err || "missing code"}`);
        finish(null);
        return;
      }
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: client.clientId,
          client_secret: client.clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const json = await tokenRes.json();
      if (!tokenRes.ok || !json.access_token) {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Token exchange failed. You can close this tab.");
        console.error("OAuth token exchange failed:", json.error || tokenRes.status, json.error_description || "");
        finish(null);
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body><p>GA4 Editor access granted. You can close this tab and return to the terminal.</p></body></html>",
      );
      console.log("Interactive OAuth succeeded.");
      saveOauthTokens(client, json);
      finish(json.access_token);
    });

    server.on("error", (e) => {
      console.error("Could not start OAuth callback server:", e.message);
      finish(null);
    });

    server.listen(port, () => {
      const authUrl =
        "https://accounts.google.com/o/oauth2/v2/auth?" +
        new URLSearchParams({
          client_id: client.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: ADMIN_SCOPE,
          access_type: "offline",
          prompt: "consent",
        }).toString();
      console.log("\nThe service account is Viewer-only. Sign in with a GA4 Editor Google account.");
      console.log(`Using OAuth client from ${client.source}`);
      console.log(`Callback: ${redirectUri}`);
      console.log("If the browser does not open, visit:\n");
      console.log(authUrl);
      openBrowser(authUrl);
    });

    timeoutId = setTimeout(() => {
      if (!settled) {
        console.error("Timed out waiting for Google login (3 minutes).");
        finish(null);
      }
    }, 180_000);
  });
}

async function tokenCanWrite(accessToken, propertyId) {
  const { res, text } = await gaFetch(
    accessToken,
    `${BASE_BETA}/properties/${propertyId}/customDimensions`,
    {
      method: "POST",
      body: JSON.stringify({
        parameterName: "user_plan",
        displayName: "User plan",
        description: "free, plus, premium, or pro.",
        scope: "USER",
      }),
    },
  );
  return res.ok || alreadyExists(res.status, text);
}

async function resolveAccessToken(propertyId) {
  const wantLogin = process.argv.includes("--login");

  if (!wantLogin) {
    const jwtToken = await accessTokenFromJwt();
    if (jwtToken) {
      const probe = await gaFetch(
        jwtToken,
        `${BASE_BETA}/properties/${propertyId}/customDimensions?pageSize=1`,
      );
      if (probe.res.ok) {
        if (await tokenCanWrite(jwtToken, propertyId)) {
          console.log("Using service-account credentials for Admin API.");
          return jwtToken;
        }
        console.warn(
          "Service account can read property " +
            propertyId +
            " but cannot create dimensions (Viewer). Falling back to Google login.",
        );
      } else {
        console.warn(
          `Service account Admin API probe failed (${probe.res.status}).`,
        );
      }
    }

    const oauthToken = await accessTokenFromOauth();
    if (oauthToken && (await tokenCanWrite(oauthToken, propertyId))) {
      console.log("Using OAuth refresh token for Admin API.");
      return oauthToken;
    }

    const savedToken = await accessTokenFromSavedFile();
    if (savedToken && (await tokenCanWrite(savedToken, propertyId))) {
      console.log("Using saved Google login for Admin API.");
      return savedToken;
    }
  } else {
    const savedToken = await accessTokenFromSavedFile();
    if (savedToken && (await tokenCanWrite(savedToken, propertyId))) {
      console.log("Using saved Google login for Admin API.");
      return savedToken;
    }
  }

  const interactive = await accessTokenFromInteractiveOauth();
  if (interactive && (await tokenCanWrite(interactive, propertyId))) {
    console.log("Using interactive Google login for Admin API.");
    return interactive;
  }
  if (interactive) {
    console.error(
      "That Google account authenticated, but it still cannot create dimensions. Sign in with a user who is Editor on this GA4 property.",
    );
  }
  return null;
}

async function markKeyEvent(accessToken, parent, eventName) {
  const alpha = await gaFetch(accessToken, `${BASE_ALPHA}/${parent}/keyEvents`, {
    method: "POST",
    body: JSON.stringify({
      eventName,
      countingMethod: "ONCE_PER_EVENT",
    }),
  });
  if (alpha.res.ok || alreadyExists(alpha.res.status, alpha.text)) {
    return {
      ok: true,
      created: alpha.res.ok,
      resourceName: alpha.json?.name,
    };
  }
  const beta = await gaFetch(
    accessToken,
    `${BASE_BETA}/${parent}/conversionEvents`,
    {
      method: "POST",
      body: JSON.stringify({ eventName }),
    },
  );
  if (beta.res.ok || alreadyExists(beta.res.status, beta.text)) {
    return {
      ok: true,
      created: beta.res.ok,
      resourceName: beta.json?.name,
    };
  }
  return {
    ok: false,
    created: false,
    limit:
      isKeyEventLimit(alpha.res.status, alpha.text) ||
      isKeyEventLimit(beta.res.status, beta.text),
    text: `${alpha.res.status} ${alpha.text} | beta ${beta.res.status} ${beta.text}`,
  };
}

async function main() {
  const propertyId = String(process.env.GA4_PROPERTY_ID || "").trim();
  if (!propertyId) {
    console.error("Missing GA4_PROPERTY_ID.");
    return 1;
  }

  const accessToken = await resolveAccessToken(propertyId);
  if (!accessToken) {
    console.error(
      "Could not obtain an Admin API access token. Set ANALYTICS_CLIENT_EMAIL/ANALYTICS_PRIVATE_KEY (with Analytics Admin API enabled) or GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN with analytics.edit.",
    );
    return 1;
  }

  const parent = `properties/${propertyId}`;
  const summary = {
    dimensionsCreated: 0,
    dimensionsSkipped: 0,
    metricsCreated: 0,
    metricsSkipped: 0,
    keyEventsCreated: 0,
    keyEventsSkipped: 0,
    calculatedCreated: 0,
    calculatedSkipped: 0,
    errors: [],
  };

  const dimList = await listAll(
    accessToken,
    `${BASE_BETA}/${parent}/customDimensions?pageSize=200`,
    "customDimensions",
  );
  if (!dimList.ok) {
    console.error(`List custom dimensions failed (${dimList.status}):`, dimList.text);
    printAdminApiEnableHint(dimList.json, dimList.text);
    return 1;
  }
  const existingDimNames = new Set(
    dimList.items.map((d) => String(d.parameterName || "")),
  );
  console.log(`Existing custom dimensions: ${existingDimNames.size}`);
  for (const d of dimList.items) {
    console.log(`  ${d.parameterName}\t${d.scope}\t${d.displayName}`);
  }

  let writeDenied = false;

  async function createDimension(def, scope) {
    if (writeDenied) {
      summary.dimensionsSkipped += 1;
      return false;
    }
    if (existingDimNames.has(def.parameterName)) {
      summary.dimensionsSkipped += 1;
      return true;
    }
    const { res, text, json } = await gaFetch(
      accessToken,
      `${BASE_BETA}/${parent}/customDimensions`,
      {
        method: "POST",
        body: JSON.stringify({
          parameterName: def.parameterName,
          displayName: def.displayName,
          description: def.description,
          scope,
        }),
      },
    );
    if (res.ok) {
      summary.dimensionsCreated += 1;
      existingDimNames.add(def.parameterName);
      console.log(`Created ${scope} dimension ${def.parameterName}`);
      return true;
    }
    if (alreadyExists(res.status, text)) {
      summary.dimensionsSkipped += 1;
      existingDimNames.add(def.parameterName);
      return true;
    }
    const msg = `Dimension ${def.parameterName}: ${res.status} ${text}`;
    console.error(msg);
    summary.errors.push(msg);
    if (isServiceDisabled(json, text)) {
      printAdminApiEnableHint(json, text);
      writeDenied = true;
      return false;
    }
    if (res.status === 403) {
      printEditorGrantHint(propertyId, resolveAnalyticsCredentials()?.email);
      writeDenied = true;
      return false;
    }
    return false;
  }

  for (const def of USER_DIMENSIONS) {
    await createDimension(def, "USER");
  }
  for (const def of EVENT_DIMENSIONS) {
    await createDimension(def, "EVENT");
  }

  const metricList = await listAll(
    accessToken,
    `${BASE_BETA}/${parent}/customMetrics?pageSize=200`,
    "customMetrics",
  );
  if (!metricList.ok) {
    console.error(`List custom metrics failed (${metricList.status}):`, metricList.text);
    summary.errors.push(`List custom metrics failed: ${metricList.status}`);
  }
  const existingMetricNames = new Set(
    (metricList.items || []).map((m) => String(m.parameterName || "")),
  );
  console.log(`Existing custom metrics: ${existingMetricNames.size}`);

  for (const def of CUSTOM_METRICS) {
    if (writeDenied) {
      summary.metricsSkipped += 1;
      continue;
    }
    if (existingMetricNames.has(def.parameterName)) {
      summary.metricsSkipped += 1;
      continue;
    }
    const { res, text } = await gaFetch(
      accessToken,
      `${BASE_BETA}/${parent}/customMetrics`,
      {
        method: "POST",
        body: JSON.stringify({
          parameterName: def.parameterName,
          displayName: ga4DisplayName(def.displayName),
          description: def.description,
          measurementUnit: def.measurementUnit,
          scope: "EVENT",
        }),
      },
    );
    if (res.ok) {
      summary.metricsCreated += 1;
      existingMetricNames.add(def.parameterName);
      console.log(`Created metric ${def.parameterName}`);
      continue;
    }
    if (alreadyExists(res.status, text)) {
      summary.metricsSkipped += 1;
      continue;
    }
    const msg = `Metric ${def.parameterName}: ${res.status} ${text}`;
    console.error(msg);
    summary.errors.push(msg);
    if (res.status === 403) {
      if (!writeDenied) {
        printEditorGrantHint(propertyId, resolveAnalyticsCredentials()?.email);
      }
      writeDenied = true;
    }
  }

  const existingKeyEvents = new Set();
  const keyEventResources = new Map();
  const keyListAlpha = await listAll(
    accessToken,
    `${BASE_ALPHA}/${parent}/keyEvents?pageSize=200`,
    "keyEvents",
  );
  if (keyListAlpha.ok) {
    for (const item of keyListAlpha.items) {
      const eventName = String(item.eventName || "");
      existingKeyEvents.add(eventName);
      if (item.name) keyEventResources.set(eventName, item.name);
    }
  } else {
    const convList = await listAll(
      accessToken,
      `${BASE_BETA}/${parent}/conversionEvents?pageSize=200`,
      "conversionEvents",
    );
    if (convList.ok) {
      for (const item of convList.items) {
        const eventName = String(item.eventName || "");
        existingKeyEvents.add(eventName);
        if (item.name) keyEventResources.set(eventName, item.name);
      }
    } else {
      console.warn(
        `List key events failed (alpha ${keyListAlpha.status}, beta ${convList.status}). Will try create.`,
      );
    }
  }
  console.log(`Existing key events: ${existingKeyEvents.size}`);

  let keyEventLimitHit = false;
  for (const eventName of KEY_EVENTS) {
    if (writeDenied) {
      summary.keyEventsSkipped += 1;
      continue;
    }
    if (existingKeyEvents.has(eventName)) {
      summary.keyEventsSkipped += 1;
      continue;
    }
    if (keyEventLimitHit) {
      summary.keyEventsSkipped += 1;
      continue;
    }
    const result = await markKeyEvent(accessToken, parent, eventName);
    if (result.ok) {
      existingKeyEvents.add(eventName);
      if (result.resourceName) {
        keyEventResources.set(eventName, result.resourceName);
      }
      if (result.created) {
        summary.keyEventsCreated += 1;
        console.log(`Marked key event ${eventName}`);
      } else {
        summary.keyEventsSkipped += 1;
      }
      continue;
    }
    if (result.limit) {
      keyEventLimitHit = true;
      summary.keyEventsSkipped += 1;
      console.warn(
        `Key event cap reached at ${eventName}. Will unmark lower-priority events if needed.`,
      );
      continue;
    }
    const msg = `Key event ${eventName}: ${result.text}`;
    console.error(msg);
    summary.errors.push(msg);
  }

  const missingPriority = HIGH_PRIORITY_KEY_EVENTS.filter(
    (eventName) => !existingKeyEvents.has(eventName),
  );
  if (!writeDenied && missingPriority.length) {
    let freed = 0;
    for (const eventName of KEY_EVENTS_RELEASABLE) {
      if (freed >= missingPriority.length) break;
      const resourceName = keyEventResources.get(eventName);
      if (!resourceName || !existingKeyEvents.has(eventName)) continue;
      const { res, text } = await gaFetch(
        accessToken,
        `${BASE_ALPHA}/${resourceName}`,
        { method: "DELETE" },
      );
      if (res.ok || res.status === 404) {
        existingKeyEvents.delete(eventName);
        keyEventResources.delete(eventName);
        freed += 1;
        console.log(`Unmarked key event ${eventName} to free a slot`);
      } else {
        console.warn(`Could not unmark ${eventName}: ${res.status} ${text}`);
      }
    }
    for (const eventName of missingPriority) {
      const result = await markKeyEvent(accessToken, parent, eventName);
      if (result.ok && result.created) {
        existingKeyEvents.add(eventName);
        summary.keyEventsCreated += 1;
        summary.keyEventsSkipped = Math.max(0, summary.keyEventsSkipped - 1);
        console.log(`Marked key event ${eventName}`);
      } else if (!result.ok) {
        console.warn(
          `Could not mark high-priority key event ${eventName}: ${result.text}`,
        );
      }
    }
  }

  console.log(
    "Skipping calculated metrics: GA4 formulas only accept predefined/custom metrics, not keyEvents:event_name. Use Explorations for completion, paywall, checkout, AI scoring, and onboarding rates.",
  );

  console.log("\nKPI setup summary:");
  console.log(JSON.stringify(summary, null, 2));
  return summary.errors.length ? 1 : 0;
}

async function runAndExit() {
  let code = 1;
  try {
    code = await main();
  } catch (e) {
    console.error(e);
    code = 1;
  }
  process.exitCode = code;
}

runAndExit();

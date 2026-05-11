/**
 * Reads keys from website/.env and prints non-sensitive Clerk settings
 * (same data you would inspect with Clerk CLI / Dashboard).
 *
 * Run from repo root: node website/tooling/clerk-instance-snapshot.mjs
 * Or: cd website && node tooling/clerk-instance-snapshot.mjs
 */
import fs from "node:fs";
import https from "node:https";

const envPath = new URL("../.env", import.meta.url);
const raw = fs.readFileSync(envPath, "utf8");
function pick(key) {
  const m = raw.match(new RegExp(`^${key}=(.+)$`, "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : "";
}

const sk = pick("CLERK_SECRET_KEY");
const pk = pick("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

function get(host, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: host, path, method: "GET", headers },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => resolve({ status: res.statusCode, body: d }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

const out = { source: "website/.env (active CLERK_* lines)" };

if (sk) {
  const { status, body } = await get("api.clerk.com", "/v1/instance", {
    Authorization: `Bearer ${sk}`,
  });
  if (status === 200) {
    const j = JSON.parse(body);
    out.backend_instance = {
      id: j.id,
      object: j.object,
      allowed_origins: j.allowed_origins,
      development: j.development,
      enhanced_email_deliverability: j.enhanced_email_deliverability,
    };
  } else {
    out.backend_instance = { error: `HTTP ${status}`, snippet: body.slice(0, 200) };
  }
} else {
  out.backend_instance = { skipped: "no CLERK_SECRET_KEY" };
}

if (pk) {
  const hostMatch = pk.match(/^pk_(?:test|live)_(.+)$/);
  const b64 = hostMatch ? hostMatch[1] : "";
  let fapiHost = "";
  try {
    fapiHost = Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "");
  } catch {
    fapiHost = "";
  }
  if (fapiHost) {
    const { status, body } = await get(fapiHost, "/v1/environment", {
      Authorization: `Bearer ${pk}`,
    });
    if (status === 200) {
      const j = JSON.parse(body);
      const client = j.response?.client ?? j.client ?? {};
      const auth = client.auth_config ?? j.auth_config ?? {};
      const disp = j.response?.display_config ?? j.display_config ?? {};
      out.frontend_environment = {
        first_factors: auth.first_factors,
        has_google_one_tap_client_id: !!disp.google_one_tap_client_id,
        google_one_tap_client_id_length: disp.google_one_tap_client_id
          ? String(disp.google_one_tap_client_id).length
          : 0,
      };
    } else {
      out.frontend_environment = {
        error: `HTTP ${status}`,
        host: fapiHost,
        snippet: body.slice(0, 200),
      };
    }
  } else {
    out.frontend_environment = { skipped: "could not parse publishable key host" };
  }
} else {
  out.frontend_environment = { skipped: "no NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" };
}

console.log(JSON.stringify(out, null, 2));

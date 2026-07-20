import fs from "fs";

for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const k = line.slice(0, eq).trim();
  let v = line.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!(k in process.env)) process.env[k] = v;
}

const key = process.env.STRIPE_SECRET_KEY;
const headers = { Authorization: `Bearer ${key}` };

async function get(path) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status} ${t.slice(0, 1200)}`);
  return JSON.parse(t);
}

// Full endpoint details
for (const id of [
  "we_1RrLOFHBKaYwAPUK1JfHpg7B",
  "we_1TOQkYHBKaYwAPUKPOWhccHF",
]) {
  const e = await get(`/webhook_endpoints/${id}`);
  console.log("\n=== FULL ENDPOINT", id, "===");
  console.log(
    JSON.stringify(
      {
        id: e.id,
        url: e.url,
        status: e.status,
        disabled_reason: e.disabled_reason,
        livemode: e.livemode,
        metadata: e.metadata,
        secret_present: Boolean(e.secret),
        enabled_events: e.enabled_events,
        api_version: e.api_version,
        application: e.application,
        description: e.description,
        created: new Date(e.created * 1000).toISOString(),
      },
      null,
      2,
    ),
  );
}

// List all endpoints including disabled with starting_after pagination
let starting_after = null;
const all = [];
for (let i = 0; i < 5; i++) {
  const q = starting_after
    ? `/webhook_endpoints?limit=100&starting_after=${starting_after}`
    : `/webhook_endpoints?limit=100`;
  const page = await get(q);
  all.push(...page.data);
  if (!page.has_more) break;
  starting_after = page.data.at(-1)?.id;
}
console.log("\n=== ALL ENDPOINTS COUNT", all.length, "===");
for (const e of all) {
  console.log(`${e.status.padEnd(10)} ${e.id} ${e.url}`);
}

// Try v2 event destinations if available
for (const path of [
  "/v2/core/event_destinations?limit=20",
  "/event_destinations?limit=20",
]) {
  try {
    const r = await fetch(`https://api.stripe.com${path.startsWith("/v2") ? path : "/v1" + path}`, {
      headers,
    });
    const t = await r.text();
    console.log(`\n=== ${path} status ${r.status} ===`);
    console.log(t.slice(0, 2000));
  } catch (err) {
    console.log(path, err);
  }
}

// Sample a recent checkout.session.completed or subscription event for delivery info
const types = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "invoice.payment_succeeded",
];
for (const type of types) {
  const evs = await get(`/events?type=${encodeURIComponent(type)}&limit=3`);
  console.log(`\n=== Recent ${type} ===`);
  for (const ev of evs.data) {
    console.log(
      JSON.stringify({
        id: ev.id,
        created: new Date(ev.created * 1000).toISOString(),
        pending_webhooks: ev.pending_webhooks,
        request: ev.request,
      }),
    );
  }
}

// Hit the webhook URL to see if it's reachable
for (const url of [
  "https://celpippracticetest.com/api/stripe/webhook",
  "https://www.celpippracticetest.com/api/stripe/webhook",
]) {
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const body = await r.text();
    console.log(`\n=== Probe ${url} ===`);
    console.log("status", r.status, "body", body.slice(0, 300));
  } catch (err) {
    console.log(`\n=== Probe ${url} ERROR ===`, String(err));
  }
}

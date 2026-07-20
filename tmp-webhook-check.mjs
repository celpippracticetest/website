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
if (!key) {
  console.error("No STRIPE_SECRET_KEY");
  process.exit(1);
}
console.log("key_prefix", key.slice(0, 7), "live?", key.startsWith("sk_live"));

const headers = { Authorization: `Bearer ${key}` };

async function get(path) {
  const r = await fetch(`https://api.stripe.com/v1${path}`, { headers });
  const t = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status} ${t.slice(0, 800)}`);
  return JSON.parse(t);
}

const endpoints = await get("/webhook_endpoints?limit=20");
console.log("\n=== WEBHOOK ENDPOINTS ===");
for (const e of endpoints.data) {
  console.log(
    JSON.stringify(
      {
        id: e.id,
        url: e.url,
        status: e.status,
        enabled_events: e.enabled_events,
        api_version: e.api_version,
        description: e.description,
        created: new Date(e.created * 1000).toISOString(),
      },
      null,
      2,
    ),
  );
}

// Recent events that might have failed deliveries
const events = await get("/events?limit=30");
console.log("\n=== RECENT EVENTS ===");
for (const ev of events.data) {
  console.log(
    `${new Date(ev.created * 1000).toISOString()} ${ev.type} ${ev.id} pending_webhooks=${ev.pending_webhooks}`,
  );
}

for (const e of endpoints.data) {
  console.log(`\n=== ATTEMPTS for ${e.id} (${e.url}) ===`);
  try {
    const attempts = await get(`/webhook_endpoints/${e.id}/attempts?limit=20`);
    if (!attempts.data) {
      console.log(JSON.stringify(attempts).slice(0, 1500));
      continue;
    }
    for (const a of attempts.data) {
      console.log(
        JSON.stringify({
          id: a.id,
          event: typeof a.event === "string" ? a.event : a.event?.id,
          event_type: a.event?.type,
          http_status: a.http_status ?? a.response_status,
          succeeded: a.succeeded ?? a.status,
          error: a.error_message,
          created: a.created
            ? new Date(a.created * 1000).toISOString()
            : undefined,
        }),
      );
    }
  } catch (err) {
    console.log("attempts error:", String(err).slice(0, 500));
  }
}

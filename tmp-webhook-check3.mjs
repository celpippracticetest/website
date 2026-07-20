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
const headers = {
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/x-www-form-urlencoded",
};

// Try retrieve with expand / see raw
const id = "we_1RrLOFHBKaYwAPUK1JfHpg7B";
const r = await fetch(`https://api.stripe.com/v1/webhook_endpoints/${id}`, {
  headers: { Authorization: `Bearer ${key}` },
});
const full = await r.json();
console.log("keys:", Object.keys(full));
console.log("disabled_reason:", full.disabled_reason);
console.log("status:", full.status);

// Check when last successful checkout was persisted vs stripe events
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const rows = await sql`
    SELECT id, status, created_at, user_id, stripe_session_id
    FROM checkouts
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log("\n=== Recent checkouts ===");
  for (const row of rows) {
    console.log(
      `${row.created_at?.toISOString?.() ?? row.created_at} ${row.status} session=${row.stripe_session_id} user=${row.user_id}`,
    );
  }
} catch (err) {
  console.log("checkouts query error:", String(err).slice(0, 500));
  // try alternate table names
  try {
    const tables = await sql`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name ILIKE '%checkout%'
      ORDER BY table_name
    `;
    console.log("checkout-like tables:", tables.map((t) => t.table_name));
  } catch (e2) {
    console.log("schema error", String(e2).slice(0, 300));
  }
}

try {
  const subs = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%sub%' OR table_name ILIKE '%stripe%' OR table_name ILIKE '%webhook%')
    ORDER BY table_name
  `;
  console.log("\nrelated tables:", subs.map((t) => t.table_name));
} catch {}

await sql.end({ timeout: 5 });

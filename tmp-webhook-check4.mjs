import fs from "fs";
import postgres from "postgres";

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

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const checkoutCols = await sql`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'checkouts'
  ORDER BY ordinal_position
`;
console.log("checkouts columns:", checkoutCols.map((c) => c.column_name).join(", "));

const checkouts = await sql`
  SELECT *
  FROM checkouts
  ORDER BY created_at DESC
  LIMIT 8
`;
console.log("\n=== Recent checkouts ===");
for (const row of checkouts) {
  const keys = Object.keys(row);
  const summary = {};
  for (const k of keys) {
    if (
      /id|status|email|created|updated|session|user|plan|amount/i.test(k)
    ) {
      summary[k] = row[k];
    }
  }
  console.log(JSON.stringify(summary));
}

const subCols = await sql`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'stripe_subscriptions'
  ORDER BY ordinal_position
`;
console.log("\nstripe_subscriptions columns:", subCols.map((c) => c.column_name).join(", "));

const subs = await sql`
  SELECT *
  FROM stripe_subscriptions
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 8
`;
console.log("\n=== Recent stripe_subscriptions (by updated_at) ===");
for (const row of subs) {
  const summary = {};
  for (const k of Object.keys(row)) {
    if (/id|status|email|created|updated|user|plan|customer|period/i.test(k)) {
      summary[k] = row[k];
    }
  }
  console.log(JSON.stringify(summary));
}

await sql.end({ timeout: 5 });

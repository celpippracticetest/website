require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

(async () => {
  const v = await sql`SELECT version()`;
  console.log(v[0].version);

  // Find if any user_id on a busy page causes ARRAY_AGG to fail
  const ids = (
    await sql`SELECT user_id FROM public.user_activities GROUP BY user_id ORDER BY COUNT(*) DESC LIMIT 100`
  ).map((r) => r.user_id);

  try {
    const rows = await sql`
      SELECT
        user_id,
        (
          ARRAY_AGG(DISTINCT NULLIF(TRIM(ip_address), ''))
          FILTER (WHERE NULLIF(TRIM(ip_address), '') IS NOT NULL)
        )[1:5] AS ip_addresses
      FROM public.user_activities
      WHERE user_id = ANY(${ids})
      GROUP BY user_id
    `;
    console.log("ARRAY_AGG OK for top 100 users:", rows.length);
  } catch (e) {
    console.error("ARRAY_AGG failed:", e.message);
  }

  // Test without slice - main style
  try {
    const rows = await sql`
      SELECT
        user_id,
        COALESCE(
          array_agg(DISTINCT NULLIF(TRIM(ip_address), '')) FILTER (
            WHERE ip_address IS NOT NULL AND TRIM(ip_address) <> ''
          ),
          ARRAY[]::text[]
        ) AS ip_addresses
      FROM public.user_activities
      WHERE user_id = ANY(${ids})
      GROUP BY user_id
    `;
    console.log("main-style array_agg OK:", rows.length);
  } catch (e) {
    console.error("main-style failed:", e.message);
  }

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});

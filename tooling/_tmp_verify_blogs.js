require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1,
  prepare: false,
  connect_timeout: 20,
});

(async () => {
  try {
    const summary = await sql`
      SELECT status, COUNT(*)::int AS c
      FROM public.blogs
      GROUP BY status
      ORDER BY status
    `;
    console.log("summary", summary);

    const visible = await sql`
      SELECT slug, title, published_at
      FROM public.blogs
      WHERE status = 'published'
        AND published_at IS NOT NULL
        AND published_at <= now()
      ORDER BY published_at DESC
      LIMIT 12
    `;
    console.log("visible_top:");
    for (const r of visible) console.log(`- ${r.slug}`);

    const check = [
      "celpip-study-plan",
      "speaking-fluency-daily-practice-routine",
      "how-careeraxis-celpip-helps-you-get-clb-9-for-canadian-pr-fast",
    ];
    for (const slug of check) {
      const rows = await sql`
        SELECT status, published_at IS NOT NULL AS has_pub
        FROM public.blogs WHERE slug = ${slug}
      `;
      console.log(slug, rows[0] || null);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

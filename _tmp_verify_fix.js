require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

// Reproduce the exact bug: null in candidate ids used to throw on .trim()
function oldNormalize(userIds) {
  return [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
}

function newNormalize(userIds) {
  const ids = [];
  const seen = new Set();
  for (const raw of userIds) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

const candidates = [
  "1705e47c-9d3b-4575-9584-3b7ef2240ea3",
  "1705e47c-9d3b-4575-9584-3b7ef2240ea3",
  null, // legacy_clerk_user_id
  "616cbea3-9dea-4fa8-a406-7958faf8bf63", // profile_id
];

try {
  oldNormalize(candidates);
  console.log("OLD: unexpected success");
} catch (e) {
  console.log("OLD throws (bug):", e.message);
}

console.log("NEW ids:", newNormalize(candidates));

const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

(async () => {
  // Simulate fixed loader with nullable candidates
  const ids = newNormalize(candidates);
  const engagementEventTypes = [
    "practice_attempt_started",
    "practice_attempt_completed",
    "mock_attempt_started",
    "mock_attempt_completed",
    "login",
  ];
  const rows = await sql`
    SELECT
      user_id,
      COUNT(*)::int AS total_activities,
      COUNT(DISTINCT NULLIF(TRIM(ip_address), ''))::int AS unique_ips,
      COUNT(DISTINCT NULLIF(TRIM(user_agent), ''))::int AS unique_uas,
      COALESCE(SUM(COALESCE(llm_tokens_prompt, 0) + COALESCE(llm_tokens_completion, 0)), 0) AS total_tokens,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_started')::int AS practice_attempts,
      COUNT(*) FILTER (WHERE event_type = 'practice_attempt_completed')::int AS practice_completions,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_started')::int AS mock_attempts,
      COUNT(*) FILTER (WHERE event_type = 'mock_attempt_completed')::int AS mock_completions
    FROM public.user_activities
    WHERE user_id = ANY(${ids})
    GROUP BY user_id
  `;
  console.log("fixed metrics:", rows);
  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});

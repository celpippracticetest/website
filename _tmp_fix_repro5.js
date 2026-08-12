require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });

(async () => {
  const rls = await sql`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'user_activities'
  `;
  console.log("rls:", rls);

  const policies = await sql`
    SELECT polname, polcmd, pg_get_expr(polqual, polrelid) AS qual
    FROM pg_policy
    WHERE polrelid = 'public.user_activities'::regclass
  `;
  console.log("policies:", policies);

  const grants = await sql`
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'user_activities'
    ORDER BY grantee, privilege_type
  `;
  console.log("grants:", grants);

  // How many profiles would show 0 practice if we only looked up profile.id?
  const wrongId = await sql`
    SELECT COUNT(*)::int AS profiles_with_auth_activity_only
    FROM public.user_profiles p
    WHERE p.supabase_auth_user_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.user_id = p.supabase_auth_user_id::text
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_activities ua
        WHERE ua.user_id = p.id::text
      )
  `;
  console.log(wrongId[0]);

  // How many users have activity under email but different user_id than profile ids?
  const byEmailMismatch = await sql`
    SELECT COUNT(DISTINCT ua.email)::int AS c
    FROM public.user_activities ua
    JOIN public.user_profiles p ON lower(p.email) = lower(ua.email)
    WHERE ua.email IS NOT NULL
      AND ua.user_id IS DISTINCT FROM p.supabase_auth_user_id::text
      AND ua.user_id IS DISTINCT FROM p.id::text
      AND (p.legacy_clerk_user_id IS NULL OR ua.user_id IS DISTINCT FROM p.legacy_clerk_user_id)
  `;
  console.log("email match but id mismatch:", byEmailMismatch[0]);

  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});

require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const email = "oliveranogic@gmail.com";

(async () => {
  const profiles = await sql`SELECT id, supabase_auth_user_id, email, plan, created_at, updated_at FROM public.user_profiles WHERE lower(email)=lower(${email})`;
  const auths = await sql`SELECT id, email, created_at, last_sign_in_at FROM auth.users WHERE lower(email)=lower(${email})`;
  console.log({ profiles, auths });

  // Call the actual TS module via dynamic import if possible
  await sql.end();
})().catch(async (e) => {
  console.error(e);
  try { await sql.end(); } catch {}
  process.exit(1);
});

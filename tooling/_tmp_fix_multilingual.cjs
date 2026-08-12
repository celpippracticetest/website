const fs = require("fs");
const path = require("path");
const postgres = require("postgres");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function asRecord(v) {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return typeof v === "object" && !Array.isArray(v) ? v : {};
}

async function main() {
  loadEnv();
  const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL.trim(),
    process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const uid = "4d914f30-6442-4a31-bf66-c32eb1f7be9d";

  const { data, error } = await admin.auth.admin.getUserById(uid);
  if (error) throw error;
  const app = {
    ...(data.user.app_metadata || {}),
    planCancelled: false,
    planExpiresAt: null,
    planRenewsAt: "2026-10-08T00:45:47.000Z",
  };
  const { error: updErr } = await admin.auth.admin.updateUserById(uid, {
    app_metadata: app,
  });
  if (updErr) throw updErr;

  const profiles = await sql`
    SELECT id, public_metadata FROM public.user_profiles
    WHERE supabase_auth_user_id = ${uid}::uuid
  `;
  for (const p of profiles) {
    const meta = {
      ...asRecord(p.public_metadata),
      planCancelled: false,
      planExpiresAt: null,
      planRenewsAt: "2026-10-08T00:45:47.000Z",
    };
    await sql`
      UPDATE public.user_profiles
      SET public_metadata = ${JSON.stringify(meta)}::jsonb, updated_at = now()
      WHERE id = ${p.id}::uuid
    `;
  }
  console.log("cleared stale cancel flags for celpip@multilingualtraining.com");
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

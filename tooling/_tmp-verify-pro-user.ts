import "./bootstrap-website-env";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
  const admin = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await admin.auth.admin.getUserById(
    "e50be9bb-e78d-46c3-b24e-d1afae7c6993",
  );
  if (error) throw error;
  console.log({
    email: data.user.email,
    email_confirmed_at: data.user.email_confirmed_at,
    plan: data.user.app_metadata?.plan,
    planCancelled: data.user.app_metadata?.planCancelled,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Lookup user by email in Postgres (user_profiles) + Supabase Auth + Stripe.
 * Usage: node tooling/lookup-user-email.mjs email@example.com
 */
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import postgres from "postgres";
import Stripe from "stripe";

const email = (process.argv[2] || "").trim().toLowerCase();
const emailLocal = email.split("@")[0] || email;
if (!email) {
  console.error("Usage: node tooling/lookup-user-email.mjs <email>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env", ".env.local"]) {
  try {
    for (const line of readFileSync(join(root, file), "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        let v = m[2].trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        process.env[m[1].trim()] = v;
      }
    }
  } catch {
    // optional
  }
}

const dbUrl = process.env.DATABASE_URL;
const stripeKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkKey = process.env.CLERK_SECRET_KEY;

const out = { email, postgres: {}, supabase: {}, clerk: [], stripe: {} };

if (dbUrl) {
  const sql = postgres(dbUrl, { max: 1 });
  try {
    const profiles = await sql`
      SELECT
        app_document_mongo_id,
        legacy_clerk_user_id,
        supabase_auth_user_id::text AS supabase_auth_user_id,
        email,
        plan,
        plan_type,
        stripe_customer_id,
        public_metadata,
        created_at,
        updated_at
      FROM public.user_profiles
      WHERE lower(email) = ${email}
         OR lower(email) LIKE ${"%" + emailLocal + "%"}
      LIMIT 10
    `;
    out.postgres.user_profiles = profiles;

    const docs = await sql`
      SELECT mongo_id, collection, updated_at,
             body->>'email' AS doc_email,
             body->'publicMetadata'->>'plan' AS plan
      FROM public.app_documents
      WHERE collection IN ('users', 'prod.users')
        AND (
          lower(body->>'email') = ${email}
          OR lower(body->>'email') LIKE ${"%" + emailLocal + "%"}
        )
      LIMIT 10
    `;
    out.postgres.app_documents_users = docs;

    const checkouts = await sql`
      SELECT mongo_id, updated_at, body->>'checkoutId' AS checkout_id,
             body->>'userId' AS user_id, body->>'status' AS status
      FROM public.app_documents
      WHERE collection IN ('checkouts', 'prod.checkouts')
        AND body::text ILIKE ${"%" + email + "%"}
      ORDER BY updated_at DESC
      LIMIT 10
    `;
    out.postgres.checkouts_mentioning_email = checkouts;

    const subs = await sql`
      SELECT stripe_id, status, price_id, customer_id, created_at, canceled_at,
             metadata->>'user_id' AS user_id
      FROM public.stripe_subscriptions
      WHERE metadata::text ILIKE ${"%" + email + "%"}
         OR metadata->>'user_id' IN (
           SELECT COALESCE(legacy_clerk_user_id, supabase_auth_user_id::text)
           FROM public.user_profiles
           WHERE lower(email) = ${email}
         )
      LIMIT 10
    `;
    out.postgres.stripe_subscriptions = subs;
  } finally {
    await sql.end();
  }
} else {
  out.postgres.error = "DATABASE_URL not set";
}

if (supabaseUrl && supabaseService) {
  try {
    const res = await fetch(
      `${supabaseUrl.replace(/\/$/, "")}/auth/v1/admin/users?per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${supabaseService}`,
          apikey: supabaseService,
        },
      }
    );
    const body = await res.json();
    const users = body.users || body || [];
    out.supabase.matches = (Array.isArray(users) ? users : [])
      .filter((u) => (u.email || "").toLowerCase() === email)
      .map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata,
        user_metadata: u.user_metadata,
      }));
    if (!out.supabase.matches.length) {
      out.supabase.note =
        "No exact email match in first page of admin users list; user may exist on another page.";
    }
  } catch (e) {
    out.supabase.error = String(e.message || e);
  }
}

if (clerkKey) {
  for (const params of [
    { email_address: email, limit: "10" },
    { query: emailLocal, limit: "10" },
  ]) {
    const url = new URL("https://api.clerk.com/v1/users");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${clerkKey}` },
    });
    const users = await res.json();
    if (Array.isArray(users) && users.length) {
      out.clerk = users.map((u) => ({
        id: u.id,
        email: u.email_addresses?.[0]?.email_address,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at,
        publicMetadata: u.public_metadata,
      }));
      break;
    }
  }
}

if (stripeKey) {
  const stripe = new Stripe(stripeKey);
  const customers = await stripe.customers.list({ email, limit: 10 });
  out.stripe.customers = customers.data.map((c) => ({
    id: c.id,
    email: c.email,
    created: c.created,
  }));
  try {
    const search = await stripe.checkout.sessions.search({
      query: `customer_details.email:'${email}'`,
      limit: 10,
    });
    out.stripe.checkoutSessions = search.data.map((s) => ({
      id: s.id,
      status: s.status,
      payment_status: s.payment_status,
      created: s.created,
      metadata: s.metadata,
    }));
  } catch (e) {
    out.stripe.checkoutSearchError = e.message;
  }
}

const supabaseId = out.supabase.matches?.[0]?.id;
if (supabaseId && dbUrl) {
  const sql2 = postgres(dbUrl, { max: 1 });
  try {
    const docs = await sql2`
      SELECT collection, mongo_id, updated_at,
        body->>'type' AS doc_type,
        body->>'email' AS doc_email
      FROM public.app_documents
      WHERE body::text ILIKE ${"%" + supabaseId + "%"}
      ORDER BY updated_at DESC
      LIMIT 20
    `;
    out.postgres.app_documents_by_user_id = docs;
  } finally {
    await sql2.end();
  }
}

console.log(JSON.stringify(out, null, 2));

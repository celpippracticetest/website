import { readFileSync } from "fs";

const email = (process.argv[2] || "").trim().toLowerCase();
if (!email) {
  console.error("Usage: node tooling/tmp-lookup-user.mjs <email>");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^[^#=]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i).trim(), v];
    })
);

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const clerkKey = env.CLERK_SECRET_KEY;
const stripeKey = env.STRIPE_SECRET_KEY;

const out = { email };

// Supabase Auth
if (supabaseUrl && serviceKey) {
  let page = 1;
  const users = [];
  while (page <= 20) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200&page=${page}`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      out.supabaseError = data;
      break;
    }
    const batch = data.users || [];
    users.push(...batch);
    if (batch.length < 200) break;
    page++;
  }
  out.supabase = users
    .filter((u) => (u.email || "").toLowerCase() === email)
    .map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      app_metadata: u.app_metadata,
      user_metadata_plan: u.user_metadata?.plan,
      app_metadata_plan: u.app_metadata?.plan,
      purchaseDate: u.app_metadata?.purchaseDate ?? u.user_metadata?.purchaseDate,
      planCancelled: u.app_metadata?.planCancelled ?? u.user_metadata?.planCancelled,
      clerk_user_id: u.user_metadata?.clerk_user_id ?? u.user_metadata?.clerkUserId,
      user_metadata: u.user_metadata,
    }));
}

// Clerk
if (clerkKey) {
  const url = new URL("https://api.clerk.com/v1/users");
  url.searchParams.set("email_address", email);
  url.searchParams.set("limit", "10");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${clerkKey}` } });
  const users = await res.json();
  if (!res.ok) out.clerkError = users;
  else {
    out.clerk = (Array.isArray(users) ? users : []).map((u) => ({
      id: u.id,
      last_sign_in: u.last_sign_in_at,
      public_metadata: u.public_metadata,
    }));
  }
}

// Stripe
if (stripeKey) {
  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(stripeKey);
  const customers = await stripe.customers.list({ email, limit: 5 });
  out.stripe = { customers: [] };
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: c.id, limit: 5, status: "all" });
    out.stripe.customers.push({
      id: c.id,
      subscriptions: subs.data.map((s) => ({
        id: s.id,
        status: s.status,
        priceId: s.items?.data?.[0]?.price?.id,
        current_period_end: s.current_period_end,
      })),
    });
  }
}

console.log(JSON.stringify(out, null, 2));

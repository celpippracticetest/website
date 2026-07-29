/**
 * One-shot: auth.users INSERT → POST /api/users/webhook (Meta CompleteRegistration).
 *
 * Usage: npx --yes tsx ./tooling/setup-supabase-user-created-webhook.ts
 *
 * Requires in .env:
 * - DATABASE_URL
 * - SUPABASE_WEBHOOK_SECRET (or SUPABASE_AUTH_WEBHOOK_SECRET)
 * - APP_BASE_URL (default https://celpippracticetest.com)
 */
import "./bootstrap-website-env";
import { closeSql, getSql } from "@/lib/pg/pool";

const WEBHOOK_URL =
  (process.env.APP_BASE_URL || "https://celpippracticetest.com").replace(
    /\/$/,
    ""
  ) + "/api/users/webhook";

const secret =
  process.env.SUPABASE_WEBHOOK_SECRET?.trim() ||
  process.env.SUPABASE_AUTH_WEBHOOK_SECRET?.trim() ||
  process.env.USERS_WEBHOOK_SECRET?.trim();

async function main() {
  if (!secret) throw new Error("SUPABASE_WEBHOOK_SECRET is required");

  const sql = getSql();
  try {
    await sql`
      create extension if not exists pg_net with schema extensions
    `;

    await sql`
      create schema if not exists private
    `;
    await sql.unsafe(`
      revoke all on schema private from public;
      revoke all on schema private from anon;
      revoke all on schema private from authenticated;
    `);

    await sql`
      create table if not exists private.meta_capi_webhook_config (
        id int primary key default 1 check (id = 1),
        webhook_url text not null,
        bearer_secret text not null,
        updated_at timestamptz not null default now()
      )
    `;
    await sql.unsafe(`
      revoke all on table private.meta_capi_webhook_config from public;
      revoke all on table private.meta_capi_webhook_config from anon;
      revoke all on table private.meta_capi_webhook_config from authenticated;
    `);

    await sql`
      insert into private.meta_capi_webhook_config (id, webhook_url, bearer_secret, updated_at)
      values (1, ${WEBHOOK_URL}, ${secret}, now())
      on conflict (id) do update set
        webhook_url = excluded.webhook_url,
        bearer_secret = excluded.bearer_secret,
        updated_at = now()
    `;

    await sql.unsafe(`
      create or replace function public.notify_meta_signup_webhook()
      returns trigger
      language plpgsql
      security definer
      set search_path = public, private, extensions, net
      as $fn$
      declare
        cfg record;
        payload jsonb;
        hdrs jsonb;
        req_id bigint;
      begin
        select webhook_url, bearer_secret into cfg
        from private.meta_capi_webhook_config
        where id = 1;

        if cfg.webhook_url is null or cfg.bearer_secret is null then
          raise warning 'meta_capi_webhook_config missing; skipping signup webhook';
          return NEW;
        end if;

        payload := jsonb_build_object(
          'type', 'INSERT',
          'table', 'users',
          'schema', 'auth',
          'record', jsonb_build_object(
            'id', NEW.id,
            'email', NEW.email,
            'created_at', NEW.created_at,
            'raw_user_meta_data', coalesce(to_jsonb(NEW.raw_user_meta_data), '{}'::jsonb),
            'raw_app_meta_data', coalesce(to_jsonb(NEW.raw_app_meta_data), '{}'::jsonb)
          )
        );

        hdrs := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || cfg.bearer_secret
        );

        select net.http_post(
          url := cfg.webhook_url,
          headers := hdrs,
          body := payload,
          timeout_milliseconds := 5000
        ) into req_id;

        return NEW;
      end;
      $fn$;
    `);

    await sql.unsafe(`
      revoke all on function public.notify_meta_signup_webhook() from public;
      revoke all on function public.notify_meta_signup_webhook() from anon;
      revoke all on function public.notify_meta_signup_webhook() from authenticated;
      grant usage on schema private to postgres, supabase_auth_admin;
      grant select on table private.meta_capi_webhook_config to postgres, supabase_auth_admin;
      grant execute on function public.notify_meta_signup_webhook() to postgres, supabase_auth_admin;
    `);

    await sql.unsafe(`
      drop trigger if exists on_auth_user_created_meta_capi on auth.users;
      create trigger on_auth_user_created_meta_capi
        after insert on auth.users
        for each row
        execute function public.notify_meta_signup_webhook();
    `);

    const check = await sql`
      select tgname
      from pg_trigger
      where tgname = 'on_auth_user_created_meta_capi'
    `;

    console.log(
      JSON.stringify({
        ok: true,
        webhookUrl: WEBHOOK_URL,
        trigger: check[0]?.tgname ?? null,
      })
    );
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

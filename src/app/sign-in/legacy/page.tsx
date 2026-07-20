import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

const PASSTHROUGH_KEYS = [
  "force",
  "redirect_url",
  "ref",
  "inviter",
  "gclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export default async function LegacySignInRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (await hasAnyWebSession()) {
    redirect(resolvePostAuthRedirect(sp.redirect_url));
  }

  const qs = new URLSearchParams();
  for (const key of PASSTHROUGH_KEYS) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) qs.set(key, v.trim());
  }
  redirect(`/sign-in?${qs.toString()}`);
}

import { redirect } from "next/navigation";
import { hasSupabaseWebSession } from "@/lib/auth/web-session-server";
import { pageSeo } from "@/lib/seo/pageSeo";

export const metadata = pageSeo("/sign-up");

/**
 * Sign-up now lives on /sign-in (unified auth page with tabs).
 * This route redirects there, forwarding any relevant query params.
 */
export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const force = sp.force;
  const forceScreen = force === "1" || (typeof force === "string" && force.toLowerCase() === "true");

  if (!forceScreen && (await hasSupabaseWebSession())) {
    redirect("/practice-overview");
  }

  const qs = new URLSearchParams();
  qs.set("mode", "sign-up");

  const passthrough = ["legacy", "ref", "inviter", "gclid", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "redirect_url"] as const;
  for (const key of passthrough) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) qs.set(key, v.trim());
  }
  if (forceScreen) qs.set("force", "1");

  redirect(`/sign-in?${qs.toString()}`);
}

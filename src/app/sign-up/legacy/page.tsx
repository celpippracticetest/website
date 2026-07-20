import { redirect } from "next/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

const PASSTHROUGH_KEYS = [
  "force",
  "redirect_url",
  "ref",
  "inviter",
  "gclid",
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
  "ttclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gad_campaignid",
  "google_ads_campaign_id",
  "checkout_session",
] as const;

export default async function LegacySignUpRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (await hasAnyWebSession()) {
    redirect(resolvePostAuthRedirect(sp.redirect_url));
  }

  const qs = new URLSearchParams();
  qs.set("legacy", "1");
  for (const key of PASSTHROUGH_KEYS) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) qs.set(key, v.trim());
  }
  redirect(`/sign-up?${qs.toString()}`);
}

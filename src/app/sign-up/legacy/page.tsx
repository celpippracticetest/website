import { redirect } from "next/navigation";
import { hasAnyWebSession } from "@/lib/auth/web-session-server";

const PASSTHROUGH_KEYS = [
  "force",
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
  if (await hasAnyWebSession()) redirect("/practice-overview");

  const sp = await searchParams;
  const qs = new URLSearchParams();
  qs.set("legacy", "1");
  for (const key of PASSTHROUGH_KEYS) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) qs.set(key, v.trim());
  }
  redirect(`/sign-up?${qs.toString()}`);
}

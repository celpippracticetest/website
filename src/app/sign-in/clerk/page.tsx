import { redirect } from "next/navigation";
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

export default async function ClerkLegacySignInPage({
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
  redirect(`/sign-in?${qs.toString()}`);
}

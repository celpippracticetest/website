import { redirect } from "next/navigation";

/**
 * /auth has no UI — the unified sign-in/sign-up page lives at /sign-in.
 * Forward any query params so links like /auth?redirect_url=... still work.
 */
export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();

  const passthrough = [
    "mode",
    "redirect_url",
    "force",
    "legacy",
    "ref",
    "error",
  ] as const;

  for (const key of passthrough) {
    const v = sp[key];
    if (typeof v === "string" && v.trim()) qs.set(key, v.trim());
  }

  const query = qs.toString();
  redirect(`/sign-in${query ? `?${query}` : ""}`);
}

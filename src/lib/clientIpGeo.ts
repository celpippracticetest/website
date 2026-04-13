import type { NextRequest } from "next/server";

/**
 * Best-effort client IP from trusted edge headers (Vercel / common proxies).
 * Prefer platform-provided forwarded-for over raw x-forwarded-for when available.
 */
export function getTrustedClientIp(req: NextRequest | Request): string {
  const h = (name: string) => req.headers.get(name)?.trim() ?? "";

  const vercelForwarded = h("x-vercel-forwarded-for");
  if (vercelForwarded) {
    return vercelForwarded.split(",")[0]?.trim() || vercelForwarded;
  }

  const cf = h("cf-connecting-ip");
  if (cf) return cf;

  const forwarded = h("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || forwarded;
  }

  const realIp = h("x-real-ip");
  if (realIp) return realIp;

  const trueClient = h("true-client-ip");
  if (trueClient) return trueClient;

  return "0.0.0.0";
}

/** ISO 3166-1 alpha-2 when available (Vercel / Cloudflare). */
export function getRequestCountry(req: NextRequest | Request): string | null {
  const vercel = req.headers.get("x-vercel-ip-country")?.trim().toUpperCase();
  if (vercel && vercel !== "DEV") return vercel;

  const cf = req.headers.get("cf-ipcountry")?.trim().toUpperCase();
  if (cf && cf !== "XX" && cf !== "T1") return cf;

  return null;
}

export function ipToStableNetworkKey(ip: string): string {
  const s = ip.trim().toLowerCase();
  if (!s || s === "unknown" || s === "0.0.0.0") return "unk";

  if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
    }
    return s;
  }

  const noZone = s.split("%")[0] ?? s;
  const segments = noZone.split(":").filter((x) => x.length > 0);
  if (segments.length >= 3) {
    return `${segments.slice(0, 3).join(":")}::/48`;
  }
  return noZone || "unk";
}

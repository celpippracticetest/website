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

function ipv4DottedParts(s: string): number[] | null {
  const parts = s.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return null;
  }
  return parts;
}

function ipv4ApplyPrefixLen(parts: number[], prefixLen: number): string {
  const clamped = Math.min(32, Math.max(8, prefixLen));
  const hostBits = 32 - clamped;
  const mask =
    hostBits >= 32 ? 0 : hostBits <= 0 ? 0xffffffff : (~((1 << hostBits) - 1)) >>> 0;
  const n = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const masked = (n & mask) >>> 0;
  const a = (masked >>> 24) & 255;
  const b = (masked >>> 16) & 255;
  const c = (masked >>> 8) & 255;
  const d = masked & 255;
  return `${a}.${b}.${c}.${d}/${clamped}`;
}

/**
 * Buckets IPv4 more coarsely than /24 for account-sharing heuristics so paid users
 * behind rotating cloud/CGNAT egress are not blocked as often. IPv6 unchanged (/48).
 * Use env ACCOUNT_SHARING_IPV4_PREFIX in accountSharingSignals (default 20).
 */
export function ipToAccountSharingNetworkKey(ip: string, ipv4PrefixLen: number): string {
  const s = ip.trim().toLowerCase();
  if (!s || s === "unknown" || s === "0.0.0.0") return "unk";

  if (s.includes(".")) {
    const parts = ipv4DottedParts(s);
    if (parts) {
      return ipv4ApplyPrefixLen(parts, ipv4PrefixLen);
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

import { clerkClient } from "@clerk/nextjs/server";

export type DeviceAccessEvaluation =
  | {
      allowed: true;
      activeDevices: number;
      allowedDevices: number;
    }
  | {
      allowed: false;
      code: "DEVICE_LIMIT_EXCEEDED";
      reason: string;
      activeDevices: number;
      allowedDevices: number;
      needsExtraDevices: number;
      currentPlan: string;
    };

type SessionLike = {
  id?: string;
  status?: string;
  updatedAt?: string | number | Date | null;
  lastActiveAt?: string | number | Date | null;
  latestActivity?: {
    updatedAt?: string | number | Date | null;
    isMobile?: boolean;
    deviceType?: string;
    browserName?: string;
    osName?: string;
    ipAddress?: string;
    city?: string;
    country?: string;
    userAgent?: string;
  } | null;
};

const BASE_ALLOWED_DEVICES = 2;

function parseDateMs(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return 0;
}

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const v = value.trim().toLowerCase();
  return v || "unknown";
}

function getDeviceKey(session: SessionLike): string {
  const activity = session.latestActivity ?? {};
  const userAgent = normalizeText(activity.userAgent);
  const uaSignature = userAgent !== "unknown" ? userAgent : "";
  const ipSignature = normalizeText(activity.ipAddress);
  const citySignature = normalizeText(activity.city);
  const countrySignature = normalizeText(activity.country);
  const hasStrongSignal =
    uaSignature.length > 0 ||
    (ipSignature !== "unknown" && ipSignature.length > 0) ||
    citySignature !== "unknown" ||
    countrySignature !== "unknown";

  const baseParts = [
    activity.isMobile ? "mobile" : "desktop",
    normalizeText(activity.deviceType),
    normalizeText(activity.browserName),
    normalizeText(activity.osName),
    uaSignature || "ua-unknown",
    ipSignature,
    citySignature,
    countrySignature,
  ];
  if (hasStrongSignal) {
    return baseParts.join("|");
  }
  // If Clerk activity is too sparse, avoid collapsing multiple sessions into one "device".
  return [...baseParts, session.id || "session-unknown"].join("|");
}

function activeUpdatedAtMs(session: SessionLike): number {
  return Math.max(
    parseDateMs(session.latestActivity?.updatedAt),
    parseDateMs(session.lastActiveAt),
    parseDateMs(session.updatedAt),
  );
}

function metadataNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value >= 0 ? value : fallback;
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return fallback;
}

export function getAllowedDeviceCount(publicMetadata: Record<string, unknown> | null | undefined) {
  const addOns = metadataNumber(publicMetadata?.deviceSeatAddons, 0);
  return BASE_ALLOWED_DEVICES + addOns;
}

export async function evaluateDeviceAccessWithClerk(params: {
  userId: string;
  currentSessionId?: string | null;
  publicMetadata?: Record<string, unknown> | null;
  currentPlan?: string | null;
}): Promise<DeviceAccessEvaluation> {
  const clerk = await clerkClient();
  const { data: allSessions } = await clerk.sessions.getSessionList({
    userId: params.userId,
  });
  const activeSessions = (allSessions as SessionLike[]).filter((s) => s.status === "active");

  const grouped = new Map<string, SessionLike[]>();
  for (const session of activeSessions) {
    const key = getDeviceKey(session);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)?.push(session);
  }

  // Keep only one active session per device key. Prefer current session when present.
  for (const sessions of grouped.values()) {
    sessions.sort((a, b) => activeUpdatedAtMs(b) - activeUpdatedAtMs(a));
    let keepId = sessions[0]?.id;
    if (params.currentSessionId && sessions.some((s) => s.id === params.currentSessionId)) {
      keepId = params.currentSessionId;
    }

    for (const session of sessions) {
      if (!session.id || session.id === keepId) continue;
      try {
        await clerk.sessions.revokeSession(session.id);
      } catch {
        // Best effort: failure to revoke shouldn't break access checks.
      }
    }
  }

  const allowedDevices = getAllowedDeviceCount(params.publicMetadata);
  const activeDevices = grouped.size;
  if (activeDevices <= allowedDevices) {
    return {
      allowed: true,
      activeDevices,
      allowedDevices,
    };
  }

  const needsExtraDevices = activeDevices - allowedDevices;
  const currentPlan = (params.currentPlan || "premium").toString();
  return {
    allowed: false,
    code: "DEVICE_LIMIT_EXCEEDED",
    reason:
      `Your plan allows ${allowedDevices} devices. ` +
      `We detected ${activeDevices} active devices. ` +
      `Add ${needsExtraDevices} more ${needsExtraDevices === 1 ? "device" : "devices"} ` +
      `to continue on this ${currentPlan} plan.`,
    activeDevices,
    allowedDevices,
    needsExtraDevices,
    currentPlan,
  };
}

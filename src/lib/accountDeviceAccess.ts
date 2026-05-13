import type { MobileUserBridge } from "@/lib/auth/supabase-mobile-user-bridge";

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

const BASE_ALLOWED_DEVICES = 2;

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

/**
 * With Supabase Auth, session listing is not mirrored here — treat as a single active device.
 */
export async function evaluateDeviceAccessWithAuth(params: {
  userId: string;
  currentSessionId?: string | null;
  publicMetadata?: Record<string, unknown> | null;
  currentPlan?: string | null;
  user?: MobileUserBridge | null;
}): Promise<DeviceAccessEvaluation> {
  void params.userId;
  void params.currentSessionId;
  const allowedDevices = getAllowedDeviceCount(params.publicMetadata);
  return {
    allowed: true,
    activeDevices: 1,
    allowedDevices,
  };
}

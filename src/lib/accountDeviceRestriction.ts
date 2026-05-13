import { getDb } from "@/lib/appDocumentsClient";
import type { ObjectId } from "bson";
import type { PgCollection } from "@/lib/pg/pgCollection";
import type { AppDoc } from "@/lib/pg/document";

const COLLECTION = "account_device_restrictions";
const DEVICE_BLOCK_MS = 48 * 60 * 60 * 1000;
let indexInitPromise: Promise<void> | null = null;

type DeviceRestrictionDoc = {
  _id?: ObjectId;
  userId: string;
  deviceKey: string;
  sourceSessionId?: string;
  reason: "session_revoked_by_user";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

type SessionActivityLike = {
  isMobile?: boolean;
  deviceType?: string;
  browserName?: string;
  osName?: string;
  userAgent?: string;
} | null;

type SessionLike = {
  latestActivity?: SessionActivityLike;
};

function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const v = value.trim().toLowerCase();
  return v || "unknown";
}

function hasAnySignal(parts: string[]): boolean {
  return parts.some((p) => p !== "unknown");
}

/**
 * Creates a stable device fingerprint that remains consistent across re-logins
 * on the same physical device/browser while avoiding volatile network signals.
 */
export function getStableDeviceKeyFromSession(session: SessionLike | null | undefined): string | null {
  const activity = session?.latestActivity;
  if (!activity) return null;

  const parts = [
    activity.isMobile ? "mobile" : "desktop",
    normalizeText(activity.deviceType),
    normalizeText(activity.browserName),
    normalizeText(activity.osName),
    normalizeText(activity.userAgent),
  ];

  if (!hasAnySignal(parts.slice(1))) return null;
  return parts.join("|");
}

async function ensureIndexes(col: PgCollection<AppDoc>) {
  if (!indexInitPromise) {
    indexInitPromise = Promise.all([
      col.createIndex(
        { userId: 1, deviceKey: 1 },
        { unique: true, name: "user_device_unique" },
      ),
      col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "expiresAt_ttl" }),
    ]).then(() => undefined);
  }

  await indexInitPromise;
}

export async function addDeletedDeviceRestriction(params: {
  userId: string;
  deviceKey: string;
  sourceSessionId?: string;
  now?: Date;
}): Promise<{ expiresAt: Date }> {
  const now = params.now ?? new Date();
  const expiresAt = new Date(now.getTime() + DEVICE_BLOCK_MS);
  const db = await getDb();
  const col = db.collection<DeviceRestrictionDoc>(COLLECTION);
  await ensureIndexes(col);

  await col.updateOne(
    { userId: params.userId, deviceKey: params.deviceKey },
    {
      $set: {
        sourceSessionId: params.sourceSessionId,
        reason: "session_revoked_by_user",
        expiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        userId: params.userId,
        deviceKey: params.deviceKey,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  return { expiresAt };
}

export async function getActiveDeletedDeviceRestriction(params: {
  userId: string;
  deviceKey: string;
  now?: Date;
}): Promise<{ expiresAt: Date } | null> {
  const now = params.now ?? new Date();
  const db = await getDb();
  const col = db.collection<DeviceRestrictionDoc>(COLLECTION);
  await ensureIndexes(col);

  const doc = await col.findOne(
    {
      userId: params.userId,
      deviceKey: params.deviceKey,
      expiresAt: { $gt: now },
    },
    { projection: { expiresAt: 1 } },
  );

  if (!doc?.expiresAt) return null;
  return { expiresAt: doc.expiresAt };
}

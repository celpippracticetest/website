import { getDb } from "@/lib/mongodb";
import { ipToStableNetworkKey } from "@/lib/clientIpGeo";
import type { Collection, ObjectId } from "mongodb";

const COLLECTION = "account_access_signals";

const HOUR_MS = 60 * 60 * 1000;
let uniqueIndexInitPromise: Promise<void> | null = null;

function countryWindowMs() {
  const raw = process.env.ACCOUNT_SHARING_COUNTRY_WINDOW_MINUTES;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  const minutes = Number.isFinite(n) && n > 0 ? n : 22;
  return minutes * 60 * 1000;
}

function maxNetworksPerHour() {
  const raw = process.env.ACCOUNT_SHARING_MAX_NETWORKS_PER_HOUR;
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 26;
}

export type AccountSharingEvaluation = {
  allowed: boolean;
  reason?: string;
};

type RecentNetwork = { t: number; key: string };

type AccountAccessDoc = {
  _id?: ObjectId;
  userId: string;
  countryLastSeen: Record<string, number>;
  recentNetworks: RecentNetwork[];
  updatedAt: Date;
};

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: number }).code === 11000;
}

async function ensureUserIdUniqueIndex(col: Collection<AccountAccessDoc>) {
  if (!uniqueIndexInitPromise) {
    uniqueIndexInitPromise = col
      .createIndex({ userId: 1 }, { unique: true, name: "userId_unique" })
      .then(() => undefined)
      .catch((error: unknown) => {
        uniqueIndexInitPromise = null;
        if (isDuplicateKeyError(error)) {
          return;
        }
        throw error;
      });
  }

  await uniqueIndexInitPromise;
}

function mergeCountryLastSeen(docs: AccountAccessDoc[]): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const doc of docs) {
    for (const [country, ts] of Object.entries(doc.countryLastSeen ?? {})) {
      merged[country] = Math.max(merged[country] ?? 0, ts);
    }
  }
  return merged;
}

function mergeRecentNetworks(docs: AccountAccessDoc[]): RecentNetwork[] {
  const merged = docs.flatMap((doc) => doc.recentNetworks ?? []);
  merged.sort((a, b) => a.t - b.t);
  return merged;
}

/**
 * Detects concurrent use from multiple countries or excessive distinct networks in one hour.
 * Legitimate travel: previous country ages out of the short window before the new one conflicts.
 */
export async function evaluateAccountSharingAccess(
  userId: string,
  ip: string,
  country: string | null,
): Promise<AccountSharingEvaluation> {
  const db = await getDb();
  const col = db.collection<AccountAccessDoc>(COLLECTION);
  await ensureUserIdUniqueIndex(col);

  const networkKey = ipToStableNetworkKey(ip);
  const countryKey = country?.trim() ? country.trim().toUpperCase() : "ZZ";
  const now = Date.now();
  const hourAgo = now - HOUR_MS;
  const countryWindow = countryWindowMs();
  const maxNets = maxNetworksPerHour();

  const insertResult = await col.updateOne(
    { userId },
    {
      $setOnInsert: {
        userId,
        countryLastSeen: { [countryKey]: now },
        recentNetworks: [{ t: now, key: networkKey }],
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  if (insertResult.upsertedCount > 0) {
    return { allowed: true };
  }

  const docs = await col.find({ userId }).sort({ updatedAt: -1 }).toArray();
  if (docs.length === 0) return { allowed: true };

  const primaryDoc = docs[0];
  const primaryDocId = primaryDoc?._id;
  let existing: AccountAccessDoc = primaryDoc;

  if (docs.length > 1) {
    const mergedCountry = mergeCountryLastSeen(docs);
    const mergedNetworks = mergeRecentNetworks(docs);
    const duplicateIds = docs
      .slice(1)
      .map((d) => d._id)
      .filter((id): id is ObjectId => Boolean(id));

    if (primaryDocId) {
      await col.updateOne(
        { _id: primaryDocId },
        {
          $set: {
            countryLastSeen: mergedCountry,
            recentNetworks: mergedNetworks,
            updatedAt: new Date(),
          },
        },
      );
    }

    if (duplicateIds.length > 0) {
      await col.deleteMany({ _id: { $in: duplicateIds } });
      await ensureUserIdUniqueIndex(col);
    }

    existing = {
      ...existing,
      countryLastSeen: mergedCountry,
      recentNetworks: mergedNetworks,
      updatedAt: new Date(),
    };
  }

  const recentNetworks = (existing.recentNetworks ?? []).filter((x) => x.t > hourAgo);
  recentNetworks.push({ t: now, key: networkKey });
  const distinctNetworks = new Set(recentNetworks.map((x) => x.key));

  const countryLastSeen = { ...(existing.countryLastSeen ?? {}), [countryKey]: now };
  for (const k of Object.keys(countryLastSeen)) {
    if (now - countryLastSeen[k] > 24 * HOUR_MS) {
      delete countryLastSeen[k];
    }
  }

  const activeCountries = Object.entries(countryLastSeen).filter(
    ([, t]) => now - t < countryWindow,
  );

  let blocked = false;
  let reason: string | undefined;

  const distinctActiveCountries = new Set(activeCountries.map(([c]) => c));
  if (distinctActiveCountries.size >= 2) {
    blocked = true;
    reason =
      "Your account was used from more than one region within a short time. Subscriptions are for individual use. Sign out, use one device or location, or contact support if this was you.";
  } else if (distinctNetworks.size > maxNets) {
    blocked = true;
    reason =
      "Too many different networks were seen on this account in a short period. If you are not sharing your login, contact support.";
  }

  await col.updateOne(
    primaryDocId ? { _id: primaryDocId } : { userId },
    {
      $set: {
        countryLastSeen,
        recentNetworks,
        updatedAt: new Date(),
      },
    },
  );

  if (blocked) {
    return { allowed: false, reason };
  }
  return { allowed: true };
}

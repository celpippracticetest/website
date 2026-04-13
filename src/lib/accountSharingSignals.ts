import { getDb } from "@/lib/mongodb";
import { ipToStableNetworkKey } from "@/lib/clientIpGeo";

const COLLECTION = "account_access_signals";

const HOUR_MS = 60 * 60 * 1000;

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
  userId: string;
  countryLastSeen: Record<string, number>;
  recentNetworks: RecentNetwork[];
  updatedAt: Date;
};

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

  const networkKey = ipToStableNetworkKey(ip);
  const countryKey = country?.trim() ? country.trim().toUpperCase() : "ZZ";
  const now = Date.now();
  const hourAgo = now - HOUR_MS;
  const countryWindow = countryWindowMs();
  const maxNets = maxNetworksPerHour();

  const existing = await col.findOne({ userId });

  if (!existing) {
    await col.insertOne({
      userId,
      countryLastSeen: { [countryKey]: now },
      recentNetworks: [{ t: now, key: networkKey }],
      updatedAt: new Date(),
    });
    return { allowed: true };
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
    { userId },
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

import "server-only";

import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import documentsClient from "@/lib/appDocumentsClient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/subscriptionAccess";
import {
  customerMatchEmailHash,
  findOrCreateCustomerMatchAudience,
  readGoogleDataManagerConfig,
  refreshGoogleDataManagerAccessToken,
  sendCustomerMatchAudienceMembers,
  uniqueSorted,
} from "@/lib/google-ads/data-manager-client";

const DEFAULT_CUSTOMER_ID = "8641929017";
const SUPABASE_PAGE_SIZE = 100;

type AudienceKey = "signed_up" | "subscribers";

type CustomerMatchAudienceConfig = {
  key: AudienceKey;
  displayName: string;
  description: string;
  integrationCode: string;
  configuredAudienceId?: string;
  memberHashes: string[];
  removeStaleMembers: boolean;
};

type AudienceSyncState = {
  _id: string;
  audienceKey: AudienceKey;
  customerId: string;
  audienceId: string;
  displayName: string;
  memberHashes: string[];
  lastSyncedAt: Date;
  lastIngestRequestIds: string[];
  lastRemoveRequestIds: string[];
  createdAt?: Date;
  updatedAt: Date;
};

export type CustomerMatchAudienceSyncResult = {
  key: AudienceKey;
  displayName: string;
  audienceId: string;
  skippedUploadReason?: string;
  membersFound: number;
  membersUploaded: number;
  staleMembersRemoved: number;
  ingestRequestIds: string[];
  removeRequestIds: string[];
};

export type CustomerMatchSyncResult = {
  ok: true;
  validateOnly: boolean;
  customerId: string;
  audiences: CustomerMatchAudienceSyncResult[];
};

function readConfig() {
  return readGoogleDataManagerConfig({
    defaultCustomerId: DEFAULT_CUSTOMER_ID,
  });
}

function readUserMetadataValue(user: SupabaseAuthUser, key: string) {
  return user.app_metadata?.[key] ?? user.user_metadata?.[key];
}

function hasUnexpiredPlan(user: SupabaseAuthUser, now: Date) {
  const expiresAt = readUserMetadataValue(user, "planExpiresAt");
  if (typeof expiresAt !== "string" || !expiresAt.trim()) return true;
  const expiresMs = Date.parse(expiresAt);
  return Number.isFinite(expiresMs) ? expiresMs > now.getTime() : true;
}

function isActiveSubscriber(user: SupabaseAuthUser, now: Date) {
  return normalizePlan(readUserMetadataValue(user, "plan") as string | undefined) === "plus" &&
    hasUnexpiredPlan(user, now);
}

async function listSupabaseUsers() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error(
      "Supabase admin is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const users: SupabaseAuthUser[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: SUPABASE_PAGE_SIZE,
    });
    if (error) throw error;

    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);

    const total = data?.total ?? 0;
    if (pageUsers.length < SUPABASE_PAGE_SIZE) break;
    if (total > 0 && users.length >= total) break;
  }
  return users;
}

function audienceStateId(config: ReturnType<typeof readConfig>, key: AudienceKey) {
  return `google_ads_customer_match:${config.customerId}:${key}`;
}

async function loadPreviousHashes(config: ReturnType<typeof readConfig>, key: AudienceKey) {
  const state = await documentsClient
    .db()
    .collection<AudienceSyncState>("googleAdsCustomerMatchAudienceSyncs")
    .findOne({ _id: audienceStateId(config, key) });
  return Array.isArray(state?.memberHashes) ? state.memberHashes : [];
}

async function saveAudienceState(
  config: ReturnType<typeof readConfig>,
  audience: CustomerMatchAudienceConfig,
  audienceId: string,
  ingestRequestIds: string[],
  removeRequestIds: string[],
) {
  const now = new Date();
  await documentsClient
    .db()
    .collection<AudienceSyncState>("googleAdsCustomerMatchAudienceSyncs")
    .updateOne(
      { _id: audienceStateId(config, audience.key) },
      {
        $set: {
          audienceKey: audience.key,
          customerId: config.customerId,
          audienceId,
          displayName: audience.displayName,
          memberHashes: audience.memberHashes,
          lastSyncedAt: now,
          lastIngestRequestIds: ingestRequestIds,
          lastRemoveRequestIds: removeRequestIds,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );
}

function buildAudiences(users: SupabaseAuthUser[]): CustomerMatchAudienceConfig[] {
  const now = new Date();
  const signedUpHashes = users
    .map((user) => (user.email ? customerMatchEmailHash(user.email) : null))
    .filter((hash): hash is string => Boolean(hash));
  const subscriberHashes = users
    .filter((user) => isActiveSubscriber(user, now))
    .map((user) => (user.email ? customerMatchEmailHash(user.email) : null))
    .filter((hash): hash is string => Boolean(hash));

  return [
    {
      key: "signed_up",
      displayName: "CELPIP - Signed Up Users",
      description: "Supabase users who signed up for CELPIP Practice Test.",
      integrationCode: "celpip_signed_up_users",
      configuredAudienceId: process.env.GOOGLE_ADS_SIGNED_UP_AUDIENCE_ID?.trim(),
      memberHashes: uniqueSorted(signedUpHashes),
      removeStaleMembers: process.env.GOOGLE_CUSTOMER_MATCH_REMOVE_STALE_SIGNUPS === "true",
    },
    {
      key: "subscribers",
      displayName: "CELPIP - Subscribers",
      description: "Supabase users with active Plus access for CELPIP Practice Test.",
      integrationCode: "celpip_subscribers",
      configuredAudienceId: process.env.GOOGLE_ADS_SUBSCRIBERS_AUDIENCE_ID?.trim(),
      memberHashes: uniqueSorted(subscriberHashes),
      removeStaleMembers: process.env.GOOGLE_CUSTOMER_MATCH_REMOVE_STALE_SUBSCRIBERS !== "false",
    },
  ];
}

export async function syncGoogleAdsCustomerMatchAudiences(args: {
  validateOnly?: boolean;
} = {}): Promise<CustomerMatchSyncResult> {
  const validateOnly = args.validateOnly === true;
  const config = readConfig();
  const [users, accessToken] = await Promise.all([
    listSupabaseUsers(),
    refreshGoogleDataManagerAccessToken(config),
  ]);
  const audiences = buildAudiences(users);
  const results: CustomerMatchAudienceSyncResult[] = [];

  for (const audience of audiences) {
    const userList = await findOrCreateCustomerMatchAudience(
      config,
      accessToken,
      audience,
      validateOnly,
    );
    const audienceId = userList.id;
    if (!audienceId) {
      if (validateOnly) {
        results.push({
          key: audience.key,
          displayName: audience.displayName,
          audienceId: "(would be created)",
          skippedUploadReason:
            "validateOnly checked audience creation, but upload validation requires an existing audience ID.",
          membersFound: audience.memberHashes.length,
          membersUploaded: 0,
          staleMembersRemoved: 0,
          ingestRequestIds: [],
          removeRequestIds: [],
        });
        continue;
      }

      throw new Error(`Missing audience id for ${audience.displayName}.`);
    }

    const previousHashes = validateOnly
      ? []
      : await loadPreviousHashes(config, audience.key);
    const currentSet = new Set(audience.memberHashes);
    const staleHashes = audience.removeStaleMembers
      ? previousHashes.filter((hash) => !currentSet.has(hash))
      : [];

    const ingestRequestIds = await sendCustomerMatchAudienceMembers(
      config,
      accessToken,
      audienceId,
      audience.memberHashes,
      "ingest",
      validateOnly,
    );
    const removeRequestIds = await sendCustomerMatchAudienceMembers(
      config,
      accessToken,
      audienceId,
      staleHashes,
      "remove",
      validateOnly,
    );

    if (!validateOnly) {
      await saveAudienceState(
        config,
        audience,
        audienceId,
        ingestRequestIds,
        removeRequestIds,
      );
    }

    results.push({
      key: audience.key,
      displayName: audience.displayName,
      audienceId,
      membersFound: audience.memberHashes.length,
      membersUploaded: audience.memberHashes.length,
      staleMembersRemoved: staleHashes.length,
      ingestRequestIds,
      removeRequestIds,
    });
  }

  return {
    ok: true,
    validateOnly,
    customerId: config.customerId,
    audiences: results,
  };
}

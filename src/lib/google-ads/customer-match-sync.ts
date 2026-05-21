import "server-only";

import { createHash } from "crypto";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
import documentsClient from "@/lib/appDocumentsClient";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/subscriptionAccess";

const DATA_MANAGER_BASE_URL =
  process.env.GOOGLE_DATA_MANAGER_API_BASE_URL?.trim() ||
  "https://datamanager.googleapis.com/v1";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const DEFAULT_CUSTOMER_ID = "8641929017";
const SUPABASE_PAGE_SIZE = 100;
const CUSTOMER_MATCH_BATCH_SIZE = 10000;

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

type GoogleDataManagerConfig = {
  customerId: string;
  loginCustomerId: string | null;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  membershipDurationSeconds: number | null;
};

type UserList = {
  id?: string;
  name?: string;
  displayName?: string;
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

function requiredEnv(name: string, fallbackName?: string): string {
  const value = process.env[name]?.trim() || (fallbackName ? process.env[fallbackName]?.trim() : "");
  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing env: ${name} or ${fallbackName}.`
        : `Missing env: ${name}.`,
    );
  }
  return value;
}

function normalizedCustomerId(value: string | undefined, fallback = "") {
  return (value || fallback).trim().replace(/-/g, "");
}

function readConfig(): GoogleDataManagerConfig {
  const customerId = normalizedCustomerId(
    process.env.GOOGLE_ADS_CUSTOMER_ID,
    DEFAULT_CUSTOMER_ID,
  );
  const loginCustomerId =
    normalizedCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) || null;
  const membershipDays = Number(process.env.GOOGLE_CUSTOMER_MATCH_MEMBERSHIP_DAYS || "");
  return {
    customerId,
    loginCustomerId,
    clientId: requiredEnv("GOOGLE_ADS_CLIENT_ID", "GOOGLE_CLIENT_ID"),
    clientSecret: requiredEnv("GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"),
    refreshToken: requiredEnv("GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_REFRESH_TOKEN"),
    membershipDurationSeconds:
      Number.isFinite(membershipDays) && membershipDays > 0
        ? Math.floor(membershipDays) * 86400
        : null,
  };
}

function normalizeEmailForCustomerMatch(email: string) {
  return email.trim().toLowerCase().replace(/\s+/g, "");
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

function customerMatchEmailHash(email: string) {
  const normalized = normalizeEmailForCustomerMatch(email);
  if (!normalized || !normalized.includes("@")) return null;
  return sha256Hex(normalized);
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

async function refreshAccessToken(config: GoogleDataManagerConfig) {
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    throw new Error(
      `Google OAuth failed: ${payload.error_description || payload.error || response.status}`,
    );
  }
  return payload.access_token as string;
}

function resourceManagementHeaders(config: GoogleDataManagerConfig, accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(config.loginCustomerId
      ? { "login-account": `accountTypes/GOOGLE_ADS/accounts/${config.loginCustomerId}` }
      : {}),
  };
}

function ingestionHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

function accountParent(config: GoogleDataManagerConfig) {
  return `accountTypes/GOOGLE_ADS/accounts/${config.customerId}`;
}

async function dataManagerJson<T>(
  url: string,
  init: RequestInit,
  action: string,
): Promise<T> {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || JSON.stringify(payload) || response.status;
    throw new Error(`${action} failed: ${message}`);
  }
  return payload as T;
}

async function listUserLists(config: GoogleDataManagerConfig, accessToken: string) {
  const userLists: UserList[] = [];
  let pageToken = "";

  do {
    const url = new URL(`${DATA_MANAGER_BASE_URL}/${accountParent(config)}/userLists`);
    url.searchParams.set("pageSize", "1000");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const payload = await dataManagerJson<{ userLists?: UserList[]; nextPageToken?: string }>(
      url.toString(),
      { method: "GET", headers: resourceManagementHeaders(config, accessToken) },
      "Data Manager userLists.list",
    );
    userLists.push(...(payload.userLists ?? []));
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return userLists;
}

async function createUserList(
  config: GoogleDataManagerConfig,
  accessToken: string,
  audience: CustomerMatchAudienceConfig,
  validateOnly: boolean,
) {
  const url = new URL(`${DATA_MANAGER_BASE_URL}/${accountParent(config)}/userLists`);
  if (validateOnly) url.searchParams.set("validateOnly", "true");

  const body: Record<string, unknown> = {
    displayName: audience.displayName,
    description: audience.description,
    integrationCode: audience.integrationCode,
    membershipStatus: "OPEN",
    ingestedUserListInfo: {
      contactIdInfo: {
        dataSourceType: "DATA_SOURCE_TYPE_FIRST_PARTY",
      },
      uploadKeyTypes: ["CONTACT_ID"],
    },
  };
  if (config.membershipDurationSeconds) {
    body.membershipDuration = `${config.membershipDurationSeconds}s`;
  }

  return dataManagerJson<UserList>(
    url.toString(),
    {
      method: "POST",
      headers: resourceManagementHeaders(config, accessToken),
      body: JSON.stringify(body),
    },
    `Data Manager userLists.create (${audience.displayName})`,
  );
}

async function findOrCreateAudience(
  config: GoogleDataManagerConfig,
  accessToken: string,
  audience: CustomerMatchAudienceConfig,
  validateOnly: boolean,
) {
  if (audience.configuredAudienceId) {
    return { id: audience.configuredAudienceId, displayName: audience.displayName };
  }

  const existing = (await listUserLists(config, accessToken)).find(
    (list) => list.displayName === audience.displayName,
  );
  if (existing?.id) return existing;

  try {
    const created = await createUserList(config, accessToken, audience, validateOnly);
    if (created.id) return created;
  } catch (error) {
    const refreshed = (await listUserLists(config, accessToken)).find(
      (list) => list.displayName === audience.displayName,
    );
    if (refreshed?.id) return refreshed;
    throw error;
  }

  if (validateOnly) {
    return { id: `validate-only-${audience.key}`, displayName: audience.displayName };
  }

  throw new Error(`Audience was created without an id: ${audience.displayName}`);
}

function buildDestination(config: GoogleDataManagerConfig, audienceId: string) {
  return {
    operatingAccount: {
      accountType: "GOOGLE_ADS",
      accountId: config.customerId,
    },
    ...(config.loginCustomerId
      ? {
          loginAccount: {
            accountType: "GOOGLE_ADS",
            accountId: config.loginCustomerId,
          },
        }
      : {}),
    productDestinationId: audienceId,
  };
}

function audienceMembersFromHashes(memberHashes: string[]) {
  return memberHashes.map((hash) => ({
    userData: {
      userIdentifiers: [{ emailAddress: hash }],
    },
  }));
}

async function sendAudienceMembers(
  config: GoogleDataManagerConfig,
  accessToken: string,
  audienceId: string,
  memberHashes: string[],
  operation: "ingest" | "remove",
  validateOnly: boolean,
) {
  const requestIds: string[] = [];
  for (let i = 0; i < memberHashes.length; i += CUSTOMER_MATCH_BATCH_SIZE) {
    const batch = memberHashes.slice(i, i + CUSTOMER_MATCH_BATCH_SIZE);
    if (batch.length === 0) continue;

    const payload = await dataManagerJson<{ requestId?: string }>(
      `${DATA_MANAGER_BASE_URL}/audienceMembers:${operation}`,
      {
        method: "POST",
        headers: ingestionHeaders(accessToken),
        body: JSON.stringify({
          destinations: [buildDestination(config, audienceId)],
          audienceMembers: audienceMembersFromHashes(batch),
          encoding: "HEX",
          validateOnly,
          ...(operation === "ingest"
            ? {
                termsOfService: {
                  customerMatchTermsOfServiceStatus: "ACCEPTED",
                },
              }
            : {}),
        }),
      },
      `Data Manager audienceMembers.${operation}`,
    );
    if (payload.requestId) requestIds.push(payload.requestId);
  }
  return requestIds;
}

function audienceStateId(config: GoogleDataManagerConfig, key: AudienceKey) {
  return `google_ads_customer_match:${config.customerId}:${key}`;
}

async function loadPreviousHashes(config: GoogleDataManagerConfig, key: AudienceKey) {
  const state = await documentsClient
    .db()
    .collection<AudienceSyncState>("googleAdsCustomerMatchAudienceSyncs")
    .findOne({ _id: audienceStateId(config, key) });
  return Array.isArray(state?.memberHashes) ? state.memberHashes : [];
}

async function saveAudienceState(
  config: GoogleDataManagerConfig,
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
    refreshAccessToken(config),
  ]);
  const audiences = buildAudiences(users);
  const results: CustomerMatchAudienceSyncResult[] = [];

  for (const audience of audiences) {
    const userList = await findOrCreateAudience(config, accessToken, audience, validateOnly);
    const audienceId = userList.id;
    if (!audienceId) {
      throw new Error(`Missing audience id for ${audience.displayName}.`);
    }

    const previousHashes = validateOnly
      ? []
      : await loadPreviousHashes(config, audience.key);
    const currentSet = new Set(audience.memberHashes);
    const staleHashes = audience.removeStaleMembers
      ? previousHashes.filter((hash) => !currentSet.has(hash))
      : [];

    const ingestRequestIds = await sendAudienceMembers(
      config,
      accessToken,
      audienceId,
      audience.memberHashes,
      "ingest",
      validateOnly,
    );
    const removeRequestIds = await sendAudienceMembers(
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

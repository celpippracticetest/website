import "server-only";

import { createHash } from "crypto";

export const DATA_MANAGER_BASE_URL =
  process.env.GOOGLE_DATA_MANAGER_API_BASE_URL?.trim() ||
  "https://datamanager.googleapis.com/v1";

const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const CUSTOMER_MATCH_BATCH_SIZE = 10000;

export type GoogleDataManagerConfig = {
  customerId: string;
  loginCustomerId: string | null;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  membershipDurationSeconds: number | null;
};

export type CustomerMatchAudienceDefinition = {
  displayName: string;
  description: string;
  integrationCode: string;
  configuredAudienceId?: string;
  memberHashes: string[];
};

type UserList = {
  id?: string;
  name?: string;
  displayName?: string;
};

export type ReadGoogleDataManagerConfigOptions = {
  customerId?: string;
  loginCustomerId?: string | null;
  customerIdEnv?: string;
  loginCustomerIdEnv?: string;
  defaultCustomerId?: string;
};

function requiredEnv(name: string, fallbackName?: string): string {
  const value =
    process.env[name]?.trim() ||
    (fallbackName ? process.env[fallbackName]?.trim() : "");
  if (!value) {
    throw new Error(
      fallbackName
        ? `Missing env: ${name} or ${fallbackName}.`
        : `Missing env: ${name}.`,
    );
  }
  return value;
}

export function normalizedCustomerId(value: string | undefined, fallback = "") {
  return (value || fallback).trim().replace(/-/g, "");
}

export function readGoogleDataManagerConfig(
  options: ReadGoogleDataManagerConfigOptions = {},
): GoogleDataManagerConfig {
  const customerIdEnv = options.customerIdEnv ?? "GOOGLE_ADS_CUSTOMER_ID";
  const loginCustomerIdEnv =
    options.loginCustomerIdEnv ?? "GOOGLE_ADS_LOGIN_CUSTOMER_ID";
  const customerId =
    options.customerId ??
    normalizedCustomerId(
      process.env[customerIdEnv],
      options.defaultCustomerId ?? "",
    );
  const loginCustomerId =
    options.loginCustomerId ??
    (normalizedCustomerId(process.env[loginCustomerIdEnv]) || null);
  const membershipDays = Number(process.env.GOOGLE_CUSTOMER_MATCH_MEMBERSHIP_DAYS || "");

  if (!customerId) {
    throw new Error(`Missing Google Ads customer id (${customerIdEnv}).`);
  }

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

export function normalizeEmailForCustomerMatch(email: string) {
  return email.trim().toLowerCase().replace(/\s+/g, "");
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort();
}

export function customerMatchEmailHash(email: string) {
  const normalized = normalizeEmailForCustomerMatch(email);
  if (!normalized || !normalized.includes("@")) return null;
  return sha256Hex(normalized);
}

export function customerMatchNameHash(namePart: string) {
  const normalized = namePart.trim().toLowerCase();
  if (!normalized) return null;
  return sha256Hex(normalized);
}

export async function refreshGoogleDataManagerAccessToken(
  config: GoogleDataManagerConfig,
) {
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

function resourceManagementHeaders(
  config: GoogleDataManagerConfig,
  accessToken: string,
) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(config.loginCustomerId
      ? {
          "login-account": `accountTypes/GOOGLE_ADS/accounts/${config.loginCustomerId}`,
        }
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
    const errorPayload = payload?.error ?? payload;
    const message =
      errorPayload?.message ||
      errorPayload?.status ||
      JSON.stringify(errorPayload) ||
      response.status;
    const details = Array.isArray(errorPayload?.details)
      ? ` Details: ${JSON.stringify(errorPayload.details)}`
      : "";
    throw new Error(`${action} failed (${response.status}): ${message}${details}`);
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
  audience: CustomerMatchAudienceDefinition,
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

export async function findOrCreateCustomerMatchAudience(
  config: GoogleDataManagerConfig,
  accessToken: string,
  audience: CustomerMatchAudienceDefinition,
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
    return { displayName: audience.displayName };
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

export async function sendCustomerMatchAudienceMembers(
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

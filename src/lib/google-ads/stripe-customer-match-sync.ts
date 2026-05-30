import "server-only";

import {
  findOrCreateCustomerMatchAudience,
  readGoogleDataManagerConfig,
  refreshGoogleDataManagerAccessToken,
  sendCustomerMatchAudienceMembers,
} from "@/lib/google-ads/data-manager-client";
import { fetchStripePayingCustomerEmailHashes } from "@/lib/google-ads/stripe-paying-customers";

const STRIPE_ACCOUNT_CUSTOMER_ID = "4183784250";
const STRIPE_ACCOUNT_LOGIN_CUSTOMER_ID = "6079555378";

export type StripeCustomerMatchSyncResult = {
  ok: true;
  validateOnly: boolean;
  customerId: string;
  displayName: string;
  audienceId: string;
  membersFound: number;
  membersUploaded: number;
  ingestRequestIds: string[];
  skippedUploadReason?: string;
};

function readStripeAudienceConfig() {
  const audienceId = process.env.GOOGLE_ADS_STRIPE_PAYING_AUDIENCE_ID?.trim();
  const displayName =
    process.env.GOOGLE_ADS_STRIPE_PAYING_AUDIENCE_NAME?.trim() ||
    `Stripe Customers ${new Date().toISOString().slice(0, 10)}`;

  return {
    displayName,
    description: "Stripe paying customers synced via Data Manager API.",
    integrationCode: "celpip_stripe_paying_customers",
    configuredAudienceId: audienceId,
  };
}

export async function syncStripePayingCustomersCustomerMatch(args: {
  validateOnly?: boolean;
} = {}): Promise<StripeCustomerMatchSyncResult> {
  const validateOnly = args.validateOnly === true;
  const config = readGoogleDataManagerConfig({
    customerIdEnv: "GOOGLE_ADS_STRIPE_CUSTOMER_ID",
    loginCustomerIdEnv: "GOOGLE_ADS_STRIPE_LOGIN_CUSTOMER_ID",
    defaultCustomerId: STRIPE_ACCOUNT_CUSTOMER_ID,
  });

  if (!config.loginCustomerId) {
    config.loginCustomerId = STRIPE_ACCOUNT_LOGIN_CUSTOMER_ID;
  }

  const audienceMeta = readStripeAudienceConfig();
  const [memberHashes, accessToken] = await Promise.all([
    fetchStripePayingCustomerEmailHashes(),
    refreshGoogleDataManagerAccessToken(config),
  ]);

  const audience = {
    ...audienceMeta,
    memberHashes,
  };

  const userList = await findOrCreateCustomerMatchAudience(
    config,
    accessToken,
    audience,
    validateOnly,
  );
  const audienceId = userList.id;

  if (!audienceId) {
    return {
      ok: true,
      validateOnly,
      customerId: config.customerId,
      displayName: audience.displayName,
      audienceId: "(would be created)",
      membersFound: memberHashes.length,
      membersUploaded: 0,
      ingestRequestIds: [],
      skippedUploadReason:
        "validateOnly checked audience creation, but upload validation requires an existing audience ID.",
    };
  }

  if (memberHashes.length === 0) {
    return {
      ok: true,
      validateOnly,
      customerId: config.customerId,
      displayName: audience.displayName,
      audienceId,
      membersFound: 0,
      membersUploaded: 0,
      ingestRequestIds: [],
      skippedUploadReason: "No paying Stripe customers found.",
    };
  }

  const ingestRequestIds = await sendCustomerMatchAudienceMembers(
    config,
    accessToken,
    audienceId,
    memberHashes,
    "ingest",
    validateOnly,
  );

  return {
    ok: true,
    validateOnly,
    customerId: config.customerId,
    displayName: audience.displayName,
    audienceId,
    membersFound: memberHashes.length,
    membersUploaded: memberHashes.length,
    ingestRequestIds,
  };
}

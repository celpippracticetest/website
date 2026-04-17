import dns from "node:dns";
import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;

/** Atlas + Node on Windows often hits TLS "alert 80" when the OS prefers a broken IPv6 path; IPv4 usually works. */
const preferIpv4ForMongo =
  process.env.MONGODB_USE_IPV6 !== "1" &&
  process.env.MONGODB_USE_IPV6 !== "true" &&
  (process.env.MONGODB_FORCE_IPV4 === "1" ||
    process.env.MONGODB_FORCE_IPV4 === "true" ||
    process.platform === "win32");

if (preferIpv4ForMongo && typeof dns.setDefaultResultOrder === "function") {
  try {
    dns.setDefaultResultOrder("ipv4first");
  } catch {
    // Older Node — ignore
  }
}

const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
  ...(preferIpv4ForMongo
    ? {
        // Node 18+ / driver: avoid happy-eyeballs IPv6 attempts that fail TLS to Atlas on some Windows networks.
        autoSelectFamily: false,
      }
    : {}),
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  // In non-production environments (local dev, tests, CI without DB),
  // avoid throwing at module import time so that pages and tests can run
  // without a configured MongoDB instance. Any code that actually tries
  // to access the database will still fail with a clear error.
  if (process.env.NODE_ENV === "production") {
    throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
  } else {
    console.warn(
      'MongoDB is not configured because "MONGODB_URI" is missing. ' +
        "This is allowed in non-production environments (e.g. Playwright tests), " +
        "but any attempt to access the database will fail."
    );
  }
} else if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
    _mongoClientPromise?: Promise<MongoClient>;
    /** Bump when Mongo defaults change so we do not reuse a bad pool from an older HMR graph. */
    _mongoDevInitVersion?: number;
  };

  const DEV_CLIENT_INIT_VERSION = 3;

  const topology = globalWithMongo._mongoClient?.topology as
    | { isDestroyed?: () => boolean; s?: { state?: string } }
    | undefined;
  const topologyDead =
    topology?.isDestroyed?.() === true || topology?.s?.state === "closed";

  const needsNewClient =
    !globalWithMongo._mongoClient ||
    globalWithMongo._mongoDevInitVersion !== DEV_CLIENT_INIT_VERSION ||
    topologyDead;

  if (needsNewClient) {
    if (globalWithMongo._mongoClient) {
      void globalWithMongo._mongoClient.close().catch(() => undefined);
    }
    globalWithMongo._mongoDevInitVersion = DEV_CLIENT_INIT_VERSION;
    globalWithMongo._mongoClient = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect();
  }

  client = globalWithMongo._mongoClient;
  clientPromise = globalWithMongo._mongoClientPromise || client.connect();
} else if (uri) {
  // In production mode (or other non-dev environments with URI),
  // it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
// Note: when MONGODB_URI is missing in non-production environments,
// this client will be null and any direct usage should be guarded.
export default client as MongoClient;

// Helper function to get database instance
export async function getDb() {
  if (!uri || !clientPromise || !client) {
    throw new Error(
      'MongoDB client is not initialized because "MONGODB_URI" is missing. ' +
        "Configure it in your environment to use database features."
    );
  }

  await clientPromise;
  return client.db();
}

import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

if (!uri) {
  // In non-production environments (local dev, tests, CI without DB),
  // or during build time on Vercel, avoid throwing at module import time.
  // This allows the build to complete even if environment variables are not present.
  // Any code that actually tries to access the database at runtime will still fail.
  console.warn(
    'MongoDB is not configured because "MONGODB_URI" is missing. ' +
      "This is allowed during build time and in non-production environments, " +
      "but any attempt to access the database at runtime will fail."
  );
} else if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClient?: MongoClient;
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClient) {
    globalWithMongo._mongoClient = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect();
  } else {
    // Check if the existing client's topology is closed (happens during HMR)
    // @ts-ignore - accessing internal topology for connection state check
    if (
      globalWithMongo._mongoClient.topology?.isDestroyed() ||
      // @ts-ignore - accessing internal topology state
      globalWithMongo._mongoClient.topology?.s?.state === "closed"
    ) {
      globalWithMongo._mongoClient = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect();
    }
  }

  client = globalWithMongo._mongoClient;
  clientPromise = globalWithMongo._mongoClientPromise || client.connect();
} else {
  // In production mode (or other non-dev environments with URI),
  // it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
// Note: when MONGODB_URI is missing, this client will be null.
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

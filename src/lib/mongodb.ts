import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 45000,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
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
    if (globalWithMongo._mongoClient.topology?.isDestroyed() || globalWithMongo._mongoClient.topology?.s?.state === 'closed') {
      console.log("MongoDB client topology was closed, reconnecting...");
      globalWithMongo._mongoClient = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = globalWithMongo._mongoClient.connect();
    }
  }

  client = globalWithMongo._mongoClient;
  clientPromise = globalWithMongo._mongoClientPromise || client.connect();
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export a module-scoped MongoClient. By doing this in a
// separate module, the client can be shared across functions.
export default client;

// Helper function to get database instance
export async function getDb() {
  await clientPromise;
  return client.db();
}

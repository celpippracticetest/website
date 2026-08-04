import "./bootstrap-website-env";
import { MongoClient } from "mongodb";
import { applyOptionalMongoDnsServers } from "./mongo-pg-sync-shared";

async function main() {
  const mongoUri = process.env.MONGODB_URI!.trim();
  applyOptionalMongoDnsServers();
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();

  const admin = mongo.db().admin();
  const dbs = await admin.listDatabases();
  console.log(
    "databases:",
    dbs.databases.map((d) => `${d.name}(${d.sizeOnDisk})`).join(", ")
  );

  for (const name of ["prod", "test", "development", "website"]) {
    try {
      const db = mongo.db(name);
      const cols = await db.listCollections().toArray();
      const blogish = cols.filter((c) => /blog/i.test(c.name));
      if (blogish.length || name === "prod") {
        console.log(
          `\n[${name}] collections with blog:`,
          blogish.map((c) => c.name).join(", ") || "(none)"
        );
      }
      for (const c of blogish) {
        const count = await db.collection(c.name).countDocuments();
        const sample = await db.collection(c.name).findOne({
          $or: [
            { slug: "speaking-fluency-daily-practice-routine" },
            { slug: /fluency/i },
            { title: /fluency/i },
          ],
        });
        console.log(`  ${c.name}: count=${count}, fluencyHit=${sample ? sample.slug || sample.title : null}`);
      }
    } catch (e) {
      console.log(`[${name}] error`, (e as Error).message);
    }
  }

  // Also search prod blogs for recent July dates
  const prod = mongo.db("prod");
  const recent = await prod
    .collection("blogs")
    .find({})
    .project({ slug: 1, title: 1, status: 1, publishedAt: 1, updatedAt: 1 })
    .sort({ updatedAt: -1 })
    .limit(15)
    .toArray();
  console.log("\nMost recently updated Mongo blogs:");
  for (const r of recent) {
    console.log(
      `- ${r.status} ${r.slug} | ${r.title?.toString?.().slice(0, 60)} | pub=${r.publishedAt} upd=${r.updatedAt}`
    );
  }

  await mongo.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

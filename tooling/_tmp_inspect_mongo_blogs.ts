import "./bootstrap-website-env";
import { MongoClient } from "mongodb";
import {
  applyOptionalMongoDnsServers,
  mongoDriverDocToBson7,
} from "./mongo-pg-sync-shared";

async function main() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) throw new Error("MONGODB_URI required");
  applyOptionalMongoDnsServers();
  const mongo = new MongoClient(mongoUri);
  await mongo.connect();
  const dbName = process.env.MONGODB_DB_NAME?.trim() || process.env.MONGODB_DB?.trim();
  const mdb = dbName ? mongo.db(dbName) : mongo.db();
  const coll = mdb.collection("blogs");
  const total = await coll.countDocuments();
  console.log("db:", mdb.databaseName, "count:", total);

  const samples = await coll.find({}).limit(3).toArray();
  for (const doc of samples) {
    const keys = Object.keys(doc);
    const d = mongoDriverDocToBson7(doc);
    console.log("---");
    console.log("keys:", keys.join(", "));
    console.log(
      JSON.stringify(
        {
          _id: String(doc._id),
          _idType: doc._id?.constructor?.name,
          slug: doc.slug,
          title: doc.title,
          status: doc.status,
          hasContentHtml: doc.contentHtml != null,
          hasContent_html: (doc as any).content_html != null,
          publishedAt: doc.publishedAt,
          convertedSlug: d.slug,
          convertedTitle: d.title,
          convertedId: String(d._id),
          convertedIdType: d._id?.constructor?.name,
        },
        null,
        2
      )
    );
  }

  // status/slug stats
  const withSlug = await coll.countDocuments({ slug: { $exists: true, $ne: "" } });
  const published = await coll.countDocuments({ status: "published" });
  console.log({ withSlug, published });

  const liveSlugs = [
    "speaking-fluency-daily-practice-routine",
    "celtestpipcom-alternatives",
  ];
  for (const slug of liveSlugs) {
    const hit = await coll.findOne({ slug });
    console.log("live slug", slug, hit ? { id: String(hit._id), title: hit.title, status: hit.status } : null);
  }

  await mongo.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

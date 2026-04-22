/**
 * One-off: fix profession_pages internal links reported 2026-04-22
 * (see docs/Issues/celpippracticetest.com_internal_broken_links_20260422.csv)
 */
import "dotenv/config";
import { MongoClient } from "mongodb";

const URL_MAP = {
  "/celpip-for-medical-laboratory-technologist": "/celpip-for-medical-radiological-technologists",
  "/celpip-vs-ielts": "/blog/celpip-vs-ielts-format-fees-scoring",
  "/celpip-speaking-tips-for-healthcare": "/wiki/celpip-speaking-tips-high-score",
  "/how-to-score-clb-7-on-celpip-for-nursing": "/celpip-for-nurses",
  "/ircc-language-requirements-for-nurses": "/blog/celpip-2026-canadian-immigration-updates",
  "/pass-celpip-writing": "/blog/7-key-strategies-to-excel-in-celpip-writing-test",
  "/clb-levels-for-immigration": "/blog/complete-guide-celpip-test-booking-results-clb",
  "/celpip-speaking-tips": "/wiki/celpip-speaking-tips-high-score",
  "/celpip-writing-email-tips": "/blog/celpip-writing-task-1-samples-email-tone-clb-9-2026",
};

function patchLinkList(list) {
  if (!Array.isArray(list)) return { list, changed: false };
  let changed = false;
  const next = list.map((item) => {
    if (!item || typeof item.url !== "string") return item;
    const url = item.url.trim();
    const to = URL_MAP[url];
    if (to) {
      changed = true;
      return { ...item, url: to };
    }
    return item;
  });
  return { list: next, changed };
}

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();

const slugs = await db
  .collection("profession_pages")
  .find({ published: true })
  .project({ slug: 1 })
  .map((d) => d.slug)
  .toArray();

let updated = 0;
for (const slug of slugs) {
  const doc = await db.collection("profession_pages").findOne({ slug });
  if (!doc) continue;

  const ra = patchLinkList(doc.relatedArticles);
  const rp = patchLinkList(doc.relatedProfessions);
  if (!ra.changed && !rp.changed) continue;

  await db.collection("profession_pages").updateOne(
    { _id: doc._id },
    {
      $set: {
        ...(ra.changed ? { relatedArticles: ra.list } : {}),
        ...(rp.changed ? { relatedProfessions: rp.list } : {}),
      },
    }
  );
  console.log("updated", slug);
  updated += 1;
}

console.log("done, updated", updated, "profession_pages");
await client.close();

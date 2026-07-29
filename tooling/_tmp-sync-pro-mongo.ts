import "./bootstrap-website-env";
import { getDb } from "../src/lib/appDocumentsClient";
import { closeSql, getSql } from "../src/lib/pg/pool";

const uid = "e50be9bb-e78d-46c3-b24e-d1afae7c6993";
const email = "alacrityca@prephere.ai";

async function main() {
  const sql = getSql();
  const profiles = await sql`
    SELECT id, email, plan, supabase_auth_user_id, legacy_clerk_user_id
    FROM public.user_profiles
    WHERE lower(coalesce(email,'')) = ${email}
       OR supabase_auth_user_id::text = ${uid}
    LIMIT 10
  `;
  console.log("profiles", profiles);

  const db = await getDb();
  const mongo = await db.collection("users").findOne({
    $or: [
      { supabaseUserId: uid },
      { email },
      { "emailAddresses.emailAddress": email },
      { primaryEmailAddress: email },
    ],
  });
  console.log(
    "mongo user",
    mongo
      ? {
          _id: mongo._id,
          plan: mongo.plan,
          publicMetadata: mongo.publicMetadata,
          supabaseUserId: mongo.supabaseUserId,
          clerkUserId: mongo.clerkUserId,
          email: mongo.email,
        }
      : null,
  );

  const publicMetadata = {
    ...((mongo?.publicMetadata as Record<string, unknown>) || {}),
    plan: "pro",
    planCancelled: false,
  };

  if (mongo) {
    await db.collection("users").updateOne(
      { _id: mongo._id },
      {
        $set: {
          plan: "pro",
          publicMetadata,
          updatedAt: new Date(),
        },
      },
    );
    console.log("mongo updated");
  } else {
    await db.collection("users").updateOne(
      { supabaseUserId: uid },
      {
        $set: {
          supabaseUserId: uid,
          email,
          plan: "pro",
          publicMetadata,
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );
    console.log("mongo upserted");
  }

  await closeSql();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

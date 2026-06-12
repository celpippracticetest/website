import "./bootstrap-website-env";

const userId = process.argv[2];
const customerId = process.argv[3];

if (!userId || !customerId) {
  console.error("Usage: npx tsx tooling/inspect-attribution-backfill-user.ts <userId> <stripeCustomerId>");
  process.exit(1);
}

async function main() {
  const { getDb } = await import("../src/lib/appDocumentsClient");
  const {
    extractUserAttributionSources,
    mergeAttributionIntoStripeMetadata,
    buildChargeAttributionMetadata,
  } = await import("../src/lib/stripeChargeAttribution");
  const { stripe } = await import("../src/lib/stripe");

  const db = await getDb();
  const user =
    (await db.collection("users").findOne({ clerkUserId: userId })) ??
    (await db.collection("users").findOne({ supabaseUserId: userId }));

  if (!user) {
    console.log("user not found");
    process.exit(1);
  }

  const sources = extractUserAttributionSources(user as Record<string, unknown>, userId);
  const wouldAdd = buildChargeAttributionMetadata(sources);

  console.log("=== Stored attribution (from user doc) ===");
  console.log(JSON.stringify(sources, null, 2));
  console.log("=== Metadata that would be stamped ===");
  console.log(JSON.stringify(wouldAdd, null, 2));

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });

  for (const sub of subs.data) {
    const merged = mergeAttributionIntoStripeMetadata(sub.metadata, sources);
    const added = Object.fromEntries(
      Object.entries(merged).filter(
        ([key, value]) =>
          !String(sub.metadata[key] ?? "").trim() && String(value ?? "").trim()
      )
    );

    console.log(`=== Subscription ${sub.id} (${sub.status}) ===`);
    console.log("BEFORE:", JSON.stringify(sub.metadata, null, 2));
    console.log("AFTER:", JSON.stringify(merged, null, 2));
    console.log("KEYS ADDED:", JSON.stringify(added, null, 2));
  }

  const invoices = await stripe.invoices.list({
    customer: customerId,
    status: "paid",
    limit: 3,
  });

  for (const invoice of invoices.data) {
    const paymentIntentId =
      typeof invoice.payment_intent === "string" ? invoice.payment_intent : null;
    if (!paymentIntentId) continue;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const chargeId =
      typeof paymentIntent.latest_charge === "string"
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    let chargeMetadata: Record<string, string> = {};
    if (chargeId) {
      const charge = await stripe.charges.retrieve(chargeId);
      chargeMetadata = (charge.metadata ?? {}) as Record<string, string>;
    }

    const mergedPi = mergeAttributionIntoStripeMetadata(
      paymentIntent.metadata as Record<string, string>,
      sources
    );
    const addedPi = Object.fromEntries(
      Object.entries(mergedPi).filter(
        ([key, value]) =>
          !String(paymentIntent.metadata[key] ?? "").trim() &&
          String(value ?? "").trim()
      )
    );

    console.log(`=== Invoice ${invoice.id} / PI ${paymentIntentId} ===`);
    console.log("PI BEFORE:", JSON.stringify(paymentIntent.metadata, null, 2));
    console.log("PI KEYS ADDED:", JSON.stringify(addedPi, null, 2));
    console.log("CHARGE BEFORE:", JSON.stringify(chargeMetadata, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { closeSql } = await import("../src/lib/pg/pool");
    await closeSql().catch(() => undefined);
  });

/**
 * Backfill gclid / campaign attribution onto Stripe subscriptions and charges
 * for users who already have attribution stored in the app database.
 *
 * Usage (from `website/`):
 *   npx tsx tooling/stripe-attribution-backfill.ts --dry-run --limit 50
 *   npx tsx tooling/stripe-attribution-backfill.ts --limit 50
 */

import "./bootstrap-website-env";

function readFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readNumberFlag(name: string, defaultValue: number): number {
  const prefix = `--${name}=`;
  const equalsForm = process.argv.find((value) => value.startsWith(prefix));
  if (equalsForm) {
    const parsed = Number.parseInt(equalsForm.slice(prefix.length), 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  const flagIndex = process.argv.indexOf(`--${name}`);
  if (flagIndex >= 0) {
    const next = process.argv[flagIndex + 1];
    const parsed = Number.parseInt(next ?? "", 10);
    if (Number.isFinite(parsed)) return parsed;
  }

  return defaultValue;
}

async function main() {
  const { runStripeAttributionBackfill } = await import(
    "../src/lib/stripeAttributionBackfill"
  );
  const { closeSql } = await import("../src/lib/pg/pool");

  const dryRun = readFlag("dry-run") || readFlag("dryRun");
  const limit = readNumberFlag("limit", 50);
  const invoiceLimit = readNumberFlag("invoice-limit", 24);
  const requireGoogleClickId = !readFlag("allow-utm-only");

  const result = await runStripeAttributionBackfill({
    dryRun,
    limit,
    invoiceLimitPerCustomer: invoiceLimit,
    requireGoogleClickId,
  });

  console.log(JSON.stringify(result, null, 2));
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

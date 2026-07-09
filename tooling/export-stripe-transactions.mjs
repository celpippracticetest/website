/**
 * One-off export of Stripe transaction data to CSV/JSON.
 *
 * Requires STRIPE_SECRET_KEY in `.env` or `.env.local` (repo root).
 *
 * Run from repo root:
 *   node tooling/export-stripe-transactions.mjs
 *   node tooling/export-stripe-transactions.mjs --from=2024-01-01 --to=2026-07-09
 *   node tooling/export-stripe-transactions.mjs --resources=balance_transactions,invoices
 *   node tooling/export-stripe-transactions.mjs --format=json
 *   node tooling/export-stripe-transactions.mjs --output-dir=./exports/stripe
 *
 * Default resources: balance_transactions, invoices, charges, refunds, failed_payments
 * Default format: csv (also writes stripe-export-summary.json)
 */

import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const ALL_RESOURCES = [
  "balance_transactions",
  "invoices",
  "charges",
  "refunds",
  "failed_payments",
];

function parseArgs(argv) {
  const out = {
    from: null,
    to: null,
    outputDir: path.join(process.cwd(), "exports", "stripe"),
    format: "csv",
    resources: new Set(ALL_RESOURCES),
  };

  for (const arg of argv.slice(2)) {
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    const m = /^--(\w+)=(.+)$/.exec(arg);
    if (!m) continue;
    if (m[1] === "from") out.from = m[2].trim();
    if (m[1] === "to") out.to = m[2].trim();
    if (m[1] === "output-dir") out.outputDir = path.resolve(m[2].trim());
    if (m[1] === "format") out.format = m[2].trim().toLowerCase();
    if (m[1] === "resources") {
      out.resources = new Set(
        m[2]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  }

  return out;
}

function printHelp() {
  console.log(`Usage: node tooling/export-stripe-transactions.mjs [options]

Options:
  --from=YYYY-MM-DD       Only records created on/after this UTC date
  --to=YYYY-MM-DD         Only records created on/before this UTC date
  --output-dir=PATH       Output directory (default: ./exports/stripe)
  --format=csv|json|both  Output format (default: csv)
  --resources=LIST        Comma-separated: ${ALL_RESOURCES.join(", ")}
  --help                  Show this help
`);
}

function parseUtcDate(dateStr, endOfDay = false) {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${dateStr}`);
  if (endOfDay) {
    return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function buildCreatedFilter(from, to) {
  if (!from && !to) return undefined;
  const filter = {};
  if (from) filter.gte = Math.floor(parseUtcDate(from).getTime() / 1000);
  if (to) filter.lte = Math.floor(parseUtcDate(to, true).getTime() / 1000);
  return filter;
}

function csvCell(value) {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(filePath, headers, rows) {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function stripeId(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.id) return value.id;
  return null;
}

function unixToIso(unix) {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

function resolveUserId({ metadata, customerId, subscriptionId, lookups }) {
  if (metadata?.user_id) return metadata.user_id;
  if (subscriptionId && lookups.bySubscription.has(subscriptionId)) {
    return lookups.bySubscription.get(subscriptionId);
  }
  if (customerId && lookups.byCustomer.has(customerId)) {
    return lookups.byCustomer.get(customerId);
  }
  return "";
}

function paymentErrorFields(error) {
  if (!error) {
    return {
      failure_code: "",
      failure_message: "",
      decline_code: "",
      error_type: "",
    };
  }
  return {
    failure_code: error.code ?? "",
    failure_message: error.message ?? "",
    decline_code: error.decline_code ?? "",
    error_type: error.type ?? "",
  };
}

async function buildUserIdLookups(stripe) {
  const byCustomer = new Map();
  const bySubscription = new Map();
  const emailByCustomer = new Map();

  console.log("Building user_id lookups from subscriptions and customers...");
  const subscriptions = await paginate(
    stripe,
    "subscriptions",
    { status: "all" },
    "subscriptions (user lookup)"
  );
  for (const sub of subscriptions) {
    const userId = sub.metadata?.user_id ?? "";
    if (userId) bySubscription.set(sub.id, userId);
    const customerId = stripeId(sub.customer);
    if (customerId && userId && !byCustomer.has(customerId)) {
      byCustomer.set(customerId, userId);
    }
  }

  const customers = await paginate(
    stripe,
    "customers",
    {},
    "customers (user lookup)"
  );
  for (const customer of customers) {
    if (customer.email) emailByCustomer.set(customer.id, customer.email);
    const userId = customer.metadata?.user_id ?? "";
    if (userId && !byCustomer.has(customer.id)) {
      byCustomer.set(customer.id, userId);
    }
  }

  return { byCustomer, bySubscription, emailByCustomer };
}

async function paginate(stripe, resource, listParams, label) {
  const all = [];
  let startingAfter;

  for (;;) {
    const page = await stripe[resource].list({
      limit: 100,
      ...listParams,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });

    all.push(...page.data);
    process.stdout.write(`\r  ${label}: ${all.length} rows`);

    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }

  process.stdout.write("\n");
  return all;
}

function mapBalanceTransactions(rows) {
  return rows.map((tx) => ({
    id: tx.id,
    type: tx.type,
    amount_cents: tx.amount,
    fee_cents: tx.fee,
    net_cents: tx.net,
    currency: tx.currency,
    status: tx.status,
    description: tx.description ?? "",
    reporting_category: tx.reporting_category ?? "",
    source_id: stripeId(tx.source),
    available_on: unixToIso(tx.available_on),
    created_at: unixToIso(tx.created),
  }));
}

function mapInvoices(rows, lookups) {
  return rows.map((inv) => {
    const discountCents =
      inv.total_discount_amounts?.reduce((sum, d) => sum + (d.amount ?? 0), 0) ?? 0;
    const customerId = stripeId(inv.customer);
    const subscriptionId = stripeId(inv.subscription);
    const finalizationError = inv.last_finalization_error;
    return {
      id: inv.id,
      user_id: resolveUserId({
        metadata: inv.metadata,
        customerId,
        subscriptionId,
        lookups,
      }),
      customer_email: customerId
        ? (lookups.emailByCustomer.get(customerId) ?? "")
        : "",
      number: inv.number ?? "",
      status: inv.status ?? "",
      paid: inv.status === "paid",
      billing_reason: inv.billing_reason ?? "",
      currency: inv.currency ?? "",
      customer_id: customerId,
      subscription_id: subscriptionId,
      amount_due_cents: inv.amount_due ?? 0,
      subtotal_cents: inv.subtotal ?? 0,
      total_cents: inv.total ?? 0,
      amount_paid_cents: inv.amount_paid ?? 0,
      discount_cents: discountCents,
      attempt_count: inv.attempt_count ?? 0,
      failure_code: finalizationError?.code ?? "",
      failure_message: finalizationError?.message ?? "",
      hosted_invoice_url: inv.hosted_invoice_url ?? "",
      created_at: unixToIso(inv.created),
      period_start: unixToIso(inv.period_start),
      period_end: unixToIso(inv.period_end),
    };
  });
}

function mapCharges(rows, lookups) {
  return rows.map((ch) => {
    const customerId = stripeId(ch.customer);
    const invoiceId = stripeId(ch.invoice);
    return {
      id: ch.id,
      user_id: resolveUserId({
        metadata: ch.metadata,
        customerId,
        subscriptionId: null,
        lookups,
      }),
      customer_email: customerId
        ? (lookups.emailByCustomer.get(customerId) ?? ch.receipt_email ?? "")
        : (ch.receipt_email ?? ""),
      status: ch.status ?? "",
      paid: Boolean(ch.paid),
      refunded: Boolean(ch.refunded),
      disputed: Boolean(ch.disputed),
      amount_cents: ch.amount,
      amount_refunded_cents: ch.amount_refunded ?? 0,
      currency: ch.currency ?? "",
      customer_id: customerId,
      payment_intent_id: stripeId(ch.payment_intent),
      invoice_id: invoiceId,
      failure_code: ch.failure_code ?? "",
      failure_message: ch.failure_message ?? "",
      description: ch.description ?? "",
      created_at: unixToIso(ch.created),
    };
  });
}

function mapRefunds(rows) {
  return rows.map((rf) => ({
    id: rf.id,
    status: rf.status ?? "",
    amount_cents: rf.amount,
    currency: rf.currency ?? "",
    charge_id: stripeId(rf.charge),
    payment_intent_id: stripeId(rf.payment_intent),
    reason: rf.reason ?? "",
    created_at: unixToIso(rf.created),
  }));
}

const RESOURCE_CONFIG = {
  balance_transactions: {
    stripeResource: "balanceTransactions",
    map: mapBalanceTransactions,
    filePrefix: "stripe-balance-transactions",
  },
  invoices: {
    stripeResource: "invoices",
    map: mapInvoices,
    filePrefix: "stripe-invoices",
  },
  charges: {
    stripeResource: "charges",
    map: mapCharges,
    filePrefix: "stripe-charges",
  },
  refunds: {
    stripeResource: "refunds",
    map: mapRefunds,
    filePrefix: "stripe-refunds",
  },
};

async function exportFailedPayments(
  stripe,
  createdFilter,
  lookups,
  outputDir,
  format,
  stamp
) {
  console.log("Exporting failed_payments...");
  const rowsByKey = new Map();

  function upsertRow(row) {
    const key =
      row.payment_intent_id ||
      row.charge_id ||
      `${row.invoice_id}:${row.created_at}`;
    const existing = rowsByKey.get(key);
    if (
      !existing ||
      (row.failure_message && !existing.failure_message) ||
      row.source_type === "invoice"
    ) {
      rowsByKey.set(key, row);
    }
  }

  const listParams = createdFilter ? { created: createdFilter } : {};
  const charges = await paginate(
    stripe,
    "charges",
    listParams,
    "failed_payments (charges)"
  );

  for (const ch of charges) {
    if (ch.status !== "failed" && !ch.failure_code && !ch.failure_message) continue;
    const customerId = stripeId(ch.customer);
    const paymentIntentId = stripeId(ch.payment_intent);
    const invoiceId = stripeId(ch.invoice);
    upsertRow({
      source_type: "charge",
      user_id: resolveUserId({
        metadata: ch.metadata,
        customerId,
        subscriptionId: null,
        lookups,
      }),
      customer_email: customerId
        ? (lookups.emailByCustomer.get(customerId) ?? ch.receipt_email ?? "")
        : (ch.receipt_email ?? ""),
      customer_id: customerId ?? "",
      subscription_id: "",
      invoice_id: invoiceId ?? "",
      payment_intent_id: paymentIntentId ?? "",
      charge_id: ch.id,
      amount_cents: ch.amount ?? 0,
      currency: ch.currency ?? "",
      status: ch.status ?? "",
      billing_reason: "",
      attempt_count: "",
      failure_code: ch.failure_code ?? "",
      failure_message: ch.failure_message ?? "",
      decline_code: "",
      error_type: "",
      created_at: unixToIso(ch.created),
    });
  }

  const invoiceListParams = {
    ...listParams,
    expand: ["data.payment_intent", "data.subscription"],
  };
  let invoiceStartingAfter;
  for (;;) {
    const page = await stripe.invoices.list({
      limit: 100,
      ...invoiceListParams,
      ...(invoiceStartingAfter ? { starting_after: invoiceStartingAfter } : {}),
    });

    for (const inv of page.data) {
      const isPaid = inv.status === "paid";
      const attemptCount = inv.attempt_count ?? 0;
      const finalizationError = inv.last_finalization_error;
      const paymentIntent =
        typeof inv.payment_intent === "object" ? inv.payment_intent : null;
      const paymentError = paymentIntent?.last_payment_error;
      const hasFailedAttempt =
        !isPaid &&
        (attemptCount > 0 ||
          finalizationError ||
          paymentError ||
          inv.status === "open" ||
          inv.status === "uncollectible");

      if (!hasFailedAttempt) continue;

      const customerId = stripeId(inv.customer);
      const subscriptionId = stripeId(inv.subscription);
      const subscriptionMeta =
        typeof inv.subscription === "object" ? inv.subscription?.metadata : null;
      const errorFields = paymentError
        ? paymentErrorFields(paymentError)
        : paymentErrorFields(finalizationError);

      upsertRow({
        source_type: "invoice",
        user_id: resolveUserId({
          metadata: {
            ...(inv.metadata ?? {}),
            ...(subscriptionMeta ?? {}),
          },
          customerId,
          subscriptionId,
          lookups,
        }),
        customer_email: customerId
          ? (lookups.emailByCustomer.get(customerId) ??
            inv.customer_email ??
            "")
          : (inv.customer_email ?? ""),
        customer_id: customerId ?? "",
        subscription_id: subscriptionId ?? "",
        invoice_id: inv.id,
        payment_intent_id: stripeId(inv.payment_intent) ?? "",
        charge_id: stripeId(inv.charge) ?? "",
        amount_cents: inv.amount_due ?? inv.total ?? 0,
        currency: inv.currency ?? "",
        status: inv.status ?? "",
        billing_reason: inv.billing_reason ?? "",
        attempt_count: attemptCount,
        ...errorFields,
        created_at: unixToIso(inv.created),
      });
    }

    process.stdout.write(`\r  failed_payments (invoices): ${rowsByKey.size} rows`);
    if (!page.has_more || page.data.length === 0) break;
    invoiceStartingAfter = page.data[page.data.length - 1].id;
  }
  process.stdout.write("\n");

  const rows = Array.from(rowsByKey.values()).sort((a, b) =>
    String(b.created_at).localeCompare(String(a.created_at))
  );

  const headers = rows.length
    ? Object.keys(rows[0])
    : [
        "source_type",
        "user_id",
        "customer_email",
        "customer_id",
        "subscription_id",
        "invoice_id",
        "payment_intent_id",
        "charge_id",
        "amount_cents",
        "currency",
        "status",
        "billing_reason",
        "attempt_count",
        "failure_code",
        "failure_message",
        "decline_code",
        "error_type",
        "created_at",
      ];
  const baseName = `stripe-failed-payments-${stamp}`;
  const written = [];

  if (format === "csv" || format === "both") {
    const csvPath = path.join(outputDir, `${baseName}.csv`);
    writeCsv(csvPath, headers, rows);
    written.push(csvPath);
  }

  if (format === "json" || format === "both") {
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    writeJson(jsonPath, rows);
    written.push(jsonPath);
  }

  return { resource: "failed_payments", count: rows.length, files: written };
}

async function exportResource(
  stripe,
  resourceKey,
  createdFilter,
  outputDir,
  format,
  stamp,
  lookups
) {
  const config = RESOURCE_CONFIG[resourceKey];
  if (!config) {
    throw new Error(`Unknown resource: ${resourceKey}`);
  }

  console.log(`Exporting ${resourceKey}...`);
  const listParams = createdFilter ? { created: createdFilter } : {};
  const rawRows = await paginate(
    stripe,
    config.stripeResource,
    listParams,
    resourceKey
  );
  const rows = config.map.length >= 2
    ? config.map(rawRows, lookups)
    : config.map(rawRows);

  const headers = rows.length ? Object.keys(rows[0]) : [];
  const baseName = `${config.filePrefix}-${stamp}`;
  const written = [];

  if (format === "csv" || format === "both") {
    const csvPath = path.join(outputDir, `${baseName}.csv`);
    writeCsv(csvPath, headers, rows);
    written.push(csvPath);
  }

  if (format === "json" || format === "both") {
    const jsonPath = path.join(outputDir, `${baseName}.json`);
    writeJson(jsonPath, rows);
    written.push(jsonPath);
  }

  return { resource: resourceKey, count: rows.length, files: written };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  if (!["csv", "json", "both"].includes(args.format)) {
    throw new Error(`Invalid --format=${args.format}. Use csv, json, or both.`);
  }

  for (const resource of args.resources) {
    if (!ALL_RESOURCES.includes(resource)) {
      throw new Error(`Unknown resource "${resource}". Valid: ${ALL_RESOURCES.join(", ")}`);
    }
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not set. Add it to .env or .env.local.");
  }

  fs.mkdirSync(args.outputDir, { recursive: true });

  const stripe = new Stripe(secretKey);
  const createdFilter = buildCreatedFilter(args.from, args.to);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const needsUserLookups = ["invoices", "charges", "failed_payments"].some((r) =>
    args.resources.has(r)
  );

  console.log("Stripe transaction export");
  console.log(`  output: ${args.outputDir}`);
  console.log(`  format: ${args.format}`);
  console.log(
    `  date range: ${args.from ?? "beginning"} → ${args.to ?? "now"}`
  );
  console.log(`  resources: ${Array.from(args.resources).join(", ")}`);
  console.log("");

  const account = await stripe.accounts.retrieve();
  const lookups = needsUserLookups ? await buildUserIdLookups(stripe) : null;
  const results = [];

  for (const resource of ALL_RESOURCES) {
    if (!args.resources.has(resource)) continue;
    if (resource === "failed_payments") {
      results.push(
        await exportFailedPayments(
          stripe,
          createdFilter,
          lookups,
          args.outputDir,
          args.format,
          stamp
        )
      );
      continue;
    }
    results.push(
      await exportResource(
        stripe,
        resource,
        createdFilter,
        args.outputDir,
        args.format,
        stamp,
        lookups
      )
    );
  }

  const summary = {
    exportedAt: new Date().toISOString(),
    stripeAccountId: account.id,
    dateRange: {
      from: args.from,
      to: args.to,
    },
    format: args.format,
    resources: results,
    totalRows: results.reduce((sum, r) => sum + r.count, 0),
  };

  const summaryPath = path.join(args.outputDir, `stripe-export-summary-${stamp}.json`);
  writeJson(summaryPath, summary);

  console.log("");
  console.log("Done.");
  for (const result of results) {
    console.log(`  ${result.resource}: ${result.count} rows`);
    for (const file of result.files) {
      console.log(`    ${file}`);
    }
  }
  console.log(`  summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

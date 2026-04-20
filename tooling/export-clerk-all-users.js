/**
 * Paginate Clerk GET /v1/users and write a JSON export.
 *
 * Usage (from repo root `website/`):
 *   yarn export:clerk:all
 *   node tooling/export-clerk-all-users.js --out ./clerk-users.json
 *
 * Loads `CLERK_SECRET_KEY` from the environment, or from `.env.local` / `.env` in cwd if unset.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");

const CLERK_API_BASE = process.env.CLERK_API_BASE_URL || "https://api.clerk.com";

function loadDotenv(root) {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const text = fs.readFileSync(p, "utf8");
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const key = t.slice(0, i).trim();
      let val = t.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) {
      out.file = argv[++i];
    } else if (a === "--limit" && argv[i + 1]) {
      out.limit = Math.min(500, Math.max(1, parseInt(argv[++i], 10) || 100));
    }
  }
  return out;
}

async function main() {
  loadDotenv(process.cwd());
  const args = parseArgs(process.argv);
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) {
    console.error("Missing CLERK_SECRET_KEY (set in env or .env / .env.local).");
    process.exit(1);
  }

  const limit = args.limit ?? 100;
  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };

  let totalCount = null;
  try {
    const countRes = await axios.get(`${CLERK_API_BASE}/v1/users/count`, {
      headers,
    });
    totalCount = countRes.data?.total_count ?? null;
  } catch (e) {
    console.warn("Could not fetch /v1/users/count (continuing):", e.message);
  }

  const users = [];
  let offset = 0;

  for (;;) {
    const res = await axios.get(`${CLERK_API_BASE}/v1/users`, {
      headers,
      params: { limit, offset, order_by: "-created_at" },
    });
    const batch = Array.isArray(res.data) ? res.data : [];
    if (batch.length === 0) break;
    users.push(...batch);
    offset += batch.length;
    process.stderr.write(`\rFetched ${users.length}${totalCount != null ? ` / ${totalCount}` : ""} users`);
    if (batch.length < limit) break;
  }
  process.stderr.write("\n");

  const outPath =
    args.file ||
    path.join(
      process.cwd(),
      `clerk-users-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`
    );

  const payload = {
    exportedAt: new Date().toISOString(),
    clerkApiBase: CLERK_API_BASE,
    totalCountFromApi: totalCount,
    userCount: users.length,
    users,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`Wrote ${users.length} user(s) to ${outPath}`);
  if (totalCount != null && users.length !== totalCount) {
    console.warn(
      `Warning: exported count (${users.length}) differs from Clerk total_count (${totalCount}).`
    );
  }
}

main().catch((err) => {
  console.error(err.response?.data || err.message || err);
  process.exit(1);
});

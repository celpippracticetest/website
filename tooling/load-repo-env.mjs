/**
 * Load website root `.env` then `.env.local` into `process.env` (Node tooling has no Next.js inject).
 * This file lives in `tooling/`; repo root is one level up.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} absPath
 * @param {boolean} overrideExisting
 */
function loadEnvFile(absPath, overrideExisting) {
  if (!existsSync(absPath)) return;
  const text = readFileSync(absPath, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!overrideExisting && process.env[key] !== undefined) continue;
    process.env[key] = val;
  }
}

export function loadRepoEnv() {
  loadEnvFile(join(repoRoot, ".env"), false);
  loadEnvFile(join(repoRoot, ".env.local"), true);
}

import fs from "node:fs";
import path from "node:path";

/**
 * Loads `.env.local` then `.env` from cwd into `process.env` when keys are unset (same pattern as `tooling/export-clerk-all-users.js`).
 */
export function loadWebsiteDotenv(cwd: string = process.cwd()): void {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(cwd, name);
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

import fs from "fs";
import path from "path";

type ResolvedGa4Credentials = {
  email: string;
  privateKey: string;
  source: "env" | `file:${string}`;
};

const DEFAULT_ANALYTICS_SA_FILE = path.join(
  process.cwd(),
  "secrets",
  "gcp-bq-mcp-sa.json",
);

function normalizePrivateKey(raw: string): string {
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function readServiceAccountFile(
  filePath: string | undefined,
): ResolvedGa4Credentials | null {
  if (!filePath?.trim()) return null;
  const p = path.resolve(filePath);
  if (!fs.existsSync(p)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as {
      client_email?: string;
      private_key?: string;
    };
    const email = String(j.client_email || "").trim();
    const privateKey = normalizePrivateKey(String(j.private_key || ""));
    if (!email || !privateKey) return null;
    return { email, privateKey, source: `file:${p}` };
  } catch {
    return null;
  }
}

export function resolveGa4Credentials():
  | ResolvedGa4Credentials
  | { error: string } {
  const candidates = [
    process.env.ANALYTICS_CREDENTIALS_FILE,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    DEFAULT_ANALYTICS_SA_FILE,
  ];

  for (const c of candidates) {
    const fileCreds = readServiceAccountFile(c);
    if (fileCreds) return fileCreds;
  }

  const analyticsClientEmail =
    process.env.ANALYTICS_CLIENT_EMAIL || process.env.ANALYTICS_CLIENT_ID;
  const analyticsPrivateKey = process.env.ANALYTICS_PRIVATE_KEY;
  if (!analyticsClientEmail?.trim() || !analyticsPrivateKey?.trim()) {
    return {
      error:
        "Analytics credentials missing. Set ANALYTICS_CLIENT_EMAIL + ANALYTICS_PRIVATE_KEY, or set ANALYTICS_CREDENTIALS_FILE / GOOGLE_APPLICATION_CREDENTIALS (service account JSON).",
    };
  }

  const privateKey = normalizePrivateKey(analyticsPrivateKey);
  if (!privateKey.includes("-----BEGIN") || !privateKey.includes("-----END")) {
    return {
      error:
        "ANALYTICS_PRIVATE_KEY must be a valid PEM key (-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----).",
    };
  }

  return {
    email: analyticsClientEmail.trim(),
    privateKey,
    source: "env",
  };
}

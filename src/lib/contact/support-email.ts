/** Assemble addresses at runtime so SSR HTML does not trigger Cloudflare email obfuscation. */
const AT = String.fromCharCode(64);

export function buildSupportEmail(): string {
  return ["support", "celpippracticetest.com"].join(AT);
}

export function buildAccountsEmail(): string {
  return ["accounts", "celpippracticetest.com"].join(AT);
}

export function buildSupportMailto(subject?: string): string {
  const email = buildSupportEmail();
  return subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
}

export function buildAccountsMailto(subject?: string): string {
  const email = buildAccountsEmail();
  return subject
    ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
    : `mailto:${email}`;
}

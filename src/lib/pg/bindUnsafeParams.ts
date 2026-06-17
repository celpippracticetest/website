import type { Sql } from "postgres";

/**
 * postgres.js `sql.array()` only works inside tagged templates (`sql\`...\``).
 * For `sql.unsafe()`, raw JS arrays stringify as comma-separated values and
 * Postgres rejects them for `ANY($n::text[])`.
 */
function pgTextArrayLiteral(values: unknown[]): string {
  const parts = values.map((value) => {
    const s = String(value);
    if (/[,{}\\"\s]/.test(s) || s.length === 0) {
      return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return s;
  });
  return `{${parts.join(",")}}`;
}

export function bindUnsafeParams(_sql: Sql, params: unknown[]): unknown[] {
  return params.map((param) =>
    Array.isArray(param) ? pgTextArrayLiteral(param) : param
  );
}

import type { Sql } from "postgres";
import { PgCollection, type AppDoc } from "./pgCollection";

/** Maps `db("prod")` to collection keys like `prod.checkouts`. */
export class PgDatabase {
  constructor(
    private readonly sql: Sql,
    private readonly namespace: string | null
  ) {}

  collection<T extends AppDoc = AppDoc>(name: string): PgCollection<T> {
    const key = this.namespace ? `${this.namespace}.${name}` : name;
    return new PgCollection<T>(this.sql, key);
  }
}

export function createPgDatabase(sql: Sql, namespace: string | null): PgDatabase {
  return new PgDatabase(sql, namespace);
}

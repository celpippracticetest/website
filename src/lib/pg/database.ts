import type { Sql } from "postgres";
import { PgLeagueGroupsCollection } from "./leagueGroupsCollection";
import { PgUsersCollection } from "./usersCollection";
import { PgLeagueSeasonsCollection } from "./leagueSeasonsCollection";
import { PgLeaguesCollection } from "./leaguesCollection";
import { PgCollection, type AppDoc } from "./pgCollection";
import { PgUserActivityCollection } from "./userActivityCollection";
import { PgUserLearningEventsCollection } from "./userLearningEventsCollection";
import { PgUserLeaguePointsCollection } from "./userLeaguePointsCollection";

/** Maps `db("prod")` to collection keys like `prod.checkouts`. */
export class PgDatabase {
  constructor(
    private readonly sql: Sql,
    private readonly namespace: string | null
  ) {}

  collection<T extends AppDoc = AppDoc>(name: string): PgCollection<T> {
    const key = this.namespace ? `${this.namespace}.${name}` : name;
    if (name === "leagues") {
      return new PgLeaguesCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "league_seasons") {
      return new PgLeagueSeasonsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "league_groups") {
      return new PgLeagueGroupsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "user_activity") {
      return new PgUserActivityCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "user_learning_events") {
      return new PgUserLearningEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "user_league_points") {
      return new PgUserLeaguePointsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "users") {
      return new PgUsersCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    return new PgCollection<T>(this.sql, key);
  }
}

export function createPgDatabase(sql: Sql, namespace: string | null): PgDatabase {
  return new PgDatabase(sql, namespace);
}

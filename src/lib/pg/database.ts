import type { Sql } from "postgres";
import { PgAccountAccessSignalsCollection } from "./accountAccessSignalsCollection";
import { PgAnswersCollection } from "./answersCollection";
import { PgStripeSubscriptionsCollection } from "./stripeSubscriptionsCollection";
import { PgLeagueGroupsCollection } from "./leagueGroupsCollection";
import { PgUsersCollection } from "./usersCollection";
import { PgLeagueSeasonsCollection } from "./leagueSeasonsCollection";
import { PgLeaguesCollection } from "./leaguesCollection";
import { PgCollection, type AppDoc } from "./pgCollection";
import { PgUserActivityCollection } from "./userActivityCollection";
import { PgUserActivitiesCollection } from "./userActivitiesCollection";
import { PgUserLearningEventsCollection } from "./userLearningEventsCollection";
import { PgUserAttributionEventsCollection } from "./userAttributionEventsCollection";
import { PgPricingAbEventsCollection } from "./pricingAbEventsCollection";
import { PgUserWordsCollection } from "./userWordsCollection";
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
    if (name === "useractivities") {
      return new PgUserActivitiesCollection<T>(this.sql) as unknown as PgCollection<T>;
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
    if (name === "account_access_signals") {
      return new PgAccountAccessSignalsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "answers") {
      return new PgAnswersCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "user_attribution_events") {
      return new PgUserAttributionEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "pricing_ab_events") {
      return new PgPricingAbEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "userwords") {
      return new PgUserWordsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "stripe_subscriptions") {
      return new PgStripeSubscriptionsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    return new PgCollection<T>(this.sql, key);
  }
}

export function createPgDatabase(sql: Sql, namespace: string | null): PgDatabase {
  return new PgDatabase(sql, namespace);
}

import type { Sql } from "postgres";
import { PgAccountAccessSignalsCollection } from "./accountAccessSignalsCollection";
import { PgAnswersCollection } from "./answersCollection";
import { PgStripeSubscriptionsCollection } from "./stripeSubscriptionsCollection";
import { PgStripeCustomersCollection } from "./stripeCustomersCollection";
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
import { PgUserNurtureEmailStatsCollection } from "./userNurtureEmailStatsCollection";
import { PgUserNurtureStatesCollection } from "./userNurtureStatesCollection";
import { PgUserNurtureEmailDispatchLocksCollection } from "./userNurtureEmailDispatchLocksCollection";
import { PgHomeAbEventsCollection } from "./homeAbEventsCollection";
import { PgPricingModelAbEventsCollection } from "./pricingModelAbEventsCollection";
import { PgAccountDeletionFlowEventsCollection } from "./accountDeletionFlowEventsCollection";
import { PgAbandonedCartEmailConfigsCollection } from "./abandonedCartEmailConfigsCollection";
import { PgAccountDeletionSurveysCollection } from "./accountDeletionSurveysCollection";
import { PgCancellationFlowEventsCollection } from "./cancellationFlowEventsCollection";
import { PgCancellationSurveysCollection } from "./cancellationSurveysCollection";
import { PgCheckoutsCollection } from "./checkoutsCollection";
import { PgOnboardingCollection } from "./onboardingCollection";
import { PgOnboardingNewResultsCollection } from "./onboardingNewResultsCollection";
import { PgReferralCodesCollection } from "./referralCodesCollection";
import { PgUserActivityRemindersCollection } from "./userActivityRemindersCollection";
import { PgGaUserAttributionCollection } from "./gaUserAttributionCollection";

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
    if (name === "ga_user_attribution") {
      return new PgGaUserAttributionCollection<T>(this.sql) as unknown as PgCollection<T>;
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
    if (name === "stripe_customers") {
      return new PgStripeCustomersCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "usernurtureemailstats") {
      return new PgUserNurtureEmailStatsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "usernurturestates") {
      return new PgUserNurtureStatesCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "usernurtureemaildispatchlocks") {
      return new PgUserNurtureEmailDispatchLocksCollection<T>(
        this.sql
      ) as unknown as PgCollection<T>;
    }
    if (name === "home_ab_events") {
      return new PgHomeAbEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "pricing_model_ab_events") {
      return new PgPricingModelAbEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "account_deletion_flow_events") {
      return new PgAccountDeletionFlowEventsCollection<T>(
        this.sql
      ) as unknown as PgCollection<T>;
    }
    if (name === "abandonedCartEmailConfigs") {
      return new PgAbandonedCartEmailConfigsCollection<T>(
        this.sql
      ) as unknown as PgCollection<T>;
    }
    if (name === "account_deletion_surveys") {
      return new PgAccountDeletionSurveysCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "cancellation_flow_events") {
      return new PgCancellationFlowEventsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "cancellation_surveys") {
      return new PgCancellationSurveysCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "checkouts") {
      return new PgCheckoutsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "onboarding") {
      return new PgOnboardingCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "onboarding_new_results") {
      return new PgOnboardingNewResultsCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "referralCodes") {
      return new PgReferralCodesCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    if (name === "useractivityreminders") {
      return new PgUserActivityRemindersCollection<T>(this.sql) as unknown as PgCollection<T>;
    }
    return new PgCollection<T>(this.sql, key);
  }
}

export function createPgDatabase(sql: Sql, namespace: string | null): PgDatabase {
  return new PgDatabase(sql, namespace);
}

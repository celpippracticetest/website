import postgres from "postgres";
import { loadRepoEnv } from "./load-repo-env.mjs";

loadRepoEnv();

const sql = postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" });
const rows = await sql`
  SELECT collection, COUNT(*)::int AS c
  FROM app_documents
  WHERE collection IN (
    'exams','exam-parts','users','blogs','plans','onboarding','onboarding_new_results','onboarding_results',
    'leadCaptureLeads','withdrawalRequests','cancellation_flow_events','cancellation_surveys',
    'home_ab_events','internalLinks','leadCaptureConfig','league_group_counters','marketing_assets',
    'messageCounts','partnerCommissions','paypal_subscription_grants','paypal_subscription_pending',
    'pricing_ab_events','profession_pages','reminderEmailConfigs','user_league_points',
    'useractivityreminders','worddetails'
  )
  GROUP BY collection
  ORDER BY collection
`;
console.table(rows);
await sql.end();

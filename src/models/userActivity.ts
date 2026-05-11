/** Shape of documents in the `useractivities` collection (Postgres-backed). */
export interface IUserActivity {
  userId: string;
  eventType:
    | "practice_attempt_started"
    | "practice_attempt_completed"
    | "mock_attempt_started"
    | "mock_attempt_completed"
    | "ai_feedback_generated"
    | "learning_attempt_started"
    | "score_report_viewed"
    | "signup"
    | "login"
    | "logout"
    | "payment_successful"
    | "payment_failed"
    | "subscription_created"
    | "subscription_cancelled"
    | "dispute_created"
    | "dispute_resolved";
  context: "practice" | "mock" | "learning" | "system" | "payment";
  skill?: "Listening" | "Reading" | "Writing" | "Speaking";
  attemptId?: string;
  contentId?: string;
  status?: "started" | "completed" | "abandoned" | "failed";
  durationSeconds?: number;
  scoreOverall?: number;
  scoreBreakdownJson?: string;
  llmTokensPrompt?: number;
  llmTokensCompletion?: number;
  ipAddress?: string;
  deviceUaHash?: string;
  userAgent?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  timestampUtc: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

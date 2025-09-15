import mongoose, { Schema, Document } from "mongoose";

export interface IUserActivity extends Document {
  userId: string;
  eventType:
    | "practice_attempt_started"
    | "practice_attempt_completed"
    | "mock_attempt_started"
    | "mock_attempt_completed"
    | "ai_feedback_generated"
    | "learning_attempt_started"
    | "score_report_viewed"
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
  metadata?: Record<string, any>;
  timestampUtc: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserActivitySchema = new Schema<IUserActivity>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "practice_attempt_started",
        "practice_attempt_completed",
        "mock_attempt_started",
        "mock_attempt_completed",
        "ai_feedback_generated",
        "learning_attempt_started",
        "score_report_viewed",
        "login",
        "logout",
        "payment_successful",
        "payment_failed",
        "subscription_created",
        "subscription_cancelled",
        "dispute_created",
        "dispute_resolved",
      ],
      index: true,
    },
    context: {
      type: String,
      required: true,
      enum: ["practice", "mock", "learning", "system", "payment"],
      index: true,
    },
    skill: {
      type: String,
      enum: ["Listening", "Reading", "Writing", "Speaking"],
      index: true,
    },
    attemptId: {
      type: String,
      index: true,
    },
    contentId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ["started", "completed", "abandoned", "failed"],
      index: true,
    },
    durationSeconds: {
      type: Number,
    },
    scoreOverall: {
      type: Number,
    },
    scoreBreakdownJson: {
      type: String,
    },
    llmTokensPrompt: {
      type: Number,
      default: 0,
    },
    llmTokensCompletion: {
      type: Number,
      default: 0,
    },
    ipAddress: {
      type: String,
      index: true,
    },
    deviceUaHash: {
      type: String,
      index: true,
    },
    userAgent: {
      type: String,
    },
    notes: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestampUtc: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
UserActivitySchema.index({ userId: 1, timestampUtc: -1 });
UserActivitySchema.index({ userId: 1, eventType: 1, timestampUtc: -1 });
UserActivitySchema.index({ userId: 1, context: 1, timestampUtc: -1 });
UserActivitySchema.index({ attemptId: 1, timestampUtc: -1 });

export default mongoose.models.UserActivity ||
  mongoose.model<IUserActivity>("UserActivity", UserActivitySchema);

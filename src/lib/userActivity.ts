// Utility functions for logging user activities

export interface ActivityLogData {
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
  notes?: string;
  metadata?: Record<string, any>;
}

/**
 * Log a single user activity
 */
export async function logUserActivity(data: ActivityLogData): Promise<boolean> {
  try {
    const response = await fetch("/api/user-activity/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return response.ok;
  } catch (error) {
    console.error("Error logging user activity:", error);
    return false;
  }
}

/**
 * Log multiple user activities in bulk
 */
export async function logUserActivities(
  activities: ActivityLogData[]
): Promise<boolean> {
  try {
    const response = await fetch("/api/user-activity/log", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activities }),
    });

    return response.ok;
  } catch (error) {
    console.error("Error bulk logging user activities:", error);
    return false;
  }
}

/**
 * Generate a unique attempt ID
 */
export function generateAttemptId(): string {
  return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calculate duration between two timestamps
 */
export function calculateDuration(startTime: Date, endTime?: Date): number {
  const end = endTime || new Date();
  return Math.floor((end.getTime() - startTime.getTime()) / 1000);
}

/**
 * Format score breakdown as JSON string
 */
export function formatScoreBreakdown(breakdown: Record<string, any>): string {
  return JSON.stringify(breakdown);
}

/**
 * Common activity logging patterns
 */
export const ActivityLogger = {
  // Practice activities
  async practiceStarted(
    attemptId: string,
    contentId: string,
    skill: "Listening" | "Reading" | "Writing" | "Speaking"
  ) {
    return logUserActivity({
      eventType: "practice_attempt_started",
      context: "practice",
      skill,
      attemptId,
      contentId,
      status: "started",
    });
  },

  async practiceCompleted(
    attemptId: string,
    contentId: string,
    skill: "Listening" | "Reading" | "Writing" | "Speaking",
    scoreOverall?: number,
    scoreBreakdown?: Record<string, any>,
    durationSeconds?: number
  ) {
    return logUserActivity({
      eventType: "practice_attempt_completed",
      context: "practice",
      skill,
      attemptId,
      contentId,
      status: "completed",
      scoreOverall,
      scoreBreakdownJson: scoreBreakdown
        ? formatScoreBreakdown(scoreBreakdown)
        : undefined,
      durationSeconds,
    });
  },

  // Mock exam activities
  async mockStarted(attemptId: string, contentId: string) {
    return logUserActivity({
      eventType: "mock_attempt_started",
      context: "mock",
      attemptId,
      contentId,
      status: "started",
    });
  },

  async mockCompleted(
    attemptId: string,
    contentId: string,
    scoreOverall?: number,
    scoreBreakdown?: Record<string, any>,
    durationSeconds?: number
  ) {
    return logUserActivity({
      eventType: "mock_attempt_completed",
      context: "mock",
      attemptId,
      contentId,
      status: "completed",
      scoreOverall,
      scoreBreakdownJson: scoreBreakdown
        ? formatScoreBreakdown(scoreBreakdown)
        : undefined,
      durationSeconds,
    });
  },

  // AI feedback activities
  async aiFeedbackGenerated(
    context: "practice" | "mock" | "learning",
    skill?: "Listening" | "Reading" | "Writing" | "Speaking",
    tokensPrompt?: number,
    tokensCompletion?: number,
    attemptId?: string
  ) {
    return logUserActivity({
      eventType: "ai_feedback_generated",
      context,
      skill,
      attemptId,
      llmTokensPrompt: tokensPrompt || 0,
      llmTokensCompletion: tokensCompletion || 0,
    });
  },

  // Learning activities
  async learningStarted(attemptId: string, contentId?: string) {
    return logUserActivity({
      eventType: "learning_attempt_started",
      context: "learning",
      attemptId,
      contentId,
      status: "started",
    });
  },

  // Authentication activities
  async userSignup(userId: string) {
    return logUserActivity({
      eventType: "signup",
      context: "system",
      metadata: { userId },
    });
  },

  async userLogin() {
    return logUserActivity({
      eventType: "login",
      context: "system",
    });
  },

  async userLogout() {
    return logUserActivity({
      eventType: "logout",
      context: "system",
    });
  },

  // Payment activities
  async paymentSuccessful(
    amount: number,
    currency: string,
    metadata?: Record<string, any>
  ) {
    return logUserActivity({
      eventType: "payment_successful",
      context: "payment",
      metadata: {
        amount,
        currency,
        ...metadata,
      },
    });
  },

  async paymentFailed(
    amount: number,
    currency: string,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return logUserActivity({
      eventType: "payment_failed",
      context: "payment",
      notes: reason,
      metadata: {
        amount,
        currency,
        ...metadata,
      },
    });
  },

  // Subscription activities
  async subscriptionCreated(planId: string, metadata?: Record<string, any>) {
    return logUserActivity({
      eventType: "subscription_created",
      context: "payment",
      metadata: {
        planId,
        ...metadata,
      },
    });
  },

  async subscriptionCancelled(
    planId: string,
    reason?: string,
    metadata?: Record<string, any>
  ) {
    return logUserActivity({
      eventType: "subscription_cancelled",
      context: "payment",
      notes: reason,
      metadata: {
        planId,
        ...metadata,
      },
    });
  },

  // Dispute activities
  async disputeCreated(
    disputeId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ) {
    return logUserActivity({
      eventType: "dispute_created",
      context: "payment",
      notes: reason,
      metadata: {
        disputeId,
        amount,
        ...metadata,
      },
    });
  },

  async disputeResolved(
    disputeId: string,
    resolution: string,
    metadata?: Record<string, any>
  ) {
    return logUserActivity({
      eventType: "dispute_resolved",
      context: "payment",
      notes: resolution,
      metadata: {
        disputeId,
        ...metadata,
      },
    });
  },

  // Score report viewing
  async scoreReportViewed(
    attemptId: string,
    context: "practice" | "mock",
    skill?: "Listening" | "Reading" | "Writing" | "Speaking"
  ) {
    return logUserActivity({
      eventType: "score_report_viewed",
      context,
      skill,
      attemptId,
    });
  },
};

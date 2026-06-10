import { hasPaidPracticeAccess } from "@/lib/subscriptionAccess";

/** First lesson sequence (day one) is free for all signed-in users. */
export const FREE_LEARNING_SEQUENCE = 1;

export function hasLearningSubscription(user: {
  publicMetadata?: Record<string, unknown>;
}): boolean {
  const meta = user.publicMetadata ?? {};
  return hasPaidPracticeAccess(
    meta.plan as string | undefined,
    meta.purchaseDate
  );
}

export function isFreeLearningSequence(sequenceNumber: number): boolean {
  return sequenceNumber <= FREE_LEARNING_SEQUENCE;
}

export function canAccessLearningSequence(
  sequenceNumber: number,
  hasSubscription: boolean
): boolean {
  if (isFreeLearningSequence(sequenceNumber)) return true;
  return hasSubscription;
}

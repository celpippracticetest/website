import type { NurtureEmailStage, NurtureTriggerType, TimeUnit } from "@/lib/nurture-email/config";

export type NurtureCandidate = {
  userId: string;
  signupAt?: Date;
  firstActivityAt?: Date;
  lastActivityAt?: Date;
  activityCount: number;
  isSubscribed: boolean;
  nurtureFlow?: NurtureTriggerType;
  nurtureStageId?: string;
  lastNurtureSentAt?: Date;
  nurtureWindowStartedAt?: Date;
  nurturesInWindow?: number;
};

const NURTURE_COOLDOWN_HOURS = 48;
const NURTURE_WINDOW_HOURS = 720; // 30 days
const MAX_NURTURES_PER_WINDOW = 8;
const INACTIVE_AFTER_HOURS = 72;

export function convertDelayToHours(amount: number, unit: TimeUnit): number {
  switch (unit) {
    case "minutes":
      return amount / 60;
    case "hours":
      return amount;
    case "days":
      return amount * 24;
    case "weeks":
      return amount * 24 * 7;
    default:
      return amount * 24;
  }
}

export function hasElapsedHours(reference: Date | undefined, now: Date, hours: number): boolean {
  if (!reference) return false;
  return now.getTime() - reference.getTime() >= hours * 60 * 60 * 1000;
}

export function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  const parsed = new Date(value as string | number);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

function isInactiveFreeUser(candidate: NurtureCandidate, now: Date): boolean {
  const last = toDate(candidate.lastActivityAt);
  if (!last || (candidate.activityCount ?? 0) === 0) return false;
  return hasElapsedHours(last, now, INACTIVE_AFTER_HOURS);
}

function stagesForFlow(
  stages: NurtureEmailStage[],
  flow: NurtureTriggerType
): NurtureEmailStage[] {
  return stages
    .filter((s) => s.enabled && s.triggerType === flow)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function pickNextStage(
  flowStages: NurtureEmailStage[],
  currentStageId: string | undefined,
  anchorAt: Date,
  lastSentAt: Date | undefined,
  now: Date
): NurtureEmailStage | null {
  if (flowStages.length === 0) return null;

  const currentIndex = currentStageId
    ? flowStages.findIndex((s) => s.id === currentStageId)
    : -1;

  for (let i = currentIndex + 1; i < flowStages.length; i++) {
    const stage = flowStages[i];
    const requiredHours = convertDelayToHours(stage.delayAmount, stage.delayUnit);
    const timeReached = hasElapsedHours(anchorAt, now, requiredHours);
    const cooldownOk =
      !lastSentAt || hasElapsedHours(lastSentAt, now, NURTURE_COOLDOWN_HOURS);

    if (timeReached && cooldownOk) {
      return stage;
    }
  }

  return null;
}

/**
 * Resolves the next nurture stage for a non-subscriber.
 * Returns null if subscribed, window capped, or no eligible stage.
 */
export function findNextNurtureStage(
  candidate: NurtureCandidate,
  stages: NurtureEmailStage[],
  now: Date = new Date()
): { stage: NurtureEmailStage; flow: NurtureTriggerType } | null {
  if (candidate.isSubscribed) return null;

  const lastSent = toDate(candidate.lastNurtureSentAt);
  const windowStart = toDate(candidate.nurtureWindowStartedAt);
  const inWindow = windowStart && !hasElapsedHours(windowStart, now, NURTURE_WINDOW_HOURS);
  if (inWindow && (candidate.nurturesInWindow ?? 0) >= MAX_NURTURES_PER_WINDOW) {
    return null;
  }

  const signupAt = toDate(candidate.signupAt);
  const firstActivityAt = toDate(candidate.firstActivityAt);
  const lastActivityAt = toDate(candidate.lastActivityAt);
  const activityCount = candidate.activityCount ?? 0;
  const currentFlow = candidate.nurtureFlow;
  const currentStageId = candidate.nurtureStageId;

  // Priority: inactive free users who were once active
  if (isInactiveFreeUser(candidate, now) && lastActivityAt) {
    const flow: NurtureTriggerType = "inactive_free";
    const flowStages = stagesForFlow(stages, flow);
    const stage = pickNextStage(
      flowStages,
      currentFlow === flow ? currentStageId : undefined,
      lastActivityAt,
      lastSent,
      now
    );
    if (stage) return { stage, flow };
  }

  // Active free users (practicing but not subscribed)
  if (activityCount > 0 && firstActivityAt && !isInactiveFreeUser(candidate, now)) {
    const flow: NurtureTriggerType = "free_user_active";
    const flowStages = stagesForFlow(stages, flow);
    const stage = pickNextStage(
      flowStages,
      currentFlow === flow ? currentStageId : undefined,
      firstActivityAt,
      lastSent,
      now
    );
    if (stage) return { stage, flow };
  }

  // New signups (including those who have not practiced yet)
  if (signupAt) {
    const flow: NurtureTriggerType = "signup";
    const flowStages = stagesForFlow(stages, flow);
    const stage = pickNextStage(
      flowStages,
      currentFlow === flow ? currentStageId : undefined,
      signupAt,
      lastSent,
      now
    );
    if (stage) return { stage, flow };
  }

  return null;
}

import type { TWritingAnswerDto } from "@/models/answer";

const GUEST_TRIAL_USED_KEY = "celpip_guest_writing_trial_used_v1";
const GUEST_ANSWERS_KEY = "celpip_guest_writing_answers_v1";

export function hasGuestWritingTrialAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GUEST_TRIAL_USED_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markGuestWritingTrialUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_TRIAL_USED_KEY, "1");
  } catch {
    // non-blocking
  }
}

export function saveGuestWritingAnswer(
  practiceId: string,
  answer: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(GUEST_ANSWERS_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown[]>) : {};
    const list = Array.isArray(existing[practiceId]) ? existing[practiceId] : [];
    existing[practiceId] = [answer, ...list].slice(0, 5);
    window.localStorage.setItem(GUEST_ANSWERS_KEY, JSON.stringify(existing));
  } catch {
    // non-blocking
  }
}

export function loadGuestWritingAnswers(practiceId: string): TWritingAnswerDto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ANSWERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, TWritingAnswerDto[]>;
    return Array.isArray(parsed[practiceId]) ? parsed[practiceId] : [];
  } catch {
    return [];
  }
}

const GUEST_SPEAKING_TRIAL_USED_KEY = "celpip_guest_speaking_trial_used_v1";

export function hasGuestSpeakingTrialAvailable(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(GUEST_SPEAKING_TRIAL_USED_KEY) !== "1";
  } catch {
    return true;
  }
}

export function markGuestSpeakingTrialUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_SPEAKING_TRIAL_USED_KEY, "1");
  } catch {
    // non-blocking
  }
}

const GUEST_SPEAKING_ANSWERS_KEY = "celpip_guest_speaking_answers_v1";

export function saveGuestSpeakingAnswer(
  practiceId: string,
  answer: Record<string, unknown>
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(GUEST_SPEAKING_ANSWERS_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown[]>) : {};
    const list = Array.isArray(existing[practiceId]) ? existing[practiceId] : [];
    existing[practiceId] = [answer, ...list].slice(0, 5);
    window.localStorage.setItem(GUEST_SPEAKING_ANSWERS_KEY, JSON.stringify(existing));
  } catch {
    // non-blocking
  }
}

export function loadGuestSpeakingAnswers(practiceId: string): TWritingAnswerDto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_SPEAKING_ANSWERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, TWritingAnswerDto[]>;
    return Array.isArray(parsed[practiceId]) ? parsed[practiceId] : [];
  } catch {
    return [];
  }
}

import { updateGa4Consent } from "@/lib/ga4Browser";

export const CONSENT_STORAGE_KEY = "celpip_consent_v1";

export type ConsentChoice = "essential" | "all";

export type GaConsentState = {
  ad_storage: "granted" | "denied";
  analytics_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
};

/** Opt-down if a CMP later restricts ads. Not the on-page default. */
export const ESSENTIAL_CONSENT: GaConsentState = {
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

/** Matches gtag defaults in `layout.tsx` (`beforeInteractive` consent snippet). */
export const MARKETING_CONSENT: GaConsentState = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
};

function persistConsent(choice: ConsentChoice): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  } catch {
    // Private mode / quota
  }
}

export function loadConsentChoice(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return raw === "all" || raw === "essential" ? raw : null;
  } catch {
    return null;
  }
}

export function applyConsentState(state: GaConsentState): void {
  updateGa4Consent(state);
}

/** Grant ad + personalization consent (gtag consent update). */
export function grantMarketingConsent(): void {
  applyConsentState(MARKETING_CONSENT);
  persistConsent("all");
}

/** Keep analytics, deny ads (default). */
export function acceptEssentialConsent(): void {
  applyConsentState(ESSENTIAL_CONSENT);
  persistConsent("essential");
}

/** Re-apply stored consent after page load (before banner interaction). */
export function applyStoredConsent(): ConsentChoice | null {
  const choice = loadConsentChoice();
  if (choice === "all") {
    applyConsentState(MARKETING_CONSENT);
  } else if (choice === "essential") {
    applyConsentState(ESSENTIAL_CONSENT);
  }
  return choice;
}

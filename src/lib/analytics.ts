// Browser analytics — GA4 via gtag (KPI event names from docs/KPI - deploy GA4 Events.csv).
import { track as vercelTrack } from "@vercel/analytics";
import { getAnalyticsStyleContext } from "@/lib/analyticsStyleContext";
import { getAnalyticsPricingModelContext } from "@/lib/analyticsPricingModelContext";
import { contentGroupFromPath } from "@/lib/contentGroup";
import { sendGa4Event, updateGa4Consent } from "@/lib/ga4Browser";
import {
  consumeDiagnosticComplete,
  consumeDiagnosticStart,
  getKpiEventContext,
  persistTargetClb,
  persistTestDateContext,
} from "@/lib/ga4KpiContext";
import type { GaConsentState } from "@/lib/consent";
import {
  GOOGLE_ADS_CONVERSION_ID,
  GOOGLE_ADS_SIGNUP_LABEL,
  GOOGLE_ADS_SUBSCRIBE_LABEL,
} from "@/lib/google-ads-constants";
import {
  metaEventIdCompleteRegistration,
  metaEventIdPageView,
  metaEventIdPurchase,
} from "@/lib/meta-constants";
import {
  newMetaClientEventId,
  sendMetaCompleteRegistrationBeacon,
  sendMetaPageViewBeacon,
} from "@/lib/metaCapiBeacon";
import type {
  AnalyticsEvent,
  UserContext,
  UserData,
  VercelAnalyticsCustomProperties,
} from "@/types/analytics";

export type PracticeTestType = "full_mock" | "module" | "quiz";
export type PracticeModule = "listening" | "reading" | "writing" | "speaking";

function normalizeModule(
  skill?: string | null
): PracticeModule | undefined {
  const s = (skill || "").toLowerCase();
  if (s === "listening" || s === "reading" || s === "writing" || s === "speaking") {
    return s;
  }
  return undefined;
}

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Debug mode - logs events to console in development
const DEBUG = process.env.NODE_ENV === "development";
const GOOGLE_ADS_PURCHASE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL ||
  GOOGLE_ADS_SUBSCRIBE_LABEL;
const GOOGLE_ADS_BEGIN_CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL || "";
const conversionDedupSet = new Set<string>();
const ATTRIBUTION_STORAGE_KEYS = {
  utmSource: "pending_utm_source",
  utmMedium: "pending_utm_medium",
  utmCampaign: "pending_utm_campaign",
  utmContent: "pending_utm_content",
  utmTerm: "pending_utm_term",
  gclid: "pending_gclid",
  gbraid: "pending_gbraid",
  wbraid: "pending_wbraid",
  fbclid: "pending_fbclid",
  msclkid: "pending_msclkid",
  ttclid: "pending_ttclid",
  googleAdsCampaignId: "pending_google_ads_campaign_id",
  entryPage: "pending_entry_page",
  referrer: "pending_referrer",
  sessionId: "pending_attribution_session_id",
} as const;

type RedditTrackPayload = {
  transactionId?: string;
  value?: number;
  currency?: string;
};

type RedditTrackFunction = (
  command: "track",
  eventName: "SignUp" | "Purchase",
  payload?: {
    currency?: string;
    itemCount?: number;
    transactionId?: string;
    value?: number;
  }
) => void;

function trackRedditEvent(
  eventName: "SignUp" | "Purchase",
  payload?: RedditTrackPayload
): void {
  const redditTrack = (window as Window & { rdt?: RedditTrackFunction }).rdt;
  if (!isBrowser || typeof redditTrack !== "function") return;

  try {
    if (eventName === "Purchase") {
      redditTrack("track", eventName, {
        currency: payload?.currency,
        itemCount: 1,
        transactionId: payload?.transactionId,
        value: payload?.value,
      });
      return;
    }

    redditTrack("track", eventName);
  } catch (error) {
    if (DEBUG) {
      console.warn("[Reddit Pixel] Failed to track event:", eventName, error);
    }
  }
}

/** Browser-side user context (set by `AuthAnalyticsTracker` from the active session). */
function getUserContext(): UserContext {
  if (!isBrowser) return {};

  try {
    type AnalyticsUser = {
      id: string;
      publicMetadata?: { plan?: unknown; planType?: unknown; totalSpend?: unknown };
    };
    const w = window as Window & { __CELPIP_ANALYTICS_USER?: AnalyticsUser | null };
    const user = w.__CELPIP_ANALYTICS_USER;
    if (user) {
      const meta = user.publicMetadata ?? {};
      return {
        user_id: user.id,
        user_plan: (meta as { plan?: unknown }).plan != null ? String((meta as { plan?: unknown }).plan) : "free",
        user_plan_type:
          (meta as { planType?: unknown }).planType != null
            ? String((meta as { planType?: unknown }).planType)
            : undefined,
        user_total_spend:
          (meta as { totalSpend?: unknown }).totalSpend != null
            ? Number((meta as { totalSpend?: unknown }).totalSpend)
            : 0,
        is_authenticated: true,
      };
    }

    return {
      is_authenticated: false,
    };
  } catch (error) {
    return {};
  }
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readAttributionFromStorage() {
  if (!isBrowser) {
    return {
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
      gclid: null,
      gbraid: null,
      wbraid: null,
      fbclid: null,
      msclkid: null,
      ttclid: null,
      google_ads_campaign_id: null,
      entry_page: null,
      referrer: null,
      attribution_session_id: null,
    };
  }

  return {
    utm_source: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.utmSource)),
    utm_medium: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.utmMedium)),
    utm_campaign: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.utmCampaign)),
    utm_content: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.utmContent)),
    utm_term: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.utmTerm)),
    gclid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.gclid)),
    gbraid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.gbraid)),
    wbraid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.wbraid)),
    fbclid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.fbclid)),
    msclkid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.msclkid)),
    ttclid: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.ttclid)),
    google_ads_campaign_id: normalizeString(
      localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.googleAdsCampaignId)
    ),
    entry_page: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.entryPage)),
    referrer: normalizeString(localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.referrer)),
    attribution_session_id: normalizeString(
      localStorage.getItem(ATTRIBUTION_STORAGE_KEYS.sessionId)
    ),
  };
}

function inferAttributionSource(params: {
  utmSource?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  referrer?: string | null;
}): string {
  if (params.utmSource) return params.utmSource;
  if (params.gclid || params.gbraid || params.wbraid) return "google";
  if (params.msclkid) return "bing";
  if (params.fbclid) return "facebook";
  if (params.ttclid) return "tiktok";
  if (params.referrer) return "referral";
  return "(direct)";
}

function inferAttributionMedium(params: {
  utmMedium?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  msclkid?: string | null;
  fbclid?: string | null;
  ttclid?: string | null;
  referrer?: string | null;
}): string {
  if (params.utmMedium) return params.utmMedium;
  if (params.gclid || params.gbraid || params.wbraid || params.msclkid || params.fbclid || params.ttclid) {
    return "cpc";
  }
  if (params.referrer) return "referral";
  return "(none)";
}

function inferSkillTypeFromPath(pathLike: string | null | undefined): string {
  const path = normalizeString(pathLike)?.toLowerCase() || "";
  if (!path) return "General";
  if (path.includes("/speaking")) return "Speaking";
  if (path.includes("/writing")) return "Writing";
  if (path.includes("/listening")) return "Listening";
  if (path.includes("/reading")) return "Reading";
  return "General";
}

function buildAttributionEventPayload(attributionData?: Record<string, unknown>) {
  const storage = readAttributionFromStorage();
  const data = attributionData ?? {};

  const utm_source = normalizeString(data.utm_source) || storage.utm_source;
  const utm_medium = normalizeString(data.utm_medium) || storage.utm_medium;
  const google_ads_campaign_id =
    normalizeString(data.google_ads_campaign_id) || storage.google_ads_campaign_id;
  const utm_campaign =
    normalizeString(data.utm_campaign) ||
    storage.utm_campaign ||
    google_ads_campaign_id ||
    "(not set)";
  const utm_content = normalizeString(data.utm_content) || storage.utm_content;
  const utm_term = normalizeString(data.utm_term) || storage.utm_term;
  const gclid = normalizeString(data.gclid) || normalizeString(data.attribution_gclid) || storage.gclid;
  const gbraid = normalizeString(data.gbraid) || normalizeString(data.attribution_gbraid) || storage.gbraid;
  const wbraid = normalizeString(data.wbraid) || normalizeString(data.attribution_wbraid) || storage.wbraid;
  const fbclid = normalizeString(data.fbclid) || normalizeString(data.attribution_fbclid) || storage.fbclid;
  const msclkid =
    normalizeString(data.msclkid) || normalizeString(data.attribution_msclkid) || storage.msclkid;
  const ttclid = normalizeString(data.ttclid) || normalizeString(data.attribution_ttclid) || storage.ttclid;
  const referrer = normalizeString(data.referrer) || storage.referrer;
  const entry_page = normalizeString(data.entry_page) || storage.entry_page;
  const purchase_page = normalizeString(data.purchase_page);

  const attribution_source =
    normalizeString(data.attribution_source) ||
    inferAttributionSource({ utmSource: utm_source, gclid, gbraid, wbraid, msclkid, fbclid, ttclid, referrer });
  const attribution_medium =
    normalizeString(data.attribution_medium) ||
    inferAttributionMedium({ utmMedium: utm_medium, gclid, gbraid, wbraid, msclkid, fbclid, ttclid, referrer });
  const attribution_campaign = normalizeString(data.attribution_campaign) || utm_campaign;
  const attribution_session_id =
    normalizeString(data.attribution_session_id) || storage.attribution_session_id;
  const purchase_type = normalizeString(data.purchase_type) || "first_purchase";
  const skill_type =
    normalizeString(data.skill_type) ||
    inferSkillTypeFromPath(purchase_page || entry_page || null);

  return {
    attribution_source,
    attribution_medium,
    attribution_campaign,
    attribution_gclid: gclid,
    attribution_gbraid: gbraid,
    attribution_wbraid: wbraid,
    attribution_fbclid: fbclid,
    attribution_msclkid: msclkid,
    attribution_ttclid: ttclid,
    google_ads_campaign_id: google_ads_campaign_id || undefined,
    utm_source: utm_source || attribution_source,
    utm_medium: utm_medium || attribution_medium,
    utm_campaign: utm_campaign || "(not set)",
    utm_content,
    utm_term,
    gclid,
    gbraid,
    wbraid,
    fbclid,
    msclkid,
    ttclid,
    entry_page,
    purchase_page,
    referrer,
    attribution_session_id,
    purchase_type,
    skill_type,
  };
}

function markDeduplicatedOnce(key: string): boolean {
  if (!key) return false;
  if (conversionDedupSet.has(key)) return true;

  if (isBrowser) {
    const storageKey = `analytics_once_${key}`;
    if (localStorage.getItem(storageKey) === "1") {
      conversionDedupSet.add(key);
      return true;
    }
    localStorage.setItem(storageKey, "1");
  }

  conversionDedupSet.add(key);
  return false;
}

function getGoogleAdsSendTo(label?: string): string | undefined {
  if (!GOOGLE_ADS_CONVERSION_ID || !label) return undefined;
  return `${GOOGLE_ADS_CONVERSION_ID}/${label}`;
}

function normalizeUserData(userData?: UserData): UserData | undefined {
  if (!userData || typeof userData !== "object") return undefined;
  const normalized = { ...userData };
  if (typeof normalized.email === "string") {
    normalized.email = normalized.email.trim().toLowerCase();
  }
  if (typeof normalized.phone_number === "string") {
    normalized.phone_number = normalized.phone_number.replace(/\s+/g, "");
  }
  return normalized;
}

/**
 * GTM-only event for Ads/Meta Enhanced Conversions.
 * Pushes to dataLayer — never sent to GA4 (blocked in ga4Browser).
 */
function pushAdsEnhancedConversion(params: {
  conversionEvent: string;
  conversionLabel?: string;
  value?: number;
  currency?: string;
  transactionId?: string;
  userData?: UserData;
  purchaseType?: "first_purchase" | "subscription_renewal";
}): void {
  if (!isBrowser) return;
  try {
    const dataLayer = (window.dataLayer = window.dataLayer || []);
    dataLayer.push({
      event: "ads_enhanced_conversion",
      conversion_event: params.conversionEvent,
      conversion_label: params.conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(params.conversionLabel || ""),
      value: params.value,
      currency: params.currency,
      transaction_id: params.transactionId,
      purchase_type: params.purchaseType,
      user_data: normalizeUserData(params.userData),
    });
  } catch (error) {
    if (DEBUG) {
      console.warn("[Analytics] ads_enhanced_conversion push failed:", error);
    }
  }
}

/** Track an analytics event in GA4. */
export function trackEvent(
  event: AnalyticsEvent,
  enrichContext: boolean = true
): void {
  if (!isBrowser) {
    return;
  }

  try {
    const styleContext = getAnalyticsStyleContext();
    const pricingModelContext = getAnalyticsPricingModelContext();
    const kpiContext = getKpiEventContext();
    const enrichedEvent = enrichContext
      ? {
          ...kpiContext,
          ...event,
          ...getUserContext(),
          ...(event.style === undefined ? styleContext : {}),
          ...(event.pricing_ab_model === undefined ? pricingModelContext : {}),
          timestamp: new Date().toISOString(),
        }
      : event;

    sendGa4Event(enrichedEvent as Record<string, unknown>);
  } catch (error) {
    console.error("[Analytics] Error sending event:", error);
  }
}

/** @deprecated Use trackEvent */
export const pushToDataLayer = trackEvent;

const VERCEL_ANALYTICS_MAX_LEN = 255;

function pickVercelPropsForAnalytics(
  data?: VercelAnalyticsCustomProperties
): Record<string, string | number | boolean | null> {
  if (!data) return {};

  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === "event" || key === "vercel_event_name") continue;
    if (typeof value === "string") {
      out[key] =
        value.length > VERCEL_ANALYTICS_MAX_LEN
          ? value.slice(0, VERCEL_ANALYTICS_MAX_LEN)
          : value;
    } else if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Vercel Web Analytics custom event, mirrored to GA4 (`vercel_analytics`).
 * @see https://vercel.com/docs/analytics/custom-events
 */
export function trackVercelEvent(
  name: string,
  data?: VercelAnalyticsCustomProperties
): void {
  if (!isBrowser) return;

  const safeName =
    name.length > VERCEL_ANALYTICS_MAX_LEN
      ? name.slice(0, VERCEL_ANALYTICS_MAX_LEN)
      : name;

  try {
    vercelTrack(safeName, data);
  } catch (error) {
    if (DEBUG) {
      console.warn("[Vercel Analytics] track() failed:", error);
    }
  }

  try {
    trackEvent(
      {
        event: "vercel_analytics",
        vercel_event_name: safeName,
        ...pickVercelPropsForAnalytics(data),
      } as AnalyticsEvent,
      true
    );
  } catch (error) {
    if (DEBUG) {
      console.warn("[Analytics] vercel_analytics failed:", error);
    }
  }
}

/**
 * Update consent state
 */
export function updateConsent(consentState: GaConsentState): void {
  updateGa4Consent(consentState);
}

export {
  acceptEssentialConsent,
  applyStoredConsent,
  grantMarketingConsent,
  ESSENTIAL_CONSENT,
  MARKETING_CONSENT,
  type ConsentChoice,
  type GaConsentState,
} from "@/lib/consent";

/**
 * Track page view
 */
export function trackPageView(
  path: string,
  title?: string,
  userId?: string,
  userPlan?: string
): void {
  const eventId = metaEventIdPageView(newMetaClientEventId());
  const pageLocation = isBrowser ? window.location.href : path;
  const payload: Record<string, unknown> = {
    event: "page_view",
    page_path: path,
    page_location: pageLocation,
    page_title: title || (isBrowser ? document.title : undefined),
    page_referrer: isBrowser ? document.referrer || undefined : undefined,
    content_group: contentGroupFromPath(path),
    user_id: userId,
    user_plan: userPlan,
    event_id: eventId,
  };
  if (path === "/blog") {
    payload.page_type = "blog_list";
  } else if (path.startsWith("/blog/") && path !== "/blog") {
    payload.page_type = "blog_article";
    payload.blog_slug = path.replace(/^\/blog\//, "").split("?")[0];
  }
  trackEvent(payload as AnalyticsEvent, true);
  sendMetaPageViewBeacon(eventId, userId);
}

/**
 * Track blog list view
 */
export function trackBlogListView(path: string, title?: string): void {
  trackEvent({
    event: "blog_list_viewed",
    page_path: path,
    page_title: title || (isBrowser ? document.title : undefined),
  });
}

/**
 * Track blog article view
 */
export function trackBlogArticleView(
  articleTitle: string,
  articleSlug: string,
  options?: { pagePath?: string; pageTitle?: string; categories?: string[] }
): void {
  trackEvent({
    event: "blog_article_viewed",
    article_title: articleTitle,
    article_slug: articleSlug,
    page_path: options?.pagePath || (isBrowser ? window.location.pathname : ""),
    page_title: options?.pageTitle || (isBrowser ? document.title : undefined),
    article_categories: options?.categories,
  });
}

/**
 * Track CTA click (KPI + GA4 select_content-compatible params).
 */
export function trackCTAClick(
  ctaText: string,
  ctaLocation: string,
  options?: {
    contentType?: string;
    itemId?: string;
    sourcePage?: string;
    contentGroup?: string;
  }
): void {
  const sourcePage =
    options?.sourcePage ||
    (isBrowser ? `${window.location.pathname}${window.location.search}` : undefined);
  trackEvent({
    event: "cta_click",
    cta_text: ctaText,
    cta_location: ctaLocation,
    content_type: options?.contentType || "cta",
    item_id: options?.itemId || ctaLocation,
    source_page: sourcePage,
    content_group:
      options?.contentGroup || contentGroupFromPath(sourcePage),
  });
}

/**
 * Track navigation click
 */
export function trackNavClick(
  linkText: string,
  linkUrl: string,
  navType: "header" | "footer" | "mobile" | "bottom"
): void {
  trackEvent({
    event: "nav_click",
    link_text: linkText,
    link_url: linkUrl,
    nav_type: navType,
  });
}

/**
 * Track authentication events
 */
export const trackAuth = {
  signUpInitiated: (method?: string, source?: string) => {
    trackEvent({
      event: "sign_up_initiated",
      method,
      source,
    });
  },

  signUpCompleted: (
    userId: string,
    method?: string,
    userData?: UserData,
    attributionData?: Record<string, unknown>
  ) => {
    const dedupeKey = `sign_up_${userId}`;
    if (markDeduplicatedOnce(dedupeKey)) return;

    const eventId = metaEventIdCompleteRegistration(userId);

    // Server backup: `/api/users/webhook` + Meta CAPI CompleteRegistration.
    trackEvent({
      event: "sign_up",
      user_id: userId,
      method,
      ...attributionData,
      event_id: eventId,
      value: 1,
      currency: "CAD",
    });
    trackRedditEvent("SignUp");
    sendMetaCompleteRegistrationBeacon({
      eventId,
      userId,
      email: typeof userData?.email === "string" ? userData.email : undefined,
    });
    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "sign_up",
        conversionLabel: GOOGLE_ADS_SIGNUP_LABEL,
        value: 1,
        currency: "CAD",
        userData,
      });
    }
  },

  loginInitiated: (method?: string) => {
    trackEvent({
      event: "login_initiated",
      method,
    });
  },

  loginCompleted: (
    userId: string,
    method?: string,
    daysSinceLastLogin?: number
  ) => {
    trackEvent({
      event: "login",
      user_id: userId,
      method,
      days_since_last_login: daysSinceLastLogin,
    });
  },

  emailVerified: (hoursToVerify?: number) => {
    trackEvent({
      event: "email_verified",
      hours_to_verify: hoursToVerify,
    });
  },

  logout: (userId?: string) => {
    trackEvent({
      event: "logout",
      user_id: userId,
    });
  },
};

/**
 * Track modal events
 */
export const trackModal = {
  viewed: (modalName: string, triggerSource?: string) => {
    trackEvent({
      event: "modal_viewed",
      modal_name: modalName,
      trigger_source: triggerSource,
    });
  },

  closed: (modalName: string, userAction?: "dismissed" | "completed") => {
    trackEvent({
      event: "modal_closed",
      modal_name: modalName,
      user_action: userAction,
    });
  },
};

/**
 * Track exam / mock events (KPI: practice_test_* with test_type full_mock).
 */
export const trackExam = {
  overviewViewed: (userPlan?: string) => {
    trackEvent({
      event: "exam_overview_viewed",
      user_plan: userPlan,
    });
  },

  started: (
    examId: string,
    partId?: string,
    sectionType?: string,
    userPlan?: string
  ) => {
    trackKpi.practiceTestStart({
      testId: examId,
      testType: "full_mock",
      module: normalizeModule(sectionType),
      isFree: userPlan === "free" || userPlan == null,
    });
  },

  partStarted: (examId: string, partId: string, sectionType: string) => {
    trackEvent({
      event: "exam_part_started",
      exam_id: examId,
      part_id: partId,
      section_type: sectionType,
    });
  },

  questionAnswered: (
    examId: string,
    partId: string,
    questionNumber: number,
    sectionType: string
  ) => {
    trackEvent({
      event: "exam_question_answered",
      exam_id: examId,
      part_id: partId,
      question_number: questionNumber,
      section_type: sectionType,
    });
  },

  partCompleted: (
    examId: string,
    partId: string,
    sectionType: string,
    timeSpent?: number,
    score?: number
  ) => {
    trackEvent({
      event: "exam_part_completed",
      exam_id: examId,
      part_id: partId,
      section_type: sectionType,
      time_spent: timeSpent,
      score,
    });
  },

  completed: (examId: string, totalScore?: number, timeSpent?: number) => {
    trackKpi.practiceTestComplete({
      testId: examId,
      testType: "full_mock",
      durationSec: timeSpent,
      rawScore: totalScore,
    });
  },

  resultsViewed: (examId: string, score?: number) => {
    trackKpi.scoreReportView({
      testId: examId,
      overallClb: score,
    });
  },

  abandoned: (
    examId: string,
    partId?: string,
    completionPercentage?: number,
    exitReason?: string
  ) => {
    trackKpi.practiceTestAbandon({
      testId: examId,
      percentComplete: completionPercentage,
      exitReason: exitReason || "navigation_away",
    });
  },
};

/**
 * Track practice events (KPI: practice_test_* with test_type module).
 */
export const trackPractice = {
  overviewViewed: (skillType?: string) => {
    trackEvent({
      event: "practice_overview_viewed",
      skill_type: skillType,
    });
  },

  started: (
    practiceId: string,
    skillType: string,
    difficultyLevel?: string,
    options?: { isFree?: boolean; attemptNumber?: number }
  ) => {
    trackKpi.practiceTestStart({
      testId: practiceId,
      testType: "module",
      module: normalizeModule(skillType),
      difficulty: difficultyLevel,
      isFree: options?.isFree,
      attemptNumber: options?.attemptNumber,
    });
  },

  completed: (
    practiceId: string,
    skillType: string,
    score?: number,
    timeSpent?: number,
    options?: {
      estimatedClb?: number;
      questionsAttempted?: number;
      completionRate?: number;
    }
  ) => {
    trackKpi.practiceTestComplete({
      testId: practiceId,
      testType: "module",
      module: normalizeModule(skillType),
      durationSec: timeSpent,
      rawScore: score,
      estimatedClb: options?.estimatedClb,
      questionsAttempted: options?.questionsAttempted,
      completionRate: options?.completionRate,
    });
  },

  resultsViewed: (practiceId: string, skillType: string, score?: number) => {
    trackKpi.scoreReportView({
      testId: practiceId,
      module: normalizeModule(skillType),
      overallClb: score,
    });
  },

  aiFeedbackViewed: (
    context: "practice" | "exam",
    practiceId?: string,
    examId?: string,
    options?: { module?: string; timeOnFeedbackSec?: number; sectionsExpanded?: number }
  ) => {
    trackEvent({
      event: "ai_feedback_viewed",
      practice_id: practiceId,
      exam_id: examId,
      context,
      module: normalizeModule(options?.module) || normalizeModule(context),
      time_on_feedback_sec: options?.timeOnFeedbackSec,
      sections_expanded: options?.sectionsExpanded,
    });
  },
};

/**
 * Track e-commerce events (GA4 standard)
 */
export const trackEcommerce = {
  viewItemList: (items: any[], itemListId?: string, itemListName?: string) => {
    trackEvent({
      event: "view_item_list",
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items,
      },
    });
  },

  selectItem: (items: any[], itemListId?: string, itemListName?: string) => {
    trackEvent({
      event: "select_item",
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items,
      },
    });
  },

  beginCheckout: (
    items: any[],
    currency: string,
    value: number,
    coupon?: string,
    userData?: UserData
  ) => {
    const attributionPayload = buildAttributionEventPayload();
    trackEvent({
      event: "begin_checkout",
      value,
      currency,
      ecommerce: {
        currency,
        value,
        items,
        ...(coupon && { coupon }),
      },
      ...attributionPayload,
    });
    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "begin_checkout",
        conversionLabel: GOOGLE_ADS_BEGIN_CHECKOUT_LABEL,
        value,
        currency,
        userData,
      });
    }
  },

  purchase: (
    transactionId: string,
    items: any[],
    currency: string,
    value: number,
    coupon?: string,
    userData?: UserData,
    attributionData?: Record<string, unknown>,
    purchaseType: "first_purchase" | "subscription_renewal" = "first_purchase"
  ) => {
    const dedupeKey = `purchase_${transactionId}`;
    if (markDeduplicatedOnce(dedupeKey)) return;

    const attributionPayload = buildAttributionEventPayload(attributionData);
    const resolvedPurchaseType: "first_purchase" | "subscription_renewal" =
      normalizeString(attributionPayload.purchase_type) === "subscription_renewal"
        ? "subscription_renewal"
        : purchaseType;
    const { purchase_type: _ignoredPurchaseType, ...attributionWithoutPurchaseType } =
      attributionPayload;
    const eventId = metaEventIdPurchase(transactionId);
    trackEvent({
      event: "purchase",
      value,
      currency,
      transaction_id: transactionId,
      event_id: eventId,
      ecommerce: {
        transaction_id: transactionId,
        currency,
        value,
        items,
        ...(coupon && { coupon }),
      },
      ...attributionWithoutPurchaseType,
      purchase_type: resolvedPurchaseType,
    });
    trackRedditEvent("Purchase", {
      transactionId,
      value,
      currency,
    });
    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "purchase",
        conversionLabel: GOOGLE_ADS_PURCHASE_LABEL,
        value,
        currency,
        transactionId,
        userData,
        purchaseType: resolvedPurchaseType,
      });
    }
  },

  refund: (transactionId: string, currency: string, value: number) => {
    trackEvent({
      event: "refund",
      ecommerce: {
        transaction_id: transactionId,
        currency,
        value,
      },
    });
  },

  subscriptionCancelled: (
    reason?: "user_cancelled" | "payment_failed" | "admin_cancelled" | "refunded",
    planType?: string,
    subscriptionId?: string,
    extra?: {
      survey_reason?: string;
      flow_id?: string | null;
      daysSubscribed?: number;
      mrrLost?: number;
      willExpireAt?: string;
    }
  ) => {
    trackEvent({
      event: "subscription_cancel",
      cancellation_reason: reason,
      plan: planType,
      plan_type: planType,
      subscription_id: subscriptionId,
      survey_reason: extra?.survey_reason,
      flow_id: extra?.flow_id ?? undefined,
      days_subscribed: extra?.daysSubscribed,
      mrr_lost: extra?.mrrLost,
      will_expire_at: extra?.willExpireAt,
    });
  },
};

/**
 * Track engagement events
 */
export const trackEngagement = {
  faqClick: (question: string, category?: string) => {
    trackEvent({
      event: "faq_click",
      faq_question: question,
      faq_category: category,
    });
  },

  videoStarted: (title?: string, url?: string) => {
    trackEvent({
      event: "video_started",
      video_title: title,
      video_url: url,
    });
  },

  videoCompleted: (title?: string, url?: string) => {
    trackEvent({
      event: "video_completed",
      video_title: title,
      video_url: url,
    });
  },

  chatbotMessageSent: (messageType?: string) => {
    trackEvent({
      event: "chatbot_message_sent",
      message_type: messageType,
    });
  },

  wordViewed: (wordId?: string, wordText?: string) => {
    trackEvent({
      event: "word_viewed",
      word_id: wordId,
      word_text: wordText,
    });
  },

  wordMastered: (wordId?: string, wordText?: string) => {
    trackEvent({
      event: "word_mastered",
      word_id: wordId,
      word_text: wordText,
    });
  },

  audioPlayed: (
    audioType: string,
    audioSource?: string,
    options?: { clipId?: string; module?: string; replayCount?: number }
  ) => {
    trackEvent({
      event: "audio_play",
      audio_type: audioType,
      audio_source: audioSource,
      clip_id: options?.clipId || audioSource,
      module: normalizeModule(options?.module),
      replay_count: options?.replayCount,
    });
  },

  leadCaptureSubmitted: (
    location: string,
    triggerSource: string,
    leadCaptureId: string
  ) => {
    trackEvent({
      event: "lead_capture_submitted",
      location,
      trigger_source: triggerSource,
      lead_capture_id: leadCaptureId,
    });
  },

  refundRequestSubmitted: (
    requestReason: string,
    trackingCode?: string,
    options?: { daysSincePurchase?: number; value?: number }
  ) => {
    trackEvent({
      event: "refund_request",
      reason: requestReason,
      refund_request_reason: requestReason,
      refund_tracking_code: trackingCode,
      days_since_purchase: options?.daysSincePurchase,
      value: options?.value,
    });
  },

  refundRequestTrackingSearched: (trackingCode: string) => {
    trackEvent({
      event: "refund_request_tracking_searched",
      refund_tracking_code: trackingCode,
    });
  },

  refundRequestStatusViewed: (
    status: string,
    rejectionReason?: string
  ) => {
    trackEvent({
      event: "refund_request_status_viewed",
      refund_request_status: status,
      refund_rejection_reason: rejectionReason,
    });
  },
};

/**
 * Track referral events
 */
export const trackReferral = {
  pageViewed: (userId?: string) => {
    trackEvent({
      event: "referral_page_viewed",
      user_id: userId,
    });
  },

  codeCopied: (referralCode: string) => {
    trackEvent({
      event: "referral_code_copied",
      referral_code: referralCode,
    });
  },

  inviteSent: (inviteMethod: string) => {
    trackEvent({
      event: "referral_invite_sent",
      invite_method: inviteMethod,
    });
  },

  withdrawalRequested: (amount: number, currency: string) => {
    trackEvent({
      event: "withdrawal_requested",
      amount,
      currency,
    });
  },
};

/**
 * KPI GA4 events from docs/KPI - deploy GA4 Events.csv
 */
export const trackKpi = {
  practiceTestStart: (params: {
    testId: string;
    testType: PracticeTestType;
    module?: PracticeModule;
    difficulty?: string;
    isFree?: boolean;
    attemptNumber?: number;
    isDiagnostic?: boolean;
  }) => {
    const isDiagnostic =
      params.isDiagnostic ??
      (params.testType === "full_mock" &&
        !params.module &&
        consumeDiagnosticStart());
    trackEvent({
      event: "practice_test_start",
      test_id: params.testId,
      test_type: params.testType,
      module: params.module,
      difficulty: params.difficulty,
      is_free: params.isFree,
      attempt_number: params.attemptNumber,
      is_diagnostic: isDiagnostic,
    });
    if (isDiagnostic) {
      trackEvent({
        event: "diagnostic_test_start",
        test_id: params.testId,
        test_type: params.testType,
        module: params.module,
        is_free: params.isFree,
      });
    }
  },

  practiceTestComplete: (params: {
    testId: string;
    testType?: PracticeTestType;
    module?: PracticeModule;
    durationSec?: number;
    rawScore?: number;
    estimatedClb?: number;
    questionsAttempted?: number;
    completionRate?: number;
    isDiagnostic?: boolean;
  }) => {
    const isDiagnostic =
      params.isDiagnostic ??
      (params.testType === "full_mock" &&
        !params.module &&
        consumeDiagnosticComplete());
    trackEvent({
      event: "practice_test_complete",
      test_id: params.testId,
      test_type: params.testType,
      module: params.module,
      duration_sec: params.durationSec,
      raw_score: params.rawScore,
      estimated_clb: params.estimatedClb,
      questions_attempted: params.questionsAttempted,
      completion_rate: params.completionRate,
      is_diagnostic: isDiagnostic,
    });
    if (isDiagnostic) {
      trackEvent({
        event: "diagnostic_test_complete",
        test_id: params.testId,
        test_type: params.testType,
        module: params.module,
        duration_sec: params.durationSec,
        estimated_clb: params.estimatedClb,
      });
    }
  },

  practiceTestAbandon: (params: {
    testId?: string;
    module?: PracticeModule;
    percentComplete?: number;
    lastQuestionIndex?: number;
    exitReason?: string;
  }) => {
    trackEvent({
      event: "practice_test_abandon",
      test_id: params.testId,
      module: params.module,
      percent_complete: params.percentComplete,
      last_question_index: params.lastQuestionIndex,
      exit_reason: params.exitReason,
    });
  },

  practiceTestResume: (params: {
    testId: string;
    hoursSincePause?: number;
  }) => {
    trackEvent({
      event: "practice_test_resume",
      test_id: params.testId,
      hours_since_pause: params.hoursSincePause,
    });
  },

  timerExpired: (params: {
    module?: PracticeModule;
    questionsUnanswered?: number;
  }) => {
    trackEvent({
      event: "timer_expired",
      module: params.module,
      questions_unanswered: params.questionsUnanswered,
    });
  },

  audioError: (params: {
    clipId?: string;
    errorType?: string;
    browser?: string;
    device?: string;
  }) => {
    trackEvent({
      event: "audio_error",
      clip_id: params.clipId,
      error_type: params.errorType,
      browser: params.browser,
      device: params.device,
    });
  },

  writingTaskSubmit: (params: {
    taskNumber: 1 | 2 | number;
    wordCount?: number;
    timeSpentSec?: number;
    isFree?: boolean;
  }) => {
    trackEvent({
      event: "writing_task_submit",
      task_number: params.taskNumber,
      word_count: params.wordCount,
      time_spent_sec: params.timeSpentSec,
      is_free: params.isFree,
    });
  },

  speakingTaskSubmit: (params: {
    taskNumber: number;
    durationSec?: number;
    retakes?: number;
    isFree?: boolean;
  }) => {
    trackEvent({
      event: "speaking_task_submit",
      task_number: params.taskNumber,
      duration_sec: params.durationSec,
      retakes: params.retakes,
      is_free: params.isFree,
    });
  },

  micPermissionResult: (params: {
    result: "granted" | "denied" | "dismissed";
    browser?: string;
    device?: string;
  }) => {
    trackEvent({
      event: "mic_permission_result",
      result: params.result,
      mic_result: params.result,
      browser: params.browser,
      device: params.device,
    });
  },

  aiScoringRequested: (params: {
    module?: PracticeModule | string;
    taskNumber?: number;
    inputLength?: number;
    model?: string;
  }) => {
    trackEvent({
      event: "ai_scoring_requested",
      module: normalizeModule(params.module) || params.module,
      task_number: params.taskNumber,
      input_length: params.inputLength,
      model: params.model,
    });
  },

  aiScoreReturned: (params: {
    module?: PracticeModule | string;
    latencyMs?: number;
    estimatedClb?: number;
  }) => {
    trackEvent({
      event: "ai_score_returned",
      module: normalizeModule(params.module) || params.module,
      latency_ms: params.latencyMs,
      estimated_clb: params.estimatedClb,
    });
  },

  aiScoringFailed: (params: {
    module?: PracticeModule | string;
    errorType?: string;
    retryCount?: number;
  }) => {
    trackEvent({
      event: "ai_scoring_failed",
      module: normalizeModule(params.module) || params.module,
      error_type: params.errorType,
      retry_count: params.retryCount,
    });
  },

  aiFeedbackRated: (params: {
    rating: number | string;
    module?: PracticeModule | string;
    reasonText?: string;
  }) => {
    trackEvent({
      event: "ai_feedback_rated",
      rating: params.rating,
      module: normalizeModule(params.module) || params.module,
      reason_text: params.reasonText,
    });
  },

  scoreReportView: (params: {
    testId?: string;
    module?: PracticeModule;
    overallClb?: number;
    listeningClb?: number;
    readingClb?: number;
    writingClb?: number;
    speakingClb?: number;
  }) => {
    trackEvent({
      event: "score_report_view",
      test_id: params.testId,
      module: params.module,
      overall_clb: params.overallClb,
      listening_clb: params.listeningClb,
      reading_clb: params.readingClb,
      writing_clb: params.writingClb,
      speaking_clb: params.speakingClb,
    });
  },

  onboardingStepComplete: (params: {
    stepName: string;
    stepNumber: number;
    totalSteps: number;
  }) => {
    trackEvent({
      event: "onboarding_step_complete",
      step_name: params.stepName,
      step_number: params.stepNumber,
      total_steps: params.totalSteps,
    });
  },

  onboardingComplete: (params?: {
    durationSec?: number;
    stepsSkipped?: number;
  }) => {
    trackEvent({
      event: "onboarding_complete",
      duration_sec: params?.durationSec,
      steps_skipped: params?.stepsSkipped,
    });
  },

  testDateSet: (params: {
    testDate: string;
    daysUntilTest?: number;
    isBooked?: boolean;
  }) => {
    const persisted = persistTestDateContext(params.testDate);
    trackEvent({
      event: "test_date_set",
      test_date: params.testDate,
      days_until_test: params.daysUntilTest ?? persisted.daysUntilTest,
      days_until_test_bucket: persisted.bucket,
      is_booked: params.isBooked,
    });
  },

  targetScoreSet: (params: {
    targetClb: number | string;
    purpose?: string;
  }) => {
    persistTargetClb(params.targetClb);
    trackEvent({
      event: "target_score_set",
      target_clb: params.targetClb,
      purpose: params.purpose,
    });
  },

  explanationOpen: (params: {
    module?: PracticeModule | string;
    testId?: string;
    questionIndex?: number;
    incorrectCount?: number;
    questionCount?: number;
    source?: "score_report" | "practice_review" | "ask_ai";
  }) => {
    trackEvent({
      event: "explanation_open",
      module: normalizeModule(params.module) || params.module,
      test_id: params.testId,
      question_index: params.questionIndex,
      incorrect_count: params.incorrectCount,
      question_count: params.questionCount,
      source: params.source,
      explain_source: params.source,
    });
  },

  incorrectAnswerShown: (params: {
    module?: PracticeModule | string;
    testId?: string;
    incorrectCount: number;
    questionCount?: number;
  }) => {
    trackEvent({
      event: "incorrect_answer",
      module: normalizeModule(params.module) || params.module,
      test_id: params.testId,
      incorrect_count: params.incorrectCount,
      question_count: params.questionCount,
    });
  },

  studyPlanTaskComplete: (params: {
    taskId?: string;
    onTime?: boolean;
    skill?: PracticeModule | string;
  }) => {
    trackEvent({
      event: "study_plan_task_complete",
      task_id: params.taskId,
      on_time: params.onTime,
      module: normalizeModule(params.skill) || params.skill,
    });
  },

  paywallView: (params?: {
    triggerSource?: string;
    plansShown?: string | number;
    daysUntilTest?: number;
  }) => {
    trackEvent({
      event: "paywall_view",
      trigger_source: params?.triggerSource,
      plans_shown: params?.plansShown,
      days_until_test: params?.daysUntilTest,
    });
  },

  viewPromotion: (params: {
    promotionId: string;
    promotionName?: string;
    creativeSlot?: string;
  }) => {
    trackEvent({
      event: "view_promotion",
      promotion_id: params.promotionId,
      promotion_name: params.promotionName,
      creative_slot: params.creativeSlot,
    });
  },

  selectPromotion: (params: {
    promotionId: string;
    promotionName?: string;
    creativeSlot?: string;
  }) => {
    trackEvent({
      event: "select_promotion",
      promotion_id: params.promotionId,
      promotion_name: params.promotionName,
      creative_slot: params.creativeSlot,
    });
  },

  paymentFailed: (params: {
    errorCode?: string;
    declineReason?: string;
    paymentType?: string;
    value?: number;
    attemptNumber?: number;
  }) => {
    trackEvent({
      event: "payment_failed",
      error_code: params.errorCode,
      decline_reason: params.declineReason,
      payment_type: params.paymentType,
      value: params.value,
      attempt_number: params.attemptNumber,
    });
  },

  checkoutError: (params: {
    errorType?: string;
    step?: string;
    fieldName?: string;
  }) => {
    trackEvent({
      event: "checkout_error",
      error_type: params.errorType,
      step: params.step,
      field_name: params.fieldName,
    });
  },

  promoCodeApply: (params: {
    coupon: string;
    discountPct?: number;
    result: "applied" | "invalid" | "expired";
  }) => {
    trackEvent({
      event: "promo_code_apply",
      coupon: params.coupon,
      discount_pct: params.discountPct,
      result: params.result,
    });
  },

  cancelFlowStart: (params?: {
    plan?: string;
    daysSubscribed?: number;
    testsCompleted?: number;
  }) => {
    trackEvent({
      event: "cancel_flow_start",
      plan: params?.plan,
      days_subscribed: params?.daysSubscribed,
      tests_completed: params?.testsCompleted,
    });
  },

  cancelReasonSubmit: (params: {
    reason: string;
    reasonText?: string;
    plan?: string;
  }) => {
    trackEvent({
      event: "cancel_reason_submit",
      reason: params.reason,
      cancellation_reason: params.reason,
      reason_text: params.reasonText,
      plan: params.plan,
    });
  },

  npsResponse: (params: {
    score: number;
    surveyTrigger?: string;
    comment?: string;
  }) => {
    trackEvent({
      event: "nps_response",
      score: params.score,
      survey_trigger: params.surveyTrigger,
      comment: params.comment,
    });
  },

  exception: (params: {
    description: string;
    fatal?: boolean;
    pageLocation?: string;
    browser?: string;
  }) => {
    trackEvent({
      event: "exception",
      description: params.description.slice(0, 500),
      fatal: params.fatal ?? true,
      page_location:
        params.pageLocation ||
        (isBrowser ? window.location.href : undefined),
      browser: params.browser,
    });
  },

  webVitals: (params: {
    metricName: "LCP" | "INP" | "CLS" | string;
    value: number;
    pageLocation?: string;
    contentGroup?: string;
  }) => {
    trackEvent({
      event: "web_vitals",
      metric_name: params.metricName,
      value: params.value,
      page_location:
        params.pageLocation ||
        (isBrowser ? window.location.href : undefined),
      content_group:
        params.contentGroup ||
        contentGroupFromPath(
          isBrowser ? window.location.pathname : undefined
        ),
    });
  },

  vocabPracticeComplete: (params: {
    setId: string;
    cardsReviewed?: number;
    accuracy?: number;
  }) => {
    trackEvent({
      event: "vocab_practice_complete",
      set_id: params.setId,
      cards_reviewed: params.cardsReviewed,
      accuracy: params.accuracy,
    });
  },

  reactivationSession: (params: {
    daysDormant: number;
    triggerChannel?: string;
    daysUntilTest?: number;
  }) => {
    trackEvent({
      event: "reactivation_session",
      days_dormant: params.daysDormant,
      trigger_channel: params.triggerChannel,
      days_until_test: params.daysUntilTest,
    });
  },

  planChange: (params: {
    fromPlan: string;
    toPlan: string;
    direction: "upgrade" | "downgrade" | "lateral";
    mrrDelta?: number;
  }) => {
    trackEvent({
      event: "plan_change",
      from_plan: params.fromPlan,
      to_plan: params.toPlan,
      direction: params.direction,
      mrr_delta: params.mrrDelta,
    });
  },

  subscriptionRenew: (params: {
    plan?: string;
    termNumber?: number;
    value?: number;
    currency?: string;
  }) => {
    trackEvent({
      event: "subscription_renew",
      plan: params.plan,
      term_number: params.termNumber,
      value: params.value,
      currency: params.currency || "CAD",
    });
  },
};

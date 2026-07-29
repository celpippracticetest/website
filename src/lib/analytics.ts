// Browser analytics — GA4 via gtag (no GTM).
import { track as vercelTrack } from "@vercel/analytics";
import { getAnalyticsStyleContext } from "@/lib/analyticsStyleContext";
import { getAnalyticsPricingModelContext } from "@/lib/analyticsPricingModelContext";
import { sendGa4Event, updateGa4Consent } from "@/lib/ga4Browser";
import type { GaConsentState } from "@/lib/consent";
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

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Debug mode - logs events to console in development
const DEBUG = process.env.NODE_ENV === "development";
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
    const enrichedEvent = enrichContext
      ? {
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
  const payload: Record<string, unknown> = {
    event: "page_view",
    page_path: path,
    page_title: title || (isBrowser ? document.title : undefined),
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
 * Track CTA click
 */
export function trackCTAClick(ctaText: string, ctaLocation: string): void {
  trackEvent({
    event: "cta_click",
    cta_text: ctaText,
    cta_location: ctaLocation,
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
  },

  loginInitiated: (method?: string) => {
    trackEvent({
      event: "login_initiated",
      method,
    });
  },

  loginCompleted: (userId: string, method?: string) => {
    trackEvent({
      event: "login_completed",
      user_id: userId,
      method,
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
 * Track exam events
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
    trackEvent({
      event: "exam_started",
      exam_id: examId,
      part_id: partId,
      section_type: sectionType,
      user_plan: userPlan,
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
    trackEvent({
      event: "exam_completed",
      exam_id: examId,
      total_score: totalScore,
      time_spent: timeSpent,
    });
  },

  resultsViewed: (examId: string, score?: number) => {
    trackEvent({
      event: "exam_results_viewed",
      exam_id: examId,
      score,
    });
  },

  abandoned: (
    examId: string,
    partId?: string,
    completionPercentage?: number
  ) => {
    trackEvent({
      event: "exam_abandoned",
      exam_id: examId,
      part_id: partId,
      completion_percentage: completionPercentage,
    });
  },
};

/**
 * Track practice events
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
    difficultyLevel?: string
  ) => {
    trackEvent({
      event: "practice_started",
      practice_id: practiceId,
      skill_type: skillType,
      difficulty_level: difficultyLevel,
    });
  },

  completed: (
    practiceId: string,
    skillType: string,
    score?: number,
    timeSpent?: number
  ) => {
    trackEvent({
      event: "practice_completed",
      practice_id: practiceId,
      skill_type: skillType,
      score,
      time_spent: timeSpent,
    });
  },

  resultsViewed: (practiceId: string, skillType: string, score?: number) => {
    trackEvent({
      event: "practice_results_viewed",
      practice_id: practiceId,
      skill_type: skillType,
      score,
    });
  },

  aiFeedbackViewed: (
    context: "practice" | "exam",
    practiceId?: string,
    examId?: string
  ) => {
    trackEvent({
      event: "ai_feedback_viewed",
      practice_id: practiceId,
      exam_id: examId,
      context,
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
    _userData?: UserData
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
  },

  purchase: (
    transactionId: string,
    items: any[],
    currency: string,
    value: number,
    coupon?: string,
    _userData?: UserData,
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
    extra?: { survey_reason?: string; flow_id?: string | null }
  ) => {
    trackEvent({
      event: "subscription_cancelled",
      cancellation_reason: reason,
      plan_type: planType,
      subscription_id: subscriptionId,
      survey_reason: extra?.survey_reason,
      flow_id: extra?.flow_id ?? undefined,
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

  audioPlayed: (audioType: string, audioSource?: string) => {
    trackEvent({
      event: "audio_played",
      audio_type: audioType,
      audio_source: audioSource,
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
    trackingCode?: string
  ) => {
    trackEvent({
      event: "refund_request_submitted",
      refund_request_reason: requestReason,
      refund_tracking_code: trackingCode,
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

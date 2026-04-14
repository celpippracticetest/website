// Google Tag Manager utility functions
import {
  GOOGLE_ADS_CONVERSION_ID,
  GOOGLE_ADS_SIGNUP_LABEL,
  GOOGLE_ADS_SUBSCRIBE_LABEL,
} from "@/lib/google-ads-constants";
import type { GTMEvent, UserContext, UserData } from "@/types/analytics";

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

/**
 * Initialize or get the dataLayer array
 */
function getDataLayer(): any[] {
  if (!isBrowser) return [];

  if (!window.dataLayer) {
    window.dataLayer = [];
  }

  return window.dataLayer;
}

/**
 * Get current user context from Clerk
 */
function getUserContext(): UserContext {
  if (!isBrowser) return {};

  try {
    // Get user data from Clerk's global object if available
    const clerk = (window as any).Clerk;
    const user = clerk?.user;
    
    if (user) {
      return {
        user_id: user.id,
        user_plan: (user.publicMetadata as any)?.plan || "free",
        user_plan_type: (user.publicMetadata as any)?.planType,
        user_total_spend: (user.publicMetadata as any)?.totalSpend || 0,
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
 * Push a dedicated event for ads platforms (Google Ads Enhanced Conversions, Meta Pixel).
 * This event intentionally contains user_data (PII) and must NOT be sent to GA4.
 * In GTM, configure only Google Ads / Meta tags to listen to "ads_enhanced_conversion".
 */
function pushAdsEnhancedConversion(params: {
  conversionEvent: string;
  conversionLabel?: string;
  value?: number;
  currency?: string;
  transactionId?: string;
  userData: UserData;
  purchaseType?: "first_purchase" | "subscription_renewal";
}): void {
  const { conversionEvent, conversionLabel, value, currency, transactionId, userData, purchaseType } = params;
  pushToDataLayer(
    {
      event: "ads_enhanced_conversion",
      conversion_event: conversionEvent,
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel || ""),
      value,
      currency,
      transaction_id: transactionId,
      purchase_type: purchaseType,
      user_data: normalizeUserData(userData),
    },
    false
  );
}

function markDeduplicatedOnce(key: string): boolean {
  if (!key) return false;
  if (conversionDedupSet.has(key)) return true;

  if (isBrowser) {
    const storageKey = `gtm_once_${key}`;
    if (localStorage.getItem(storageKey) === "1") {
      conversionDedupSet.add(key);
      return true;
    }
    localStorage.setItem(storageKey, "1");
  }

  conversionDedupSet.add(key);
  return false;
}

/**
 * Push an event to the GTM dataLayer
 * @param event - The GTM event object
 * @param enrichContext - Whether to enrich with user context (default: true)
 */
export function pushToDataLayer(
  event: GTMEvent,
  enrichContext: boolean = true
): void {
  if (!isBrowser) {
    return;
  }

  try {
    const dataLayer = getDataLayer();

    // Enrich event with user context if requested
    const enrichedEvent = enrichContext
      ? { ...event, ...getUserContext(), timestamp: new Date().toISOString() }
      : event;

    // Push to dataLayer
    dataLayer.push(enrichedEvent);
  } catch (error) {
    console.error("[GTM] Error pushing event to dataLayer:", error);
  }
}

/**
 * Update consent state
 */
export function updateConsent(consentState: {
  ad_storage?: "granted" | "denied";
  analytics_storage?: "granted" | "denied";
  ad_user_data?: "granted" | "denied";
  ad_personalization?: "granted" | "denied";
}): void {
  pushToDataLayer({
    event: "consent_update",
    ...consentState,
  });
}

/**
 * Track page view
 */
export function trackPageView(
  path: string,
  title?: string,
  userId?: string,
  userPlan?: string
): void {
  const payload: Record<string, unknown> = {
    event: "page_view",
    page_path: path,
    page_title: title || (isBrowser ? document.title : undefined),
    user_id: userId,
    user_plan: userPlan,
  };
  if (path === "/blog") {
    payload.page_type = "blog_list";
  } else if (path.startsWith("/blog/") && path !== "/blog") {
    payload.page_type = "blog_article";
    payload.blog_slug = path.replace(/^\/blog\//, "").split("?")[0];
  }
  pushToDataLayer(payload as GTMEvent, true);
}

/**
 * Track blog list view (GTM blog-specific event)
 */
export function trackBlogListView(path: string, title?: string): void {
  pushToDataLayer({
    event: "blog_list_viewed",
    page_path: path,
    page_title: title || (isBrowser ? document.title : undefined),
  });
}

/**
 * Track blog article view (GTM blog-specific event)
 */
export function trackBlogArticleView(
  articleTitle: string,
  articleSlug: string,
  options?: { pagePath?: string; pageTitle?: string; categories?: string[] }
): void {
  pushToDataLayer({
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
  pushToDataLayer({
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
  pushToDataLayer({
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
    pushToDataLayer({
      event: "sign_up_initiated",
      method,
      source,
    });
  },

  signUpCompleted: (userId: string, method?: string, userData?: UserData) => {
    const dedupeKey = `sign_up_completed_${userId}`;
    if (markDeduplicatedOnce(dedupeKey)) return;

    const conversionLabel = GOOGLE_ADS_SIGNUP_LABEL;

    pushToDataLayer({
      event: "sign_up_completed",
      user_id: userId,
      method,
      conversion_name: "sign_up_completed",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
      value: 1,
      currency: "CAD",
    });
    trackRedditEvent("SignUp");

    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "sign_up_completed",
        conversionLabel,
        value: 1,
        currency: "CAD",
        userData,
      });
    }
  },

  loginInitiated: (method?: string) => {
    pushToDataLayer({
      event: "login_initiated",
      method,
    });
  },

  loginCompleted: (userId: string, method?: string) => {
    pushToDataLayer({
      event: "login_completed",
      user_id: userId,
      method,
    });
  },

  logout: (userId?: string) => {
    pushToDataLayer({
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
    pushToDataLayer({
      event: "modal_viewed",
      modal_name: modalName,
      trigger_source: triggerSource,
    });
  },

  closed: (modalName: string, userAction?: "dismissed" | "completed") => {
    pushToDataLayer({
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
    pushToDataLayer({
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
    pushToDataLayer({
      event: "exam_started",
      exam_id: examId,
      part_id: partId,
      section_type: sectionType,
      user_plan: userPlan,
    });
  },

  partStarted: (examId: string, partId: string, sectionType: string) => {
    pushToDataLayer({
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
    pushToDataLayer({
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
    pushToDataLayer({
      event: "exam_part_completed",
      exam_id: examId,
      part_id: partId,
      section_type: sectionType,
      time_spent: timeSpent,
      score,
    });
  },

  completed: (examId: string, totalScore?: number, timeSpent?: number) => {
    pushToDataLayer({
      event: "exam_completed",
      exam_id: examId,
      total_score: totalScore,
      time_spent: timeSpent,
    });
  },

  resultsViewed: (examId: string, score?: number) => {
    pushToDataLayer({
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
    pushToDataLayer({
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
    pushToDataLayer({
      event: "practice_overview_viewed",
      skill_type: skillType,
    });
  },

  started: (
    practiceId: string,
    skillType: string,
    difficultyLevel?: string
  ) => {
    pushToDataLayer({
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
    pushToDataLayer({
      event: "practice_completed",
      practice_id: practiceId,
      skill_type: skillType,
      score,
      time_spent: timeSpent,
    });
  },

  resultsViewed: (practiceId: string, skillType: string, score?: number) => {
    pushToDataLayer({
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
    pushToDataLayer({
      event: "ai_feedback_viewed",
      practice_id: practiceId,
      exam_id: examId,
      context,
    });
  },
};

/**
 * Clear the ecommerce object before pushing a new ecommerce event.
 * Required by GA4 best practice to prevent data from previous events bleeding in.
 */
function clearEcommerce(): void {
  if (!isBrowser) return;
  getDataLayer().push({ ecommerce: null });
}

/**
 * Track e-commerce events (GA4 standard)
 */
export const trackEcommerce = {
  viewItemList: (items: any[], itemListId?: string, itemListName?: string) => {
    clearEcommerce();
    pushToDataLayer({
      event: "view_item_list",
      ecommerce: {
        item_list_id: itemListId,
        item_list_name: itemListName,
        items,
      },
    });
  },

  selectItem: (items: any[], itemListId?: string, itemListName?: string) => {
    clearEcommerce();
    pushToDataLayer({
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
    const conversionLabel = GOOGLE_ADS_BEGIN_CHECKOUT_LABEL;
    clearEcommerce();
    pushToDataLayer({
      event: "begin_checkout",
      // Top-level value/currency so GTM vars like {{value}} (eventModel.value) match Ads/Meta tags.
      value,
      currency,
      ecommerce: {
        currency,
        value,
        items,
        ...(coupon && { coupon }),
      },
      conversion_name: "begin_checkout",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
    });

    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "begin_checkout",
        conversionLabel,
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

    const conversionLabel = GOOGLE_ADS_PURCHASE_LABEL;
    clearEcommerce();
    pushToDataLayer({
      event: "purchase",
      purchase_type: purchaseType,
      // Top-level fields for GTM {{value}} / {{currency}} / {{transaction_id}} on Ads tags.
      value,
      currency,
      transaction_id: transactionId,
      ecommerce: {
        transaction_id: transactionId,
        currency,
        value,
        items,
        ...(coupon && { coupon }),
      },
      conversion_name: "purchase",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
      ...attributionData,
    });
    trackRedditEvent("Purchase", {
      transactionId,
      value,
      currency,
    });

    if (userData) {
      pushAdsEnhancedConversion({
        conversionEvent: "purchase",
        conversionLabel,
        value,
        currency,
        transactionId,
        userData,
        purchaseType,
      });
    }
  },

  refund: (transactionId: string, currency: string, value: number) => {
    clearEcommerce();
    pushToDataLayer({
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
    subscriptionId?: string
  ) => {
    pushToDataLayer({
      event: "subscription_cancelled",
      cancellation_reason: reason,
      plan_type: planType,
      subscription_id: subscriptionId,
    });
  },
};

/**
 * Track engagement events
 */
export const trackEngagement = {
  faqClick: (question: string, category?: string) => {
    pushToDataLayer({
      event: "faq_click",
      faq_question: question,
      faq_category: category,
    });
  },

  videoStarted: (title?: string, url?: string) => {
    pushToDataLayer({
      event: "video_started",
      video_title: title,
      video_url: url,
    });
  },

  videoCompleted: (title?: string, url?: string) => {
    pushToDataLayer({
      event: "video_completed",
      video_title: title,
      video_url: url,
    });
  },

  chatbotMessageSent: (messageType?: string) => {
    pushToDataLayer({
      event: "chatbot_message_sent",
      message_type: messageType,
    });
  },

  wordViewed: (wordId?: string, wordText?: string) => {
    pushToDataLayer({
      event: "word_viewed",
      word_id: wordId,
      word_text: wordText,
    });
  },

  wordMastered: (wordId?: string, wordText?: string) => {
    pushToDataLayer({
      event: "word_mastered",
      word_id: wordId,
      word_text: wordText,
    });
  },

  audioPlayed: (audioType: string, audioSource?: string) => {
    pushToDataLayer({
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
    pushToDataLayer({
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
    pushToDataLayer({
      event: "refund_request_submitted",
      refund_request_reason: requestReason,
      refund_tracking_code: trackingCode,
    });
  },

  refundRequestTrackingSearched: (trackingCode: string) => {
    pushToDataLayer({
      event: "refund_request_tracking_searched",
      refund_tracking_code: trackingCode,
    });
  },

  refundRequestStatusViewed: (
    status: string,
    rejectionReason?: string
  ) => {
    pushToDataLayer({
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
    pushToDataLayer({
      event: "referral_page_viewed",
      user_id: userId,
    });
  },

  codeCopied: (referralCode: string) => {
    pushToDataLayer({
      event: "referral_code_copied",
      referral_code: referralCode,
    });
  },

  inviteSent: (inviteMethod: string) => {
    pushToDataLayer({
      event: "referral_invite_sent",
      invite_method: inviteMethod,
    });
  },

  withdrawalRequested: (amount: number, currency: string) => {
    pushToDataLayer({
      event: "withdrawal_requested",
      amount,
      currency,
    });
  },
};

// Declare dataLayer on window
declare global {
  interface Window {
    dataLayer: any[];
  }
}

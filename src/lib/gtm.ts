// Google Tag Manager utility functions
import type { GTMEvent, UserContext, UserData } from "@/types/analytics";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Debug mode - logs events to console in development
const DEBUG = process.env.NODE_ENV === "development";
const GOOGLE_ADS_CONVERSION_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID || "";
const GOOGLE_ADS_PURCHASE_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL || "";
const GOOGLE_ADS_SIGNUP_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_SIGNUP_LABEL || "";
const GOOGLE_ADS_BEGIN_CHECKOUT_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_BEGIN_CHECKOUT_LABEL || "";
const conversionDedupSet = new Set<string>();

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
    if (DEBUG) {
      console.log("[GTM] Server-side render detected, skipping event:", event);
    }
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

    // Debug logging
    if (DEBUG) {
      console.log("[GTM] Event pushed:", enrichedEvent);
    }
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
      user_data: normalizeUserData(userData),
      conversion_name: "sign_up_completed",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
      value: 1,
      currency: "CAD",
    });
  },

  loginInitiated: (method?: string) => {
    pushToDataLayer({
      event: "login_initiated",
      method,
    });
  },

  loginCompleted: (userId: string, method?: string, userData?: UserData) => {
    pushToDataLayer({
      event: "login_completed",
      user_id: userId,
      method,
      user_data: userData,
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
 * Track e-commerce events (GA4 standard)
 */
export const trackEcommerce = {
  viewItemList: (items: any[], itemListId?: string, itemListName?: string) => {
    pushToDataLayer({
      event: "view_item_list",
      item_list_id: itemListId,
      item_list_name: itemListName,
      items,
    });
  },

  selectItem: (items: any[], itemListId?: string, itemListName?: string) => {
    pushToDataLayer({
      event: "select_item",
      item_list_id: itemListId,
      item_list_name: itemListName,
      items,
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
    pushToDataLayer({
      event: "begin_checkout",
      currency,
      value,
      items,
      coupon,
      user_data: normalizeUserData(userData),
      conversion_name: "begin_checkout",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
    });
  },

  purchase: (
    transactionId: string,
    items: any[],
    currency: string,
    value: number,
    coupon?: string,
    userData?: UserData
  ) => {
    const dedupeKey = `purchase_${transactionId}`;
    if (markDeduplicatedOnce(dedupeKey)) return;

    const conversionLabel = GOOGLE_ADS_PURCHASE_LABEL;
    pushToDataLayer({
      event: "purchase",
      transaction_id: transactionId,
      currency,
      value,
      items,
      coupon,
      user_data: normalizeUserData(userData),
      conversion_name: "purchase",
      conversion_label: conversionLabel || undefined,
      google_ads_send_to: getGoogleAdsSendTo(conversionLabel),
    });
  },

  refund: (transactionId: string, currency: string, value: number) => {
    pushToDataLayer({
      event: "refund",
      transaction_id: transactionId,
      currency,
      value,
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

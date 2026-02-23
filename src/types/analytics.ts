// TypeScript interfaces for analytics and GTM events

export interface GTMEvent {
  event: string;
  [key: string]: any;
}

// Page View Events
export interface PageViewEvent extends GTMEvent {
  event: "page_view";
  page_path: string;
  page_title: string;
  user_id?: string;
  user_plan?: "free" | "premium";
  user_authenticated?: boolean;
}

// Authentication Events
export interface SignUpInitiatedEvent extends GTMEvent {
  event: "sign_up_initiated";
  method?: string;
  source?: string;
}

export interface SignUpCompletedEvent extends GTMEvent {
  event: "sign_up_completed";
  method?: string;
  user_id: string;
}

export interface LoginInitiatedEvent extends GTMEvent {
  event: "login_initiated";
  method?: string;
}

export interface LoginCompletedEvent extends GTMEvent {
  event: "login_completed";
  method?: string;
  user_id: string;
}

export interface LogoutEvent extends GTMEvent {
  event: "logout";
  user_id?: string;
}

// CTA Events
export interface CTAClickEvent extends GTMEvent {
  event: "cta_click";
  cta_text: string;
  cta_location: string;
  user_authenticated?: boolean;
}

// Navigation Events
export interface NavigationClickEvent extends GTMEvent {
  event: "nav_click";
  link_text: string;
  link_url: string;
  nav_type: "header" | "footer" | "mobile" | "bottom";
}

// Modal Events
export interface ModalViewedEvent extends GTMEvent {
  event: "modal_viewed";
  modal_name: string;
  trigger_source?: string;
}

export interface ModalClosedEvent extends GTMEvent {
  event: "modal_closed";
  modal_name: string;
  user_action?: "dismissed" | "completed";
}

// Exam Events
export interface ExamOverviewViewedEvent extends GTMEvent {
  event: "exam_overview_viewed";
  user_plan?: string;
}

export interface ExamStartedEvent extends GTMEvent {
  event: "exam_started";
  exam_id: string;
  part_id?: string;
  section_type?: "Listening" | "Reading" | "Writing" | "Speaking";
  user_plan?: string;
}

export interface ExamPartStartedEvent extends GTMEvent {
  event: "exam_part_started";
  exam_id: string;
  part_id: string;
  section_type: "Listening" | "Reading" | "Writing" | "Speaking";
}

export interface ExamQuestionAnsweredEvent extends GTMEvent {
  event: "exam_question_answered";
  exam_id: string;
  part_id: string;
  question_number: number;
  section_type: string;
}

export interface ExamPartCompletedEvent extends GTMEvent {
  event: "exam_part_completed";
  exam_id: string;
  part_id: string;
  section_type: string;
  time_spent?: number;
  score?: number;
}

export interface ExamCompletedEvent extends GTMEvent {
  event: "exam_completed";
  exam_id: string;
  total_score?: number;
  time_spent?: number;
}

export interface ExamResultsViewedEvent extends GTMEvent {
  event: "exam_results_viewed";
  exam_id: string;
  score?: number;
}

export interface ExamAbandonedEvent extends GTMEvent {
  event: "exam_abandoned";
  exam_id: string;
  part_id?: string;
  completion_percentage?: number;
}

// Practice Events
export interface PracticeOverviewViewedEvent extends GTMEvent {
  event: "practice_overview_viewed";
  skill_type?: string;
}

export interface PracticeStartedEvent extends GTMEvent {
  event: "practice_started";
  practice_id: string;
  skill_type: "Listening" | "Reading" | "Writing" | "Speaking";
  difficulty_level?: string;
}

export interface PracticeCompletedEvent extends GTMEvent {
  event: "practice_completed";
  practice_id: string;
  skill_type: string;
  score?: number;
  time_spent?: number;
}

export interface PracticeResultsViewedEvent extends GTMEvent {
  event: "practice_results_viewed";
  practice_id: string;
  skill_type: string;
  score?: number;
}

export interface AIFeedbackViewedEvent extends GTMEvent {
  event: "ai_feedback_viewed";
  practice_id?: string;
  exam_id?: string;
  context: "practice" | "exam";
}

// E-commerce Events (GA4 Standard)
export interface EcommerceItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity?: number;
  item_brand?: string;
  item_category?: string;
}

export interface ViewItemListEvent extends GTMEvent {
  event: "view_item_list";
  item_list_id?: string;
  item_list_name?: string;
  items: EcommerceItem[];
}

export interface SelectItemEvent extends GTMEvent {
  event: "select_item";
  item_list_id?: string;
  item_list_name?: string;
  items: EcommerceItem[];
}

export interface BeginCheckoutEvent extends GTMEvent {
  event: "begin_checkout";
  currency: string;
  value: number;
  items: EcommerceItem[];
  coupon?: string;
}

export interface PurchaseEvent extends GTMEvent {
  event: "purchase";
  transaction_id: string;
  currency: string;
  value: number;
  items: EcommerceItem[];
  coupon?: string;
}

export interface RefundEvent extends GTMEvent {
  event: "refund";
  transaction_id: string;
  currency: string;
  value: number;
}

// Engagement Events
export interface FAQClickEvent extends GTMEvent {
  event: "faq_click";
  faq_question: string;
  faq_category?: string;
}

export interface VideoStartedEvent extends GTMEvent {
  event: "video_started";
  video_title?: string;
  video_url?: string;
}

export interface VideoCompletedEvent extends GTMEvent {
  event: "video_completed";
  video_title?: string;
  video_url?: string;
}

export interface ChatbotMessageSentEvent extends GTMEvent {
  event: "chatbot_message_sent";
  message_type?: string;
}

export interface WordViewedEvent extends GTMEvent {
  event: "word_viewed";
  word_id?: string;
  word_text?: string;
}

export interface WordMasteredEvent extends GTMEvent {
  event: "word_mastered";
  word_id?: string;
  word_text?: string;
}

export interface AudioPlayedEvent extends GTMEvent {
  event: "audio_played";
  audio_type: string;
  audio_source?: string;
}

// Referral Events
export interface ReferralPageViewedEvent extends GTMEvent {
  event: "referral_page_viewed";
  user_id?: string;
}

export interface ReferralCodeCopiedEvent extends GTMEvent {
  event: "referral_code_copied";
  referral_code: string;
}

export interface ReferralInviteSentEvent extends GTMEvent {
  event: "referral_invite_sent";
  invite_method: string;
}

export interface WithdrawalRequestedEvent extends GTMEvent {
  event: "withdrawal_requested";
  amount: number;
  currency: string;
}

// Blog Events
export interface BlogListViewedEvent extends GTMEvent {
  event: "blog_list_viewed";
  page_path: string;
  page_title?: string;
}

export interface BlogArticleViewedEvent extends GTMEvent {
  event: "blog_article_viewed";
  article_title: string;
  article_slug: string;
  page_path: string;
  page_title?: string;
  article_categories?: string[];
}

// User Context
export interface UserContext {
  userId?: string;
  user_id?: string;
  userPlan?: string;
  user_plan?: string;
  isAuthenticated?: boolean;
  is_authenticated?: boolean;
}

export interface LeadCaptureSubmittedEvent extends GTMEvent {
  event: "lead_capture_submitted";
  location: string;
  trigger_source: string;
  lead_capture_id: string;
}

/** Optional user payload for GTM (e.g. sign_up_completed, login_completed, purchase) */
export interface UserData {
  [key: string]: unknown;
}

// Marketing Metrics
export interface SubscriptionMetrics {
  newSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  byPlan: { free: number; premium: number; pro: number };
  newPremiumInPeriod: number;
  newProInPeriod: number;
  churnRate: number;
  conversionRate: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  currency: string;
  paymentCount: number;
  byPlan: { premium: number; pro: number };
  averageTransaction: number;
  refunds: number;
  disputes: number;
  mrr: number;
}

export interface OnboardingMetrics {
  completionRate: number;
  totalUsers: number;
  completedUsers: number;
}

export interface EngagementMetrics {
  practiceAttempts: number;
  practiceCompletions: number;
  practiceCompletionRate: number;
  examAttempts: number;
  examCompletions: number;
  examCompletionRate: number;
}

export interface ReferralMetrics {
  totalInvitations: number;
  completedInvitations: number;
  conversionRate: number;
  totalRevenueFromReferrals: number;
  averageRevenuePerReferral: number;
}

export interface RetentionMetrics {
  dau: number;
  mau: number;
  activeUsersCount: number;
  newUsersCount: number;
  returningUsersCount: number;
  retentionRate: number;
}

export interface MetricsResponse {
  success: boolean;
  range: string;
  data: {
    subscriptions: SubscriptionMetrics;
    revenue: RevenueMetrics;
    onboarding: OnboardingMetrics;
    engagement: EngagementMetrics;
    referrals: ReferralMetrics;
    retention: RetentionMetrics;
  };
  timestamp: string;
}

import type { PageSeoItem } from "@/lib/seo/types";

/**
 * Canonical SEO registry for static app routes.
 * Dynamic routes (blog posts, wiki articles, profession pages, practice slugs)
 * use `generateMetadata` in their page files.
 */
export const PAGE_SEO_REGISTRY: Record<string, PageSeoItem> = {
  // ── Marketing & public ──────────────────────────────────────────────
  "/": {
    path: "/",
    title: "CELPIP Practice Test Online | Instant Scoring, Expert Tips",
    description:
      "CELPIP practice tests with AI scoring: Listening, Reading, Writing, and Speaking. Timed tasks, instant feedback, and CLB-focused prep for test day.",
    keywords: [
      "celpip practice test",
      "celpip online practice",
      "celpip mock test",
      "celpip preparation",
      "celpip listening reading writing speaking",
    ],
  },
  "/pricing": {
    path: "/pricing",
    title: "CELPIP Practice Test Pricing | Plans & Free Samples",
    description:
      "Compare CELPIP practice test plans: free skill samples, full mock exams, and AI feedback. Pick a plan that matches your timeline and target CLB score.",
    keywords: ["celpip pricing", "celpip subscription", "celpip practice plans"],
  },
  "/blog": {
    path: "/blog",
    title: "CELPIP Blog | Tips, Strategies & Exam Updates",
    description:
      "CELPIP preparation articles: task strategies, CLB score tips, immigration context, and study plans from the CELPIP Practice Test team.",
    keywords: ["celpip blog", "celpip tips", "celpip strategies"],
  },
  "/contact-us": {
    path: "/contact-us",
    title: "Contact Us | CELPIP Practice Test",
    description:
      "Contact CELPIP Practice Test support for account, billing, and practice help. Reach our team by email and get assistance quickly.",
    keywords: ["celpip support", "celpip contact", "celpip help"],
  },
  "/about": {
    path: "/about",
    title: "About CELPIPguide | CELPIP Practice Test Platform",
    description:
      "Learn about CELPIPguide.ca — independent CELPIP prep with mock exams, AI feedback, and study tools for PR, citizenship, and licensing goals.",
    keywords: ["about celpipguide", "celpip prep platform", "celpip practice test"],
  },
  "/privacy-policy": {
    path: "/privacy-policy",
    title: "Privacy Policy | CELPIP Practice Test",
    description:
      "Read how CELPIP Practice Test collects, uses, and protects your personal information when you use our website and practice platform.",
  },
  "/terms-of-service": {
    path: "/terms-of-service",
    title: "Terms of Service | CELPIP Practice Test",
    description:
      "Terms governing use of CELPIP Practice Test, including subscriptions, acceptable use, and service limitations.",
  },
  "/refund-policy": {
    path: "/refund-policy",
    title: "Refund Policy | CELPIP Practice Test",
    description:
      "Refund eligibility, time limits, and usage caps for CELPIP Practice Test subscription purchases.",
  },
  "/delete-account": {
    path: "/delete-account",
    title: "Delete Account | CELPIP Practice Test",
    description:
      "Instructions for requesting deletion of your CELPIP Practice Test account and associated personal data.",
    indexability: "noindex",
  },
  "/account-sharing-notice": {
    path: "/account-sharing-notice",
    title: "Account Sharing Notice | CELPIP Practice Test",
    description:
      "Policy on account sharing, concurrent sessions, and fair use of CELPIP Practice Test subscriptions.",
  },
  "/wiki": {
    path: "/wiki",
    title: "CELPIP Wiki | Guides, Glossary & Exam Help",
    description:
      "Browse CELPIP wiki articles: exam format, scoring, task types, and study resources in one searchable knowledge base.",
    keywords: ["celpip wiki", "celpip guide", "celpip glossary"],
  },
  "/score-calculator": {
    path: "/score-calculator",
    title: "CELPIP Score Calculator | CRS Estimate & CLB Levels",
    description:
      "Enter CELPIP Listening, Reading, Writing, and Speaking scores to see CLB-style levels and an educational CRS estimate for Express Entry.",
    keywords: ["celpip score calculator", "celpip crs calculator", "celpip clb"],
  },
  "/landing/express-entry": {
    path: "/landing/express-entry",
    title: "CELPIP for Express Entry | CLB Prep & CRS Boost",
    description:
      "Prepare for Express Entry with CELPIP-focused practice. Improve language points with timed tasks, mock exams, and AI scoring.",
    keywords: ["celpip express entry", "celpip crs", "celpip immigration"],
  },
  "/partners": {
    path: "/partners",
    title: "Become a Partner | CELPIP Practice Test",
    description:
      "Help your clients succeed with CELPIP Practice Test and earn commission on first subscription purchases.",
    keywords: ["celpip partner program", "celpip affiliate", "immigration consultant celpip"],
  },
  "/referral": {
    path: "/referral",
    title: "Refer a Friend | CELPIP Practice Test",
    description: "Share CELPIP Practice Test with friends and earn rewards when they subscribe.",
    indexability: "noindex",
  },
  "/final-offer": {
    path: "/final-offer",
    title: "Special Offer | CELPIP Practice Test",
    description: "Limited-time CELPIP Practice Test offer for returning visitors.",
    indexability: "noindex",
  },

  // ── Practice & exams (indexable hubs) ───────────────────────────────
  "/practice": {
    path: "/practice",
    title: "CELPIP Practice Test Online — Sample Tasks by Skill",
    description:
      "Free CELPIP practice test hub: timed sample tasks for Listening, Reading, Writing, and Speaking. Pick skills to drill and build stamina before your exam.",
    keywords: ["celpip practice overview", "celpip free practice", "celpip sample tasks"],
  },
  "/exam": {
    path: "/exam",
    title: "CELPIP Mock Test Online — Full-Length Practice Exams",
    description:
      "Take a realistic CELPIP mock test online in one sitting—listening, reading, writing, and speaking in official-style timing.",
    keywords: ["celpip mock test", "celpip full exam", "celpip practice exam"],
  },
  "/exams": {
    path: "/exams",
    title: "CELPIP Exam Practice Hub | CELPIP Practice Test",
    description:
      "Explore CELPIP exam preparation resources, skill practice, and full mock exam pathways to improve your score with structured study.",
  },
  "/practice/listening": {
    path: "/practice/listening",
    title: "CELPIP Listening Practice Test Online | Timed Tasks & Tips",
    description:
      "Practice CELPIP Listening with realistic audio tasks, timed parts, and instant feedback. Drill each listening task type before test day.",
    keywords: ["celpip listening practice", "celpip listening test online"],
  },
  "/practice/reading": {
    path: "/practice/reading",
    title: "CELPIP Reading Practice Test Online | Timed Passages & Tips",
    description:
      "CELPIP Reading practice with timed passages, multiple-choice and dropdown tasks, and score-focused strategies for every part.",
    keywords: ["celpip reading practice", "celpip reading test online"],
  },
  "/practice/writing": {
    path: "/practice/writing",
    title: "CELPIP Writing Practice Test Online | Email & Survey Tasks",
    description:
      "CELPIP Writing practice for Task 1 (email) and Task 2 (survey response). Timed prompts with AI feedback on structure and language.",
    keywords: ["celpip writing practice", "celpip writing test online"],
  },
  "/practice/speaking": {
    path: "/practice/speaking",
    title: "CELPIP Speaking Practice Test Online | Record & Get Feedback",
    description:
      "CELPIP Speaking practice with recording, timed prompts for all eight tasks, and AI feedback on fluency, vocabulary, and coherence.",
    keywords: ["celpip speaking practice", "celpip speaking test online"],
  },
  "/words": {
    path: "/words",
    title: "CELPIP Vocabulary Tracker | Learn & Master Exam Words",
    description:
      "Build and track your CELPIP vocabulary with flashcard study mode. Add words, mark them mastered, and expand your exam-ready word list.",
    keywords: ["celpip vocabulary", "celpip word list", "celpip flashcards"],
  },
  "/flow": {
    path: "/flow",
    title: "Personalized CELPIP Microlearning Flow | CELPIP Practice Test",
    description:
      "Follow a personalized CELPIP microlearning flow based on your goal, target score, focus skill, and test date.",
    keywords: ["celpip study plan", "celpip microlearning"],
  },
  "/teacher": {
    path: "/teacher",
    title: "CELPIP AI Learning Assistant | Real-time Practice Feedback",
    description:
      "Ask CELPIP-style questions and get real-time answers. Practice strategies, improve task structure, and get targeted guidance.",
    indexability: "noindex",
  },

  // ── Auth & account (noindex) ────────────────────────────────────────
  "/auth": {
    path: "/auth",
    title: "Sign In | CELPIP Practice Test",
    description:
      "Pick up where you left off with mock exams, AI feedback, and your practice history.",
    indexability: "noindex",
  },
  "/sign-in": {
    path: "/sign-in",
    title: "Sign In | CELPIP Practice Test",
    description:
      "Pick up where you left off with mock exams, AI feedback, and your practice history.",
    indexability: "noindex",
  },
  "/sign-up": {
    path: "/sign-up",
    title: "Sign Up Free | CELPIP Practice Test",
    description:
      "Register to practice all four CELPIP skills. Choose a premium plan anytime after you sign up.",
    indexability: "noindex",
  },
  "/sign-in/forgot-supabase": {
    path: "/sign-in/forgot-supabase",
    title: "Reset Password | CELPIP Practice Test",
    description: "Reset your CELPIP Practice Test account password.",
    indexability: "noindex",
  },
  "/sign-in/legacy": {
    path: "/sign-in/legacy",
    title: "Sign In (Legacy) | CELPIP Practice Test",
    description: "Legacy sign-in page for CELPIP Practice Test accounts.",
    indexability: "noindex",
  },
  "/sign-up/legacy": {
    path: "/sign-up/legacy",
    title: "Sign Up (Legacy) | CELPIP Practice Test",
    description: "Legacy registration page for CELPIP Practice Test.",
    indexability: "noindex",
  },
  "/profile": {
    path: "/profile",
    title: "My Profile | CELPIP Practice Test",
    description: "Manage your CELPIP Practice Test account, subscription, and billing details.",
    indexability: "noindex",
  },
  "/earn100": {
    path: "/earn100",
    title: "Earn $100 Referral Program | CELPIP Practice Test",
    description: "Refer friends to CELPIP Practice Test and earn rewards when they subscribe.",
    indexability: "noindex",
  },
  "/refund-request": {
    path: "/refund-request",
    title: "Request a Refund | CELPIP Practice Test",
    description: "Submit a refund request for your CELPIP Practice Test subscription purchase.",
    indexability: "noindex",
  },
  "/onboarding": {
    path: "/onboarding",
    title: "Welcome | CELPIP Practice Test",
    description: "Complete onboarding to personalize your CELPIP practice experience.",
    indexability: "noindex",
  },
  "/onboarding-survey": {
    path: "/onboarding-survey",
    title: "Welcome — Tell Us Your Goals | CELPIP Practice Test",
    description: "Share your CELPIP goals so we can tailor your practice path.",
    indexability: "noindex",
  },
  "/success": {
    path: "/success",
    title: "Payment Successful | CELPIP Practice Test",
    description: "Your CELPIP Practice Test payment was successful. Start practicing now.",
    indexability: "noindex",
  },
  "/failed": {
    path: "/failed",
    title: "Checkout Incomplete | CELPIP Practice Test",
    description:
      "Your checkout was not completed. Return to pricing to finish your CELPIP Practice Test subscription.",
    indexability: "noindex",
  },
  "/success/paypal": {
    path: "/success/paypal",
    title: "Payment Successful | CELPIP Practice Test",
    description: "Your payment was successful.",
    indexability: "noindex",
  },
  "/sso-callback": {
    path: "/sso-callback",
    title: "Signing In… | CELPIP Practice Test",
    description: "Completing sign-in to CELPIP Practice Test.",
    indexability: "noindex",
  },
  "/auth/app-session": {
    path: "/auth/app-session",
    title: "App Sign-In | CELPIP Practice Test",
    description: "Complete sign-in from the CELPIP Practice Test mobile app.",
    indexability: "noindex",
  },
  "/auth/email-confirm": {
    path: "/auth/email-confirm",
    title: "Confirm Email | CELPIP Practice Test",
    description: "Confirm your email address for CELPIP Practice Test.",
    indexability: "noindex",
  },
  "/auth/update-password": {
    path: "/auth/update-password",
    title: "Update Password | CELPIP Practice Test",
    description: "Set a new password for your CELPIP Practice Test account.",
    indexability: "noindex",
  },
  "/welcome/set-password": {
    path: "/welcome/set-password",
    title: "Set Password | CELPIP Practice Test",
    description: "Create a password for your new CELPIP Practice Test account.",
    indexability: "noindex",
  },
  "/partners/auth": {
    path: "/partners/auth",
    title: "Partner Sign In | CELPIP Practice Test",
    description: "Sign in to the CELPIP Practice Test partner portal.",
    indexability: "noindex",
  },
  "/partners/dashboard": {
    path: "/partners/dashboard",
    title: "Partner Dashboard | CELPIP Practice Test",
    description: "View referrals, commissions, and performance in the partner dashboard.",
    indexability: "noindex",
  },

  // ── Deep practice / exam sessions (noindex) ─────────────────────────
  "/exams/session": {
    path: "/exams/session",
    title: "CELPIP Mock Exam | CELPIP Practice Test",
    description: "In-progress CELPIP mock exam session.",
    indexability: "noindex",
  },

  // ── CMS admin (noindex) ───────────────────────────────────────────
  "/cms/settings": {
    path: "/cms/settings",
    title: "CMS Settings",
    description: "Admin CMS settings for CELPIP Practice Test.",
    indexability: "noindex",
  },
  "/cms/dashboard": {
    path: "/cms/dashboard",
    title: "CMS Dashboard",
    description: "Admin dashboard for CELPIP Practice Test content and operations.",
    indexability: "noindex",
  },
  "/cms/dashboard/abandoned-cart-emails": {
    path: "/cms/dashboard/abandoned-cart-emails",
    title: "Abandoned Cart Emails",
    description: "Manage abandoned checkout email sequences.",
    indexability: "noindex",
  },
  "/cms/dashboard/blog": {
    path: "/cms/dashboard/blog",
    title: "Blog Posts",
    description: "Create and edit CELPIP blog posts.",
    indexability: "noindex",
  },
  "/cms/dashboard/blog/keywords": {
    path: "/cms/dashboard/blog/keywords",
    title: "Blog Keywords",
    description: "Manage blog keyword research and targets.",
    indexability: "noindex",
  },
  "/cms/dashboard/cancellation-surveys": {
    path: "/cms/dashboard/cancellation-surveys",
    title: "Cancellation Surveys",
    description: "Review subscription cancellation survey responses.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam": {
    path: "/cms/dashboard/exam",
    title: "Mock Exams",
    description: "Manage CELPIP mock exam content.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam/create": {
    path: "/cms/dashboard/exam/create",
    title: "Create Mock Exam",
    description: "Create a new CELPIP mock exam.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam/listening": {
    path: "/cms/dashboard/exam/listening",
    title: "Exam — Listening",
    description: "Manage listening content for mock exams.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam/reading": {
    path: "/cms/dashboard/exam/reading",
    title: "Exam — Reading",
    description: "Manage reading content for mock exams.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam/speaking": {
    path: "/cms/dashboard/exam/speaking",
    title: "Exam — Speaking",
    description: "Manage speaking content for mock exams.",
    indexability: "noindex",
  },
  "/cms/dashboard/exam/writing": {
    path: "/cms/dashboard/exam/writing",
    title: "Exam — Writing",
    description: "Manage writing content for mock exams.",
    indexability: "noindex",
  },
  "/cms/dashboard/homepage-hero": {
    path: "/cms/dashboard/homepage-hero",
    title: "Homepage Hero",
    description: "Edit homepage hero banner content.",
    indexability: "noindex",
  },
  "/cms/dashboard/lead-capture": {
    path: "/cms/dashboard/lead-capture",
    title: "Lead Capture",
    description: "View and manage marketing lead captures.",
    indexability: "noindex",
  },
  "/cms/dashboard/nurture-emails": {
    path: "/cms/dashboard/nurture-emails",
    title: "Nurture Emails",
    description: "Manage user nurture email campaigns.",
    indexability: "noindex",
  },
  "/cms/dashboard/onboarding": {
    path: "/cms/dashboard/onboarding",
    title: "Onboarding Admin",
    description: "Manage onboarding survey configuration.",
    indexability: "noindex",
  },
  "/cms/dashboard/partners": {
    path: "/cms/dashboard/partners",
    title: "Partners Admin",
    description: "Manage partner accounts and commissions.",
    indexability: "noindex",
  },
  "/cms/dashboard/plans": {
    path: "/cms/dashboard/plans",
    title: "Subscription Plans",
    description: "Manage Stripe and PayPal subscription plans.",
    indexability: "noindex",
  },
  "/cms/dashboard/practice": {
    path: "/cms/dashboard/practice",
    title: "Practice Content",
    description: "Manage CELPIP practice tasks and variants.",
    indexability: "noindex",
  },
  "/cms/dashboard/practice/listening": {
    path: "/cms/dashboard/practice/listening",
    title: "Practice — Listening",
    description: "Manage listening practice content.",
    indexability: "noindex",
  },
  "/cms/dashboard/practice/reading": {
    path: "/cms/dashboard/practice/reading",
    title: "Practice — Reading",
    description: "Manage reading practice content.",
    indexability: "noindex",
  },
  "/cms/dashboard/practice/speaking": {
    path: "/cms/dashboard/practice/speaking",
    title: "Practice — Speaking",
    description: "Manage speaking practice content.",
    indexability: "noindex",
  },
  "/cms/dashboard/practice/writing": {
    path: "/cms/dashboard/practice/writing",
    title: "Practice — Writing",
    description: "Manage writing practice content.",
    indexability: "noindex",
  },
  "/cms/dashboard/profession-pages": {
    path: "/cms/dashboard/profession-pages",
    title: "Profession Pages",
    description: "Manage SEO profession landing pages.",
    indexability: "noindex",
  },
  "/cms/dashboard/profession-pages/create": {
    path: "/cms/dashboard/profession-pages/create",
    title: "Create Profession Page",
    description: "Create a new profession SEO landing page.",
    indexability: "noindex",
  },
  "/cms/dashboard/refund-requests": {
    path: "/cms/dashboard/refund-requests",
    title: "Refund Requests",
    description: "Review customer refund requests.",
    indexability: "noindex",
  },
  "/cms/dashboard/reminder-emails": {
    path: "/cms/dashboard/reminder-emails",
    title: "Reminder Emails",
    description: "Manage exam and study reminder emails.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports": {
    path: "/cms/dashboard/reports",
    title: "Reports",
    description: "Analytics and business reports for CELPIP Practice Test.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/analytics": {
    path: "/cms/dashboard/reports/analytics",
    title: "Analytics Reports",
    description: "GA4 and product analytics reports.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/google-ads": {
    path: "/cms/dashboard/reports/google-ads",
    title: "Google Ads Reports",
    description: "Google Ads performance reports.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/home-ab": {
    path: "/cms/dashboard/reports/home-ab",
    title: "Homepage A/B Reports",
    description: "Homepage experiment results.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/quick": {
    path: "/cms/dashboard/reports/quick",
    title: "Quick Reports",
    description: "At-a-glance business metrics.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/search-console": {
    path: "/cms/dashboard/reports/search-console",
    title: "Search Console Reports",
    description: "Google Search Console performance data.",
    indexability: "noindex",
  },
  "/cms/dashboard/reports/stripe": {
    path: "/cms/dashboard/reports/stripe",
    title: "Stripe Reports",
    description: "Stripe revenue and subscription reports.",
    indexability: "noindex",
  },
  "/cms/dashboard/seo/internal-links": {
    path: "/cms/dashboard/seo/internal-links",
    title: "SEO Internal Links",
    description: "Manage internal link rules for SEO.",
    indexability: "noindex",
  },
  "/cms/dashboard/tasks": {
    path: "/cms/dashboard/tasks",
    title: "CELPIP Tasks",
    description: "Manage CELPIP task definitions (Speaking Task 1, etc.).",
    indexability: "noindex",
  },
  "/cms/dashboard/tasks/create": {
    path: "/cms/dashboard/tasks/create",
    title: "Create Task",
    description: "Create a new CELPIP task definition.",
    indexability: "noindex",
  },
  "/cms/dashboard/user-emails": {
    path: "/cms/dashboard/user-emails",
    title: "User Emails",
    description: "Manage transactional and lifecycle user emails.",
    indexability: "noindex",
  },
  "/cms/dashboard/users": {
    path: "/cms/dashboard/users",
    title: "Users",
    description: "Browse and manage CELPIP Practice Test user accounts.",
    indexability: "noindex",
  },
  "/cms/dashboard/wiki": {
    path: "/cms/dashboard/wiki",
    title: "Wiki Articles",
    description: "Create and edit CELPIP wiki articles.",
    indexability: "noindex",
  },
  "/cms/dashboard/wiki/create": {
    path: "/cms/dashboard/wiki/create",
    title: "Create Wiki Article",
    description: "Create a new CELPIP wiki article.",
    indexability: "noindex",
  },
  "/cms/dashboard/withdrawal-requests": {
    path: "/cms/dashboard/withdrawal-requests",
    title: "Withdrawal Requests",
    description: "Review partner and referral withdrawal requests.",
    indexability: "noindex",
  },
};

/** Normalize a pathname or registry key to a registry lookup key. */
export function normalizePageSeoPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, "") || "/";
}

export function getPageSeoItem(path: string): PageSeoItem | undefined {
  return PAGE_SEO_REGISTRY[normalizePageSeoPath(path)];
}

export function listPageSeoItems(): PageSeoItem[] {
  return Object.values(PAGE_SEO_REGISTRY);
}

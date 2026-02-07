"use client";

import { useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  trackCTAClick,
  trackNavClick,
  trackAuth,
  trackModal,
  trackExam,
  trackPractice,
  trackEcommerce,
  trackEngagement,
  trackReferral,
} from "@/lib/gtm";

/**
 * Generic event tracker hook
 * Provides easy access to all GTM tracking functions with user context
 */
export function useEventTracker() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  const getUserPlan = useCallback(() => {
    return (user?.publicMetadata?.plan as string) || "free";
  }, [user]);

  return {
    // CTA tracking
    trackCTA: useCallback((ctaText: string, ctaLocation: string) => {
      trackCTAClick(ctaText, ctaLocation);
    }, []),

    // Navigation tracking
    trackNav: useCallback(
      (
        linkText: string,
        linkUrl: string,
        navType: "header" | "footer" | "mobile" | "bottom"
      ) => {
        trackNavClick(linkText, linkUrl, navType);
      },
      []
    ),

    // Auth tracking
    auth: {
      signUpInitiated: useCallback((method?: string, source?: string) => {
        trackAuth.signUpInitiated(method, source);
      }, []),

      signUpCompleted: useCallback(
        (method?: string) => {
          if (userId) {
            trackAuth.signUpCompleted(userId, method);
          }
        },
        [userId]
      ),

      loginInitiated: useCallback((method?: string) => {
        trackAuth.loginInitiated(method);
      }, []),

      loginCompleted: useCallback(
        (method?: string) => {
          if (userId) {
            trackAuth.loginCompleted(userId, method);
          }
        },
        [userId]
      ),

      logout: useCallback(() => {
        trackAuth.logout(userId || undefined);
      }, [userId]),
    },

    // User context
    isSignedIn,
    userId,
    userPlan: getUserPlan(),
  };
}

/**
 * Exam tracking hook
 * Specialized hook for exam-related events
 */
export function useExamTracking() {
  const { user } = useUser();

  const getUserPlan = useCallback(() => {
    return (user?.publicMetadata?.plan as string) || "free";
  }, [user]);

  return {
    overviewViewed: useCallback(() => {
      trackExam.overviewViewed(getUserPlan());
    }, [getUserPlan]),

    started: useCallback(
      (examId: string, partId?: string, sectionType?: string) => {
        trackExam.started(examId, partId, sectionType, getUserPlan());
      },
      [getUserPlan]
    ),

    partStarted: useCallback(
      (examId: string, partId: string, sectionType: string) => {
        trackExam.partStarted(examId, partId, sectionType);
      },
      []
    ),

    questionAnswered: useCallback(
      (
        examId: string,
        partId: string,
        questionNumber: number,
        sectionType: string
      ) => {
        trackExam.questionAnswered(examId, partId, questionNumber, sectionType);
      },
      []
    ),

    partCompleted: useCallback(
      (
        examId: string,
        partId: string,
        sectionType: string,
        timeSpent?: number,
        score?: number
      ) => {
        trackExam.partCompleted(examId, partId, sectionType, timeSpent, score);
      },
      []
    ),

    completed: useCallback(
      (examId: string, totalScore?: number, timeSpent?: number) => {
        trackExam.completed(examId, totalScore, timeSpent);
      },
      []
    ),

    resultsViewed: useCallback((examId: string, score?: number) => {
      trackExam.resultsViewed(examId, score);
    }, []),

    abandoned: useCallback(
      (examId: string, partId?: string, completionPercentage?: number) => {
        trackExam.abandoned(examId, partId, completionPercentage);
      },
      []
    ),
  };
}

/**
 * Practice tracking hook
 * Specialized hook for practice-related events
 */
export function usePracticeTracking() {
  return {
    overviewViewed: useCallback((skillType?: string) => {
      trackPractice.overviewViewed(skillType);
    }, []),

    started: useCallback(
      (practiceId: string, skillType: string, difficultyLevel?: string) => {
        trackPractice.started(practiceId, skillType, difficultyLevel);
      },
      []
    ),

    completed: useCallback(
      (
        practiceId: string,
        skillType: string,
        score?: number,
        timeSpent?: number
      ) => {
        trackPractice.completed(practiceId, skillType, score, timeSpent);
      },
      []
    ),

    resultsViewed: useCallback(
      (practiceId: string, skillType: string, score?: number) => {
        trackPractice.resultsViewed(practiceId, skillType, score);
      },
      []
    ),

    aiFeedbackViewed: useCallback(
      (context: "practice" | "exam", practiceId?: string, examId?: string) => {
        trackPractice.aiFeedbackViewed(context, practiceId, examId);
      },
      []
    ),
  };
}

/**
 * E-commerce tracking hook
 * Specialized hook for purchase funnel events
 */
export function useEcommerceTracking() {
  return {
    viewItemList: useCallback(
      (items: any[], itemListId?: string, itemListName?: string) => {
        trackEcommerce.viewItemList(items, itemListId, itemListName);
      },
      []
    ),

    selectItem: useCallback(
      (items: any[], itemListId?: string, itemListName?: string) => {
        trackEcommerce.selectItem(items, itemListId, itemListName);
      },
      []
    ),

    beginCheckout: useCallback(
      (items: any[], currency: string, value: number, coupon?: string) => {
        trackEcommerce.beginCheckout(items, currency, value, coupon);
      },
      []
    ),

    purchase: useCallback(
      (
        transactionId: string,
        items: any[],
        currency: string,
        value: number,
        coupon?: string
      ) => {
        trackEcommerce.purchase(transactionId, items, currency, value, coupon);
      },
      []
    ),

    refund: useCallback(
      (transactionId: string, currency: string, value: number) => {
        trackEcommerce.refund(transactionId, currency, value);
      },
      []
    ),
  };
}

/**
 * Modal tracking hook
 * Specialized hook for modal events
 */
export function useModalTracking() {
  return {
    viewed: useCallback((modalName: string, triggerSource?: string) => {
      trackModal.viewed(modalName, triggerSource);
    }, []),

    closed: useCallback(
      (modalName: string, userAction?: "dismissed" | "completed") => {
        trackModal.closed(modalName, userAction);
      },
      []
    ),
  };
}

/**
 * Engagement tracking hook
 * Specialized hook for engagement events
 */
export function useEngagementTracking() {
  return {
    faqClick: useCallback((question: string, category?: string) => {
      trackEngagement.faqClick(question, category);
    }, []),

    videoStarted: useCallback((title?: string, url?: string) => {
      trackEngagement.videoStarted(title, url);
    }, []),

    videoCompleted: useCallback((title?: string, url?: string) => {
      trackEngagement.videoCompleted(title, url);
    }, []),

    chatbotMessageSent: useCallback((messageType?: string) => {
      trackEngagement.chatbotMessageSent(messageType);
    }, []),

    wordViewed: useCallback((wordId?: string, wordText?: string) => {
      trackEngagement.wordViewed(wordId, wordText);
    }, []),

    wordMastered: useCallback((wordId?: string, wordText?: string) => {
      trackEngagement.wordMastered(wordId, wordText);
    }, []),

    audioPlayed: useCallback((audioType: string, audioSource?: string) => {
      trackEngagement.audioPlayed(audioType, audioSource);
    }, []),
  };
}

/**
 * Referral tracking hook
 * Specialized hook for referral events
 */
export function useReferralTracking() {
  const { userId } = useAuth();

  return {
    pageViewed: useCallback(() => {
      trackReferral.pageViewed(userId || undefined);
    }, [userId]),

    codeCopied: useCallback((referralCode: string) => {
      trackReferral.codeCopied(referralCode);
    }, []),

    inviteSent: useCallback((inviteMethod: string) => {
      trackReferral.inviteSent(inviteMethod);
    }, []),

    withdrawalRequested: useCallback((amount: number, currency: string) => {
      trackReferral.withdrawalRequested(amount, currency);
    }, []),
  };
}

"use client";

import * as Sentry from "@sentry/nextjs";

type FeedbackForm = {
  appendToDom: () => void;
  removeFromDom: () => void;
  open: () => void;
  close: () => void;
};

let formInstance: FeedbackForm | null = null;

export type SentryFeedbackContext = {
  name?: string | null;
  email?: string | null;
  userId?: string | null;
  pageUrl?: string;
};

const FORM_OPTIONS = {
  formTitle: "Send feedback",
  submitButtonLabel: "Send feedback",
  cancelButtonLabel: "Cancel",
  messageLabel: "Message",
  messagePlaceholder: "Tell us what happened or how we can improve…",
  showBranding: false,
  useSentryUser: {
    email: "email",
    name: "username",
  },
} as const;

function applySentryFeedbackUser(ctx: SentryFeedbackContext): void {
  const email = ctx.email?.trim();
  const name = ctx.name?.trim();
  const id = ctx.userId?.trim();

  if (email || name || id) {
    Sentry.setUser({
      ...(id ? { id } : {}),
      ...(email ? { email } : {}),
      ...(name ? { username: name } : {}),
    });
    return;
  }

  Sentry.setUser(null);
}

function disposeFeedbackForm(): void {
  if (!formInstance) return;

  try {
    formInstance.close();
    formInstance.removeFromDom();
  } catch {
    // Ignore teardown errors from stale DOM nodes.
  }

  formInstance = null;
}

/** Opens the Sentry User Feedback form (triggered from the site support FAB). */
export async function openSentryFeedback(
  ctx: SentryFeedbackContext = {},
): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const feedback = Sentry.getFeedback();
    if (!feedback) {
      console.warn(
        "[openSentryFeedback] Feedback integration not registered — check instrumentation-client.ts",
      );
      return false;
    }

    disposeFeedbackForm();
    applySentryFeedbackUser(ctx);

    const pageUrl = ctx.pageUrl?.trim() || window.location.href;

    formInstance = await feedback.createForm({
      ...FORM_OPTIONS,
      tags: {
        page_url: pageUrl,
      },
    });
    formInstance.appendToDom();
    formInstance.open();
    return true;
  } catch (err) {
    formInstance = null;
    console.warn("[openSentryFeedback] failed:", err);
    return false;
  }
}

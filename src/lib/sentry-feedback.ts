"use client";

type FeedbackDialog = {
  appendToDom: () => void;
  open: () => void;
};

let dialogPromise: Promise<FeedbackDialog | null> | null = null;

/** Opens the Sentry User Feedback form (triggered from the site support FAB). */
export async function openSentryFeedback(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!dialogPromise) {
    dialogPromise = (async () => {
      try {
        const { getFeedback } = await import("@sentry/browser");
        const feedback = getFeedback();
        if (!feedback) return null;
        const form = await feedback.createForm();
        form.appendToDom();
        return form;
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[openSentryFeedback] failed:", err);
        }
        return null;
      }
    })();
  }

  const dialog = await dialogPromise;
  dialog?.open();
}

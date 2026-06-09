export type AuthPageMode = "sign-in" | "sign-up";

export const AUTH_PAGE_COPY: Record<
  AuthPageMode,
  { title: string; description: string; documentTitle: string }
> = {
  "sign-in": {
    title: "Sign in to your account",
    description:
      "Pick up where you left off with mock exams, AI feedback, and your practice history.",
    documentTitle: "Sign In | CELPIP Practice Test",
  },
  "sign-up": {
    title: "Create your free account",
    description:
      "Register to practice all four CELPIP skills. Choose a premium plan anytime after you sign up.",
    documentTitle: "Sign Up Free | CELPIP Practice Test",
  },
};

export function getAuthPageMetadata(mode: AuthPageMode) {
  const copy = AUTH_PAGE_COPY[mode];
  return {
    title: copy.documentTitle,
    description: copy.description,
    openGraph: {
      title: copy.documentTitle,
      description: copy.description,
    },
    twitter: {
      title: copy.documentTitle,
      description: copy.description,
    },
  };
}

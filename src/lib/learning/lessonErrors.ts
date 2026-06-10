import { ZodError } from "zod";

export function formatLessonLoadError(error?: string): string {
  if (!error?.trim()) {
    return "Could not load lesson.";
  }

  if (
    error.includes("invalid_type") ||
    error.includes("Expected object") ||
    error.includes("ZodError")
  ) {
    return "This lesson could not be loaded. Please refresh the page to try again.";
  }

  if (error.startsWith("[") || error.length > 200) {
    return "Could not load lesson. Please refresh or try again later.";
  }

  return error;
}

export function formatAssignLessonError(err: unknown): string {
  if (err instanceof ZodError) {
    return formatLessonLoadError(err.message);
  }
  if (err instanceof Error) {
    return formatLessonLoadError(err.message);
  }
  return "Could not generate today's lesson. Please try again.";
}

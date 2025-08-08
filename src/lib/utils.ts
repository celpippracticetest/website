import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate how many full days have passed since the given date.
 * @param date - An ISO date string or Date object.
 * @returns Number of days since the provided date.
 */
export function daysSince(date: string | number | Date): number {
  let thenTime: number;
  if (typeof date === "number") {
    thenTime = date;
  } else if (typeof date === "string" && /^\d+$/.test(date)) {
    thenTime = parseInt(date, 10);
  } else {
    thenTime = new Date(date).getTime();
  }
  const now = Date.now();
  const diffMs = now - thenTime;
  // Count any positive difference as at least one full day
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

/** Calendar date YYYY-MM-DD in the given IANA timezone. */
export function getTodayInTimezone(timezone: string, dayOffset = 0): string {
  try {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return dayOffset === 0 ? today : addDaysToCalendarDate(today, dayOffset);
  } catch {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Toronto",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return dayOffset === 0 ? today : addDaysToCalendarDate(today, dayOffset);
  }
}

/** Shift a YYYY-MM-DD calendar date by `days` (can be negative). */
export function addDaysToCalendarDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

/**
 * Hidden testing helper: ?d=1 simulates tomorrow, ?d=2 the day after, etc.
 * Not linked in the UI — append manually to /learning when testing.
 */
export function parseLearningDayOffset(raw: string | null | undefined): number {
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 30) return 0;
  return parsed;
}

/** Whether `isoOrDate` falls on today in `timezone`. */
export function isTodayInTimezone(
  isoOrDate: Date | string,
  timezone: string,
  dayOffset = 0
): boolean {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return false;

  const dateInTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  return dateInTz === getTodayInTimezone(timezone, dayOffset);
}

/** Whether `isoOrDate` is strictly before today in `timezone`. */
export function isBeforeTodayInTimezone(
  isoOrDate: Date | string,
  timezone: string,
  dayOffset = 0
): boolean {
  const today = getTodayInTimezone(timezone, dayOffset);
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return false;

  const dateInTz = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

  return dateInTz < today;
}

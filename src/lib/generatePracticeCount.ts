/**
 * Generates a dynamic count for practice statistics based on Vancouver timezone
 * Task 1 has highest count, Task 2 has lower, Task 3 even lower, etc.
 * This reflects that people must complete earlier tasks before later ones
 * All tasks follow a "Morning Low -> Night High" pattern
 * All counts are guaranteed to be >= 1.0k
 * 
 * @param taskId - The task ID (can be any string)
 * @param practiceId - The practice ID (can be any string)
 * @param taskNumber - Task number string (e.g., "Task #1", "1") to ensure proper ordering
 * @returns A formatted count string (e.g., "1.2k", "1.5k", "5.0k")
 */

export function generatePracticeCount(
  taskId: string,
  practiceId: string,
  taskNumber?: string
): string {
  const vancouverTime = getVancouverTime();
  const hours = vancouverTime.getHours();
  const minutes = vancouverTime.getMinutes();

  // Extract numeric task number (e.g., "Task #1" -> 1, "1" -> 1)
  let taskNum = 99; // Default to high number (lowest count) if not provided
  if (taskNumber) {
    const numMatch = taskNumber.match(/\d+/);
    if (numMatch) {
      taskNum = parseInt(numMatch[0], 10);
    }
  }

  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);

  // Define Morning (06:00) and Night (24:00) ranges for each task
  // Format: [min, max]
  // Guaranteed: MorningMin(Task N) > MorningMax(Task N+1) to ensure no overlap even at same time
  // Guaranteed: NightMin(Task N) > NightMax(Task N+1)

  const morningRanges = [
    [1250, 1500], // Task 1: 1.25k - 1.5k (Matches user req: ~1.2k/1.4k)
    [1100, 1200], // Task 2: 1.1k - 1.2k (Strictly < Task 1)
    [1060, 1090], // Task 3: 1.06k - 1.09k
    [1030, 1050], // Task 4: 1.03k - 1.05k
    [1010, 1025], // Task 5: 1.01k - 1.025k
    [1000, 1005], // Task 6+: Flat 1k baseline
  ];

  const nightRanges = [
    [5000, 6000], // Task 1: Peaks high
    [4000, 4800], // Task 2
    [3000, 3800], // Task 3
    [2200, 2800], // Task 4
    [1600, 2000], // Task 5
    [1200, 1500], // Task 6+
  ];

  const rangeIndex = Math.min(taskNum - 1, morningRanges.length - 1);
  // Use the last defined range for any task number exceeding the list
  const morningRange = taskNum > morningRanges.length
    ? [1000, 1005]
    : morningRanges[rangeIndex];

  const nightRange = taskNum > nightRanges.length
    ? [1000, 1100]
    : nightRanges[rangeIndex];

  // UNIFIED TIME PATTERN: Morning Low -> Night High
  // Starts growing from 6 AM, peaks at midnight
  const startHour = 6;
  const endHour = 24;

  let timeProgress: number;

  if (hours < startHour) {
    // 00:00 - 06:00: Stay at morning baseline
    timeProgress = 0.0;
  } else {
    // 06:00 - 24:00: Linear progress
    const totalMinutes = (hours - startHour) * 60 + minutes;
    const totalRangeMinutes = (endHour - startHour) * 60;
    timeProgress = totalMinutes / totalRangeMinutes;
  }

  // Apply easing for smooth progression
  const easedProgress = easeInOut(timeProgress);

  // Interpolate ranges based on time
  // CurrentMin = Lerp(MorningMin, NightMin, progress)
  // CurrentMax = Lerp(MorningMax, NightMax, progress)

  const currentMin = lerp(morningRange[0], nightRange[0], easedProgress);
  const currentMax = lerp(morningRange[1], nightRange[1], easedProgress);

  // Calculate count within the current interpolated range
  // Practice hash determines position within the range (0% to 100%)
  const practiceVariationPct = (practiceHash % 100) / 100;
  const rangeSize = currentMax - currentMin;

  let count = currentMin + (practiceVariationPct * rangeSize);

  // Add minute-based variation for organic feel (very small, +/- 3)
  const minuteVariation = ((minutes % 10) - 5);
  count += minuteVariation;

  // Ensure count stays within strict bounds and >= 1000
  count = Math.max(1000, Math.max(currentMin, Math.min(currentMax, count)));

  return formatCount(count);
}

function getVancouverTime(): Date {
  const now = new Date();

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const year = getPart("year");
  const month = getPart("month") - 1;
  const day = getPart("day");
  const hours = getPart("hour");
  const minutes = getPart("minute");
  const seconds = getPart("second");

  return new Date(year, month, day, hours, minutes, seconds);
}

function easeInOut(t: number): number {
  return t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp(start: number, end: number, t: number): number {
  return start * (1 - t) + end * t;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function formatCount(count: number): string {
  const cappedCount = Math.min(count, 10000); // Cap at 10k just in case
  const thousands = cappedCount / 1000;
  const rounded = Math.round(thousands * 10) / 10;

  // Ensure we always show at least 1.0k
  if (rounded < 1.0) return "1.0k";

  return `${rounded.toFixed(1)}k`;
}

export function generatePracticeCountForDate(
  taskId: string,
  practiceId: string,
  targetDate: Date,
  taskNumber?: string
): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Vancouver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(targetDate);
  const getPart = (type: string) => {
    const part = parts.find((p) => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const hoursVancouver = getPart("hour");
  const minutesVancouver = getPart("minute");

  let taskNum = 99;
  if (taskNumber) {
    const numMatch = taskNumber.match(/\d+/);
    if (numMatch) {
      taskNum = parseInt(numMatch[0], 10);
    }
  }

  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);

  const morningRanges = [
    [1250, 1500], // Task 1
    [1100, 1200], // Task 2
    [1060, 1090], // Task 3
    [1030, 1050], // Task 4
    [1010, 1025], // Task 5
    [1000, 1005], // Task 6+
  ];

  const nightRanges = [
    [5000, 6000], // Task 1
    [4000, 4800], // Task 2
    [3000, 3800], // Task 3
    [2200, 2800], // Task 4
    [1600, 2000], // Task 5
    [1200, 1500], // Task 6+
  ];

  const rangeIndex = Math.min(taskNum - 1, morningRanges.length - 1);
  const morningRange = taskNum > morningRanges.length
    ? [1000, 1005]
    : morningRanges[rangeIndex];

  const nightRange = taskNum > nightRanges.length
    ? [1000, 1100]
    : nightRanges[rangeIndex];

  const startHour = 6;
  const endHour = 24;

  let timeProgress: number;

  if (hoursVancouver < startHour) {
    timeProgress = 0.0;
  } else {
    const totalMinutes = (hoursVancouver - startHour) * 60 + minutesVancouver;
    const totalRangeMinutes = (endHour - startHour) * 60;
    timeProgress = totalMinutes / totalRangeMinutes;
  }

  const easedProgress = easeInOut(timeProgress);

  const currentMin = lerp(morningRange[0], nightRange[0], easedProgress);
  const currentMax = lerp(morningRange[1], nightRange[1], easedProgress);

  const practiceVariationPct = (practiceHash % 100) / 100;
  const rangeSize = currentMax - currentMin;

  let count = currentMin + (practiceVariationPct * rangeSize);

  const minuteVariation = ((minutesVancouver % 10) - 5);
  count += minuteVariation;

  count = Math.max(1000, Math.max(currentMin, Math.min(currentMax, count)));

  return formatCount(count);
}

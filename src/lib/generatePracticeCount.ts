/**
 * Generates a dynamic count for practice statistics based on Vancouver timezone
 * Task 1 has highest count, Task 2 has lower, Task 3 even lower, etc.
 * This reflects that people must complete earlier tasks before later ones
 * Some tasks peak at noon, some at night, some stay low throughout
 * 
 * @param taskId - The task ID (can be any string)
 * @param practiceId - The practice ID (can be any string)
 * @param taskNumber - Task number string (e.g., "Task #1", "1") to ensure proper ordering
 * @returns A formatted count string (e.g., "0.5k", "1.3k", "2.0k", "2.7k", "5.0k")
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
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const combinedSeed = (taskHash + practiceHash + taskFirstChar) % 100000;

  // Determine task behavior pattern (0-6 for different patterns)
  const patternType = combinedSeed % 7;

  // STRICT RANGES to ensure Task 1 > Task 2 > Task 3 always
  // We define non-overlapping ranges for the first 10 tasks
  // Format: [min, max]
  const ranges = [
    [4500, 5500], // Task 1
    [3500, 4400], // Task 2
    [2800, 3400], // Task 3
    [2200, 2700], // Task 4
    [1700, 2100], // Task 5
    [1300, 1600], // Task 6
    [1000, 1250], // Task 7
    [750, 950],   // Task 8
    [500, 700],   // Task 9
    [250, 450],   // Task 10
  ];

  const rangeIndex = Math.min(taskNum - 1, ranges.length - 1);
  // If taskNum is very large (fallback), use a low range
  const [rangeMin, rangeMax] = taskNum > ranges.length
    ? [50, 200]
    : ranges[rangeIndex];

  // Calculate the spread for this specific task/practice combo within its allowed range
  // We want to use the full range but keep it bounded

  let timeOfDay: number;

  // Different time patterns for different tasks
  if (patternType === 0 || patternType === 1) {
    // Pattern 0-1: Peak at noon (6am to 12pm growth)
    const morningHour = 6;
    const noonHour = 12;
    if (hours < morningHour) {
      timeOfDay = 0;
    } else if (hours >= noonHour) {
      timeOfDay = 1.0;
    } else {
      const totalMinutes = (hours - morningHour) * 60 + minutes;
      const totalRangeMinutes = (noonHour - morningHour) * 60;
      timeOfDay = totalMinutes / totalRangeMinutes;
    }
  } else if (patternType === 2 || patternType === 3) {
    // Pattern 2-3: Peak at night (6pm to 12am growth)
    const eveningHour = 18;
    const midnightHour = 24;
    const adjustedHours = hours < 6 ? hours + 24 : hours;
    if (adjustedHours < eveningHour) {
      timeOfDay = 0;
    } else if (adjustedHours >= midnightHour) {
      timeOfDay = 1.0;
    } else {
      const totalMinutes = (adjustedHours - eveningHour) * 60 + minutes;
      const totalRangeMinutes = (midnightHour - eveningHour) * 60;
      timeOfDay = totalMinutes / totalRangeMinutes;
    }
  } else if (patternType === 4) {
    // Pattern 4: Reverse pattern (high in morning, low at night)
    const morningHour = 6;
    const noonHour = 12;
    if (hours < morningHour) {
      timeOfDay = 1.0;
    } else if (hours >= noonHour) {
      timeOfDay = 0;
    } else {
      const totalMinutes = (hours - morningHour) * 60 + minutes;
      const totalRangeMinutes = (noonHour - morningHour) * 60;
      timeOfDay = 1.0 - (totalMinutes / totalRangeMinutes);
    }
  } else {
    // Pattern 5-6: Low constant or slight variation
    const hourProgress = hours / 24;
    timeOfDay = hourProgress * 0.5; // Up to 50% of range
  }

  // Apply easing for smooth progression
  const easedProgress = easeInOut(timeOfDay);

  // Calculate base count within the range based on time
  // We use a subset of the range for time variation so we have room for practice variation
  // Let's say time accounts for 70% of the variation, practice hash for 30%

  const rangeSize = rangeMax - rangeMin;
  const timeComponent = easedProgress * (rangeSize * 0.7);

  // Practice variation (static per practice)
  // Use practiceHash to determine where in the remaining 30% this practice sits
  const practiceVariationPct = (practiceHash % 100) / 100;
  const practiceComponent = practiceVariationPct * (rangeSize * 0.3);

  // Combine components
  let count = rangeMin + timeComponent + practiceComponent;

  // Add minute-based variation for organic feel (very small, +/- 5)
  const minuteVariation = ((minutes % 10) - 5);
  count += minuteVariation;

  // Ensure count stays within strict bounds
  count = Math.max(rangeMin, Math.min(rangeMax, count));

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

  return `${rounded}k`;
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
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const combinedSeed = (taskHash + practiceHash + taskFirstChar) % 100000;

  const patternType = combinedSeed % 7;

  // STRICT RANGES (Same as above)
  const ranges = [
    [4500, 5500], // Task 1
    [3500, 4400], // Task 2
    [2800, 3400], // Task 3
    [2200, 2700], // Task 4
    [1700, 2100], // Task 5
    [1300, 1600], // Task 6
    [1000, 1250], // Task 7
    [750, 950],   // Task 8
    [500, 700],   // Task 9
    [250, 450],   // Task 10
  ];

  const rangeIndex = Math.min(taskNum - 1, ranges.length - 1);
  const [rangeMin, rangeMax] = taskNum > ranges.length
    ? [50, 200]
    : ranges[rangeIndex];

  let timeOfDay: number;

  if (patternType === 0 || patternType === 1) {
    const morningHour = 6;
    const noonHour = 12;
    if (hoursVancouver < morningHour) {
      timeOfDay = 0;
    } else if (hoursVancouver >= noonHour) {
      timeOfDay = 1.0;
    } else {
      const totalMinutes = (hoursVancouver - morningHour) * 60 + minutesVancouver;
      const totalRangeMinutes = (noonHour - morningHour) * 60;
      timeOfDay = totalMinutes / totalRangeMinutes;
    }
  } else if (patternType === 2 || patternType === 3) {
    const eveningHour = 18;
    const midnightHour = 24;
    const adjustedHours = hoursVancouver < 6 ? hoursVancouver + 24 : hoursVancouver;
    if (adjustedHours < eveningHour) {
      timeOfDay = 0;
    } else if (adjustedHours >= midnightHour) {
      timeOfDay = 1.0;
    } else {
      const totalMinutes = (adjustedHours - eveningHour) * 60 + minutesVancouver;
      const totalRangeMinutes = (midnightHour - eveningHour) * 60;
      timeOfDay = totalMinutes / totalRangeMinutes;
    }
  } else if (patternType === 4) {
    const morningHour = 6;
    const noonHour = 12;
    if (hoursVancouver < morningHour) {
      timeOfDay = 1.0;
    } else if (hoursVancouver >= noonHour) {
      timeOfDay = 0;
    } else {
      const totalMinutes = (hoursVancouver - morningHour) * 60 + minutesVancouver;
      const totalRangeMinutes = (noonHour - morningHour) * 60;
      timeOfDay = 1.0 - (totalMinutes / totalRangeMinutes);
    }
  } else {
    const hourProgress = hoursVancouver / 24;
    timeOfDay = hourProgress * 0.5;
  }

  const easedProgress = easeInOut(timeOfDay);

  const rangeSize = rangeMax - rangeMin;
  const timeComponent = easedProgress * (rangeSize * 0.7);

  const practiceVariationPct = (practiceHash % 100) / 100;
  const practiceComponent = practiceVariationPct * (rangeSize * 0.3);

  let count = rangeMin + timeComponent + practiceComponent;

  const minuteVariation = ((minutesVancouver % 10) - 5);
  count += minuteVariation;

  count = Math.max(rangeMin, Math.min(rangeMax, count));

  return formatCount(count);
}


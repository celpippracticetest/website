/**
 * Generates a dynamic count for practice statistics based on Vancouver timezone
 * Count starts at 0.5k in the morning and increases to 5k by 12pm (noon)
 * Unique for each practice/task combination, consistent for same time
 * 
 * @param taskId - The task ID (can be any string)
 * @param practiceId - The practice ID (can be any string)
 * @returns A formatted count string (e.g., "0.5k", "1.2k", "2.5k", "5.0k")
 */

export function generatePracticeCount(
  taskId: string,
  practiceId: string
): string {
  const vancouverTime = getVancouverTime();
  const hours = vancouverTime.getHours();
  const minutes = vancouverTime.getMinutes();
  
  const morningHour = 6;
  const noonHour = 12;
  
  let timeOfDay: number;
  if (hours < morningHour) {
    timeOfDay = 0;
  } else if (hours >= noonHour) {
    timeOfDay = 1.0;
  } else {
    const totalMinutes = (hours - morningHour) * 60 + minutes;
    const totalRangeMinutes = (noonHour - morningHour) * 60;
    timeOfDay = totalMinutes / totalRangeMinutes;
  }
  
  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const seed = (taskHash + practiceHash + taskFirstChar) % 10000;
  
  const minCount = 500;
  const maxCount = 5000;
  const practiceVariation = (seed % 1000);
  
  // Each practice has a slightly different min/max based on seed to create uniqueness
  const practiceMin = minCount + (practiceVariation * 0.3);
  const practiceMax = maxCount - (practiceVariation * 0.1);
  
  // Uses ease-in-out curve for smooth, natural growth progression
  const easedProgress = easeInOut(timeOfDay);
  let count = practiceMin + (practiceMax - practiceMin) * easedProgress;
  
  // Add minute-based variation for organic feel while maintaining consistency within same hour
  const minuteVariation = (minutes % 10) * 2;
  count += minuteVariation;
  
  count = Math.max(minCount, Math.min(maxCount, count));
  
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
  const cappedCount = Math.min(count, 5000);
  const thousands = cappedCount / 1000;
  const rounded = Math.round(thousands * 10) / 10;
  
  return `${rounded}k`;
}

export function generatePracticeCountForDate(
  taskId: string,
  practiceId: string,
  targetDate: Date
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
  
  const morningHour = 6;
  const noonHour = 12;
  
  let timeOfDay: number;
  if (hoursVancouver < morningHour) {
    timeOfDay = 0;
  } else if (hoursVancouver >= noonHour) {
    timeOfDay = 1.0;
  } else {
    const totalMinutes = (hoursVancouver - morningHour) * 60 + minutesVancouver;
    const totalRangeMinutes = (noonHour - morningHour) * 60;
    timeOfDay = totalMinutes / totalRangeMinutes;
  }
  
  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const seed = (taskHash + practiceHash + taskFirstChar) % 10000;
  
  const minCount = 500;
  const maxCount = 5000;
  const practiceVariation = (seed % 1000);
  const practiceMin = minCount + (practiceVariation * 0.3);
  const practiceMax = maxCount - (practiceVariation * 0.1);
  
  const easedProgress = easeInOut(timeOfDay);
  let count = practiceMin + (practiceMax - practiceMin) * easedProgress;
  
  const minuteVariation = (minutesVancouver % 10) * 2;
  count += minuteVariation;
  
  count = Math.max(minCount, Math.min(maxCount, count));
  
  return formatCount(count);
}


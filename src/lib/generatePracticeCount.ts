/**
 * Generates a dynamic count for practice statistics based on Vancouver timezone
 * Different tasks have different max counts (0.5k, 1.3k, 2k, 2.7k, 5k, etc.)
 * Some tasks peak at noon, some at night, some stay low throughout
 * Unique for each practice/task combination, consistent for same time
 * 
 * @param taskId - The task ID (can be any string)
 * @param practiceId - The practice ID (can be any string)
 * @returns A formatted count string (e.g., "0.5k", "1.3k", "2.0k", "2.7k", "5.0k")
 */

export function generatePracticeCount(
  taskId: string,
  practiceId: string
): string {
  const vancouverTime = getVancouverTime();
  const hours = vancouverTime.getHours();
  const minutes = vancouverTime.getMinutes();
  
  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const combinedSeed = (taskHash + practiceHash + taskFirstChar) % 100000;
  
  // Determine task behavior pattern (0-6 for different patterns)
  const patternType = combinedSeed % 7;
  
  // Different max counts for different tasks: 0.5k, 1.3k, 2k, 2.7k, 5k, etc.
  const maxCountOptions = [500, 1300, 2000, 2700, 3500, 4500, 5000];
  const maxCountIndex = (taskHash % maxCountOptions.length);
  const maxCount = maxCountOptions[maxCountIndex];
  
  // Different min counts based on task
  const minCountOptions = [300, 400, 500, 600, 700, 800, 1000];
  const minCountIndex = (practiceHash % minCountOptions.length);
  const minCount = minCountOptions[minCountIndex];
  
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
    // Pattern 5-6: Low constant or slight variation (stays low even at night)
    // Use a very small time variation
    const hourProgress = hours / 24;
    timeOfDay = hourProgress * 0.3; // Only 30% variation max
  }
  
  // Practice variation for uniqueness within same task
  const practiceVariation = (practiceHash % 500);
  const practiceMin = minCount + (practiceVariation * 0.2);
  const practiceMax = maxCount - (practiceVariation * 0.15);
  
  // Apply easing for smooth progression
  const easedProgress = easeInOut(timeOfDay);
  let count = practiceMin + (practiceMax - practiceMin) * easedProgress;
  
  // Add minute-based variation for organic feel
  const minuteVariation = (minutes % 10) * 2;
  count += minuteVariation;
  
  // Ensure count stays within bounds
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
  
  const taskHash = hashString(taskId);
  const practiceHash = hashString(practiceId);
  const taskFirstChar = taskId.length > 0 ? taskId.charCodeAt(0) : 0;
  const combinedSeed = (taskHash + practiceHash + taskFirstChar) % 100000;
  
  const patternType = combinedSeed % 7;
  
  const maxCountOptions = [500, 1300, 2000, 2700, 3500, 4500, 5000];
  const maxCountIndex = (taskHash % maxCountOptions.length);
  const maxCount = maxCountOptions[maxCountIndex];
  
  const minCountOptions = [300, 400, 500, 600, 700, 800, 1000];
  const minCountIndex = (practiceHash % minCountOptions.length);
  const minCount = minCountOptions[minCountIndex];
  
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
    timeOfDay = hourProgress * 0.3;
  }
  
  const practiceVariation = (practiceHash % 500);
  const practiceMin = minCount + (practiceVariation * 0.2);
  const practiceMax = maxCount - (practiceVariation * 0.15);
  
  const easedProgress = easeInOut(timeOfDay);
  let count = practiceMin + (practiceMax - practiceMin) * easedProgress;
  
  const minuteVariation = (minutesVancouver % 10) * 2;
  count += minuteVariation;
  
  count = Math.max(minCount, Math.min(maxCount, count));
  
  return formatCount(count);
}


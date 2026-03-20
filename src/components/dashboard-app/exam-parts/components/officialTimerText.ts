const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

export const formatOfficialDuration = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  if (minutes === 0) {
    return pluralize(seconds, "second");
  }

  if (seconds === 0) {
    return pluralize(minutes, "minute");
  }

  return `${pluralize(minutes, "minute")} ${pluralize(seconds, "second")}`;
};

export const formatOfficialTimeRemaining = (totalSeconds: number) =>
  `Time remaining: ${formatOfficialDuration(totalSeconds)}`;

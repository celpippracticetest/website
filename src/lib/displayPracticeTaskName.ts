/** Title-case practice / mock task labels so overview and results match. */
export function displayPracticeTaskName(name: string | null | undefined): string {
  if (!name) return "";
  const stripped = name.replace(/^(listening|reading|writing|speaking)\s+to\s+/i, "").trim();
  return stripped.replace(/\w\S*/g, (word) => {
    if (word.toLowerCase() === "and") return "and";
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

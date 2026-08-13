/** Infer GA4 `content_group` from a pathname (KPI: wiki | blog | score-guide | product | pricing). */
export function contentGroupFromPath(pathLike?: string | null): string {
  const path = (pathLike || "").split("?")[0].toLowerCase();
  if (!path || path === "/") return "product";
  if (path.startsWith("/blog")) return "blog";
  if (path.startsWith("/pricing") || path.startsWith("/plans") || path.includes("#plans")) {
    return "pricing";
  }
  if (
    path.startsWith("/score") ||
    path.includes("score-guide") ||
    path.includes("scoring")
  ) {
    return "score-guide";
  }
  if (
    path.startsWith("/guide") ||
    path.startsWith("/wiki") ||
    path.startsWith("/celpip-") ||
    path.startsWith("/listening") ||
    path.startsWith("/reading") ||
    path.startsWith("/writing") ||
    path.startsWith("/speaking")
  ) {
    return "wiki";
  }
  return "product";
}

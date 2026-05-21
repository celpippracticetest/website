/** Full navigation after sign-in so Supabase cookies and RSC stay in sync (avoids blank client transitions). */
export function navigateAfterWebAuth(dest: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(dest);
}

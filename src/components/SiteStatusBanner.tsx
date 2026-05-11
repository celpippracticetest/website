/**
 * Temporary site-wide notice (remove or gate with env when no longer needed).
 */
export default function SiteStatusBanner() {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="sticky top-0 z-[100] border-b border-amber-300/80 bg-amber-100 px-4 py-2.5 text-center text-sm text-amber-950 shadow-sm"
    >
      <p className="mx-auto max-w-3xl font-medium leading-snug">
        The site is experiencing an issue. We expect it to be fixed within about 1 hour. Thank you for your patience.
      </p>
    </div>
  );
}

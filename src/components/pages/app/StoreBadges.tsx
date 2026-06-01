import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Official “Download on the App Store” badge (preferred black) — do not recolor or rearrange. */
const APP_STORE_BADGE = {
  src: "/icons/store/download-on-the-app-store.svg",
  alt: "Download on the App Store",
} as const;

/** Official “Get it on Google Play” badge — do not recolor or rearrange (Google Play brand guidelines). */
const GOOGLE_PLAY_BADGE = {
  src: "/icons/store/en_badge_web_generic.png",
  alt: "Get it on Google Play",
} as const;

const STORE_BADGE_IMAGE_CLASS = "block h-fit w-[160px]";
const GOOGLE_PLAY_BADGE_IMAGE_CLASS = "flex h-fit w-[200px]";

function StoreBadgeImage({
  src,
  alt,
  disabled,
  className,
}: {
  src: string;
  alt: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn(className ?? STORE_BADGE_IMAGE_CLASS, disabled && "opacity-60")}
    />
  );
}

function StoreBadgeLink({
  href,
  ariaLabel,
  disabled,
  children,
}: {
  href?: string;
  ariaLabel: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  const wrapperClass = cn(
    "inline-flex shrink-0 items-center",
    !disabled &&
      "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary1 focus-visible:ring-offset-2",
  );

  if (disabled) {
    return (
      <div className={wrapperClass} aria-disabled="true">
        {children}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className={wrapperClass}
    >
      {children}
    </a>
  );
}

function AppStoreBadge({ href }: { href?: string }) {
  const disabled = !href?.trim();

  return (
    <StoreBadgeLink href={href} ariaLabel={APP_STORE_BADGE.alt} disabled={disabled}>
      <StoreBadgeImage
        src={APP_STORE_BADGE.src}
        alt={APP_STORE_BADGE.alt}
        disabled={disabled}
      />
    </StoreBadgeLink>
  );
}

function GooglePlayStoreBadge({ href }: { href?: string }) {
  const disabled = !href?.trim();

  return (
    <StoreBadgeLink href={href} ariaLabel={GOOGLE_PLAY_BADGE.alt} disabled={disabled}>
      <StoreBadgeImage
        src={GOOGLE_PLAY_BADGE.src}
        alt={GOOGLE_PLAY_BADGE.alt}
        disabled={disabled}
        className={GOOGLE_PLAY_BADGE_IMAGE_CLASS}
      />
    </StoreBadgeLink>
  );
}

type StoreBadgesRowProps = {
  iosAppUrl?: string;
  androidAppUrl?: string;
  className?: string;
};

export function StoreBadgesRow({ iosAppUrl, androidAppUrl, className }: StoreBadgesRowProps) {
  const showIos = Boolean(iosAppUrl?.trim());

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 screen744:flex-row screen744:items-center screen744:gap-5",
        className,
      )}
    >
      {showIos ? <AppStoreBadge href={iosAppUrl} /> : null}
      <GooglePlayStoreBadge href={androidAppUrl} />
    </div>
  );
}

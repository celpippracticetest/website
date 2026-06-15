import TrackedLink from "@/components/analytics/TrackedLink";
import Image from "next/image";
import SvgLinkedIn from "@/components/icons/LinkedIn";
import SvgYouTube from "@/components/icons/YouTube";
import SvgInstagram from "@/components/icons/Instagram";
import { StoreBadgesRow } from "@/components/pages/app/StoreBadges";
import { ANDROID_APP_STORE_URL } from "@/lib/mobile/storeUrls";
import FooterVisibilityObserver from "./FooterVisibilityObserver";
import { cn } from "@/lib/utils";

export type FooterLink = {
  href: string;
  label: string;
  isMoreLink?: boolean;
};

export type FooterSection = {
  title: string;
  links: FooterLink[];
};

type FooterBaseProps = {
  sections: FooterSection[];
  professionSections?: FooterSection[];
};

const PROFESSION_LINK_PREFIX = /^CELPIP for /i;

const linkClassName =
  "text-sm text-text2 transition-colors hover:text-primary1";

const compactLinkClassName =
  "text-[13px] leading-snug text-text2 transition-colors hover:text-primary1";

const socialClassName =
  "inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline/80 bg-white text-text2 transition-colors hover:border-primary1/40 hover:bg-primary6 hover:text-primary1";

function formatProfessionLabel(label: string) {
  return label.replace(PROFESSION_LINK_PREFIX, "");
}

function FooterNavSection({
  section,
  variant = "default",
}: {
  section: FooterSection;
  variant?: "default" | "compact";
}) {
  const isCompact = variant === "compact";

  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text1">
        {section.title}
      </h3>
      <ul className={isCompact ? "space-y-1.5" : "space-y-2"}>
        {section.links.map((link) => (
          <li key={link.href}>
            <TrackedLink
              href={link.href}
              navType="footer"
              className={cn(
                isCompact ? compactLinkClassName : linkClassName,
                link.isMoreLink && "font-semibold text-primary1 hover:text-maple-dark",
              )}
              title={isCompact && !link.isMoreLink ? link.label : undefined}
            >
              {isCompact && !link.isMoreLink
                ? formatProfessionLabel(link.label)
                : link.label}
            </TrackedLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const FooterBase = ({
  sections,
  professionSections = [],
}: FooterBaseProps) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      aria-label="Site footer"
      className="relative z-[1] bg-[linear-gradient(180deg,#F2F6FF_0%,#E3EBFF_55%,#F4F7FF_100%)] text-text2"
    >
      <FooterVisibilityObserver />
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-transparent via-outline/90 to-transparent"
      />
      <div className="mx-auto max-w-[1200px] px-4 py-12 screen744:px-8 screen744:py-16">
        <div className="flex flex-col gap-6 screen1280:flex-row screen1280:items-start screen1280:justify-between">
          <div className="max-w-md">
            <TrackedLink href="/" navType="footer" className="inline-flex">
              <Image
                alt="CELPIP Practice Test"
                width={160}
                height={48}
                src="/images/logo.png"
                className="h-10 w-auto object-contain object-left"
              />
            </TrackedLink>
            <p className="mt-4 text-sm leading-relaxed text-text3">
              CELPIPPRACTICETEST.com is an independent platform and is not
              affiliated with, endorsed by, or associated with Paragon Testing
              Enterprises or the official CELPIP test.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <TrackedLink
                href="https://www.linkedin.com/company/celpippracticetest"
                target="_blank"
                rel="noopener noreferrer"
                className={socialClassName}
                aria-label="Visit our LinkedIn page"
                navType="footer"
              >
                <SvgLinkedIn className="h-4 w-4" />
              </TrackedLink>
              <TrackedLink
                href="https://www.youtube.com/@celpippracticetestcom"
                target="_blank"
                rel="noopener noreferrer"
                className={socialClassName}
                aria-label="Visit our YouTube channel"
                navType="footer"
              >
                <SvgYouTube className="h-4 w-4" />
              </TrackedLink>
              <TrackedLink
                href="https://www.instagram.com/celpippracticetest/"
                target="_blank"
                rel="noopener noreferrer"
                className={socialClassName}
                aria-label="Visit our Instagram page"
                navType="footer"
              >
                <SvgInstagram className="h-4 w-4" />
              </TrackedLink>
            </div>
          </div>

          <StoreBadgesRow
            androidAppUrl={ANDROID_APP_STORE_URL}
            className="screen1280:shrink-0"
          />
        </div>

        <div
          aria-hidden
          className="my-10 h-px w-full bg-outline/60 screen744:my-12"
        />

        <nav aria-label="Footer navigation">
          <div
            className={cn(
              "grid grid-cols-2 gap-x-6 gap-y-8",
              "screen744:grid-cols-2 screen744:gap-x-8",
              "screen1024:grid-cols-4",
            )}
          >
            {sections.map((section) => (
              <FooterNavSection key={section.title} section={section} />
            ))}
          </div>
        </nav>

        {professionSections.length > 0 ? (
          <>
            <div
              aria-hidden
              className="mt-10 h-px w-full bg-outline/60 screen744:mt-12"
            />
            <nav
              aria-label="CELPIP by profession"
              className="mt-10 screen744:mt-12"
            >
              <h2 className="mb-6 text-xs font-semibold uppercase tracking-wider text-text1">
                CELPIP by profession
              </h2>
              <div className="grid grid-cols-1 gap-8 screen744:grid-cols-2 screen1280:grid-cols-4">
                {professionSections.map((section) => (
                  <FooterNavSection
                    key={section.title}
                    section={section}
                    variant="compact"
                  />
                ))}
              </div>
            </nav>
          </>
        ) : null}

        <div
          aria-hidden
          className="mt-10 h-px w-full bg-outline/60 screen744:mt-12"
        />

        <div className="pt-8">
          <div className="flex flex-col items-center justify-between gap-3 text-center screen744:flex-row screen744:text-left">
            <p className="text-xs text-text3">
              © {currentYear} CELPIPPRACTICETEST.com. All rights reserved.
            </p>
            <p className="text-xs text-text3">
              Made with{" "}
              <span className="text-secondary2" aria-hidden>
                ♥
              </span>{" "}
              in Canada
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

const userSections: FooterSection[] = [
  {
    title: "Practice",
    links: [
      { href: "/listening", label: "Listening" },
      { href: "/speaking", label: "Speaking" },
      { href: "/writing", label: "Writing" },
      { href: "/reading", label: "Reading" },
    ],
  },
  {
    title: "Exams",
    links: [
      { href: "/exam-overview", label: "Mock Exams" },
      { href: "/learning", label: "AI Learning" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/", label: "About" },
      { href: "/contact-us", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy" },
      { href: "/terms-of-service", label: "Terms" },
      { href: "/refund-policy", label: "Refund" },
    ],
  },
];

export const GUEST_FOOTER_SECTIONS: FooterSection[] = [
  {
    title: "Study Tools",
    links: [
      {
        href: "/score-calculator",
        label: "CELPIP Score Calculator",
      },
      {
        href: "/exam-overview",
        label: "Mock Exams",
      },
      {
        href: "/practice-overview",
        label: "Practice Overview",
      },
      {
        href: "/learning",
        label: "AI Learning",
      },
      {
        href: "/wiki",
        label: "CELPIP Wiki",
      },
      {
        href: "/free-celpip-practice-test",
        label: "Free Practice Test",
      },
    ],
  },
  {
    title: "Practice",
    links: [
      { href: "/listening", label: "Listening" },
      { href: "/speaking", label: "Speaking" },
      { href: "/writing", label: "Writing" },
      { href: "/reading", label: "Reading" },
      { href: "/words", label: "Vocabulary Builder" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/", label: "About" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
      { href: "/contact-us", label: "Contact Us" },
      { href: "/editorial-policy", label: "Editorial Policy" },
      { href: "/delete-account", label: "Delete Account" },
      { href: "/app", label: "App" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms-of-service", label: "Terms of Service" },
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/refund-policy", label: "Refund Policy" },
    ],
  },
];

export const UserFooter = () => {
  return <FooterBase sections={userSections} />;
};

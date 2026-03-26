import TrackedLink from "@/components/analytics/TrackedLink";
import Image from "next/image";
import SvgLinkedIn from "@/components/icons/LinkedIn";
import SvgYouTube from "@/components/icons/YouTube";
import { Box } from "@/components/ui/Box";
import { getPublishedProfessionPageSummaries } from "@/lib/profession-pages/public";
import FooterVisibilityObserver from "./FooterVisibilityObserver";

type FooterLink = {
  href: string;
  label: string;
};

type FooterSection = {
  title: string;
  links: FooterLink[];
};

type FooterBaseProps = {
  sections: FooterSection[];
};

type FooterProps = {
  isSignedIn?: boolean;
};

type ProfessionPageLink = {
  slug: string;
  title: string;
  icon?: string;
};

const FooterBase = ({ sections }: FooterBaseProps) => {
  return (
    <footer
      aria-label="Site footer"
      className="relative mx-auto flex justify-center bg-primary5"
    >
      <FooterVisibilityObserver />
      <Box className="flex flex-col max-w-[1440px] w-full px-[24px] screen744:!px-[48px] screen1280:!px-[72px] py-[32px] screen744:!py-[56px] gap-[36px] screen744:!gap-[56px]">
        <Box className="flex flex-col screen744:!flex-row screen744:!gap-[80px] justify-between">
          <Box className="max-w-[520px]">
            <TrackedLink href={"/"} navType="footer">
              <Image
                alt="logo"
                width={133}
                height={40}
                src="/images/logo.png"
              />
            </TrackedLink>

            <Box className="mt-[16px] screen744:!max-w-238 screen1280:!max-w-[460px]">
              <span className="text-text3 font-light text-[14px] screen744:!text-[12px] screen1280:!text-[16px] flex text-left leading-[22px] screen1280:!leading-[26px]">
                CELPIPPRACTICETEST.com is an independent platform and is not
                affiliated with, endorsed by, or associated with Paragon Testing
                Enterprises or the official CELPIP test
              </span>
            </Box>
            <Box className="flex items-center gap-[12px] mt-[12px]">
              <TrackedLink
                href="https://www.linkedin.com/company/celpippracticetest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 font-normal text-[13px] flex items-center"
                aria-label="Visit our LinkedIn page"
                navType="footer"
              >
                <SvgLinkedIn className="w-5 h-5" />
              </TrackedLink>
              <TrackedLink
                href="https://www.youtube.com/@celpippracticetestcom"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 font-normal text-[13px] flex items-center"
                aria-label="Visit our YouTube channel"
                navType="footer"
              >
                <SvgYouTube className="w-5 h-5" />
              </TrackedLink>
            </Box>

          </Box>

          <Box className="mt-[8px] screen744:!mt-[0px] w-full self-start">
            <nav aria-label="Footer navigation">
              <ul className="flex flex-wrap gap-[18px] screen744:!gap-[20px]">
                {sections.map((section) => (
                  <li key={section.title} className="min-w-[170px]">
                    <span className="text-text1 font-semibold text-[14px] block">
                      {section.title}
                    </span>
                    <ul className="flex gap-[10px] flex-col mt-[12px]">
                      {section.links.map((link) => (
                        <li
                          key={link.href}
                          className="text-text2 font-normal text-[13px] leading-[20px]"
                        >
                          <TrackedLink href={link.href} navType="footer">
                            {link.label}
                          </TrackedLink>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}

              </ul>
            </nav>
          </Box>
        </Box>

        <Box className="flex justify-center pt-[16px] border-t border-primary4/30">
          <span className="text-text3 font-normal text-[13px]">
            {`© ${new Date().getFullYear()} CELPIPPRACTICETEST.com. All rights reserved.`}
          </span>
        </Box>
      </Box>
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
];

const baseGuestSections: FooterSection[] = [
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
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
      { href: "/contact-us", label: "Contact Us" },
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

function categorizeProfessionPage(page: ProfessionPageLink): string {
  const haystack = `${page.slug} ${page.title} ${page.icon ?? ""}`.toLowerCase();

  if (
    /(physician|medical|health|dentist|pharmac|midwife|physiotherapist|surgeon)/.test(
      haystack
    )
  ) {
    return "Healthcare";
  }

  if (/(teacher|social-worker|social worker|early-childhood|education|baby)/.test(haystack)) {
    return "Education & Community";
  }

  if (/(truck|skilled-trades|caregiver|driver|wrench)/.test(haystack)) {
    return "Trades & Transport";
  }

  return "Business & Professional";
}

function buildProfessionSections(items: ProfessionPageLink[]): FooterSection[] {
  const categoryOrder = [
    "Healthcare",
    "Education & Community",
    "Trades & Transport",
    "Business & Professional",
  ];

  const grouped = new Map<string, FooterLink[]>();

  items.forEach((item) => {
    const category = categorizeProfessionPage(item);
    const current = grouped.get(category) || [];
    current.push({
      href: `/${item.slug}`,
      label: item.title,
    });
    grouped.set(category, current);
  });

  return categoryOrder
    .map((title) => ({
      title,
      links: (grouped.get(title) || []).sort((left, right) =>
        left.label.localeCompare(right.label)
      ),
    }))
    .filter((section) => section.links.length > 0);
}

export const UserFooter = () => {
  return <FooterBase sections={userSections} />;
};

export async function NoUserFooter() {
  const professionLinks: ProfessionPageLink[] =
    await getPublishedProfessionPageSummaries();

  const sections = [
    ...buildProfessionSections(professionLinks),
    ...baseGuestSections,
  ];

  return <FooterBase sections={sections} />;
}

export default async function Footer({ isSignedIn }: FooterProps) {
  if (isSignedIn) {
    return <UserFooter />;
  }

  return <NoUserFooter />;
}

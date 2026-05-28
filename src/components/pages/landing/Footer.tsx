import { getPublishedProfessionPageSummaries } from "@/lib/profession-pages/public";
import {
  FooterBase,
  GUEST_FOOTER_SECTIONS,
  UserFooter,
  type FooterLink,
  type FooterSection,
} from "./FooterContent";

type FooterProps = {
  isSignedIn?: boolean;
};

type ProfessionPageLink = {
  slug: string;
  title: string;
  icon?: string;
};

function categorizeProfessionPage(page: ProfessionPageLink): string {
  const haystack = `${page.slug} ${page.title} ${page.icon ?? ""}`.toLowerCase();

  if (
    /(physician|medical|health|dentist|pharmac|midwife|physiotherapist|surgeon)/.test(
      haystack,
    )
  ) {
    return "Healthcare";
  }

  if (
    /(teacher|social-worker|social worker|early-childhood|education|baby)/.test(
      haystack,
    )
  ) {
    return "Education & Community";
  }

  if (/(truck|skilled-trades|caregiver|driver|wrench)/.test(haystack)) {
    return "Trades & Transport";
  }

  return "Business & Professional";
}

const FOOTER_PROFESSION_LINK_LIMIT = 6;

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
    const href = `/${item.slug}`;
    const current = grouped.get(category) || [];
    if (current.some((link) => link.href === href)) {
      return;
    }
    current.push({
      href,
      label: item.title,
    });
    grouped.set(category, current);
  });

  return categoryOrder
    .map((title) => {
      const sorted = (grouped.get(title) || []).sort((left, right) =>
        left.label.localeCompare(right.label),
      );
      const visible = sorted.slice(0, FOOTER_PROFESSION_LINK_LIMIT);
      const links: FooterLink[] = [...visible];

      if (sorted.length > FOOTER_PROFESSION_LINK_LIMIT) {
        links.push({
          href: "/blog",
          label: "More guides →",
          isMoreLink: true,
        });
      }

      return { title, links };
    })
    .filter((section) => section.links.length > 0);
}

export async function NoUserFooter() {
  const professionLinks: ProfessionPageLink[] =
    await getPublishedProfessionPageSummaries();

  const professionSections = buildProfessionSections(professionLinks);

  return (
    <FooterBase
      sections={GUEST_FOOTER_SECTIONS}
      professionSections={professionSections}
    />
  );
}

export default async function Footer({ isSignedIn }: FooterProps) {
  if (isSignedIn) {
    return <UserFooter />;
  }

  return <NoUserFooter />;
}

export { UserFooter } from "./FooterContent";

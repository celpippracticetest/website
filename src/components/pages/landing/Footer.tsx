import Link from "next/link";
import Image from "next/image";
import SvgLinkedIn from "@/components/icons/LinkedIn";
import SvgYouTube from "@/components/icons/YouTube";
import { Box } from "@/components/ui/Box";
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
            <Link href={"/"}>
              <Image
                alt="logo"
                width={133}
                height={40}
                src="/images/logo.png"
              />
            </Link>

            <Box className="mt-[16px] screen744:!max-w-238 screen1280:!max-w-[460px]">
              <span className="text-text3 font-light text-[14px] screen744:!text-[12px] screen1280:!text-[16px] flex text-left leading-[22px] screen1280:!leading-[26px]">
                CELPIPPRACTICETEST.com is an independent platform and is not
                affiliated with, endorsed by, or associated with Paragon Testing
                Enterprises or the official CELPIP test
              </span>
            </Box>
            <Box className="flex items-center gap-[12px] mt-[12px]">
              <Link
                href="https://www.linkedin.com/company/celpippracticetest"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 font-normal text-[13px] flex items-center"
                aria-label="Visit our LinkedIn page"
              >
                <SvgLinkedIn className="w-5 h-5" />
              </Link>
              <Link
                href="https://www.youtube.com/@CELPIPPracticeTestChannel"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text2 font-normal text-[13px] flex items-center"
                aria-label="Visit our YouTube channel"
              >
                <SvgYouTube className="w-5 h-5" />
              </Link>
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
                          <Link href={link.href}>{link.label}</Link>
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
      { href: "/learning", label: "Ai Learning" },
    ],
  },
];

const guestSections: FooterSection[] = [
  {
    title: "Professionals",
    links: [
      {
        href: "/celpip-for-real-estate",
        label: "CELPIP for Real Estate Agent",
      },
      {
        href: "/celpip-for-nurses",
        label: "CELPIP for Nursing & Healthcare",
      },
      {
        href: "/celpip-for-immigration-consultant",
        label: "CELPIP for Immigration Consultant",
      },
      {
        href: "/celpip-for-physicians-surgeons",
        label: "CELPIP for Physicians & Surgeons",
      },
      {
        href: "/celpip-for-early-childhood-educator",
        label: "CELPIP for Early Childhood Educator (ECE)",
      },
      {
        href: "/celpip-for-mortgage-broker",
        label: "CELPIP for Mortgage Broker",
      },
      {
        href: "/celpip-for-pharmacist",
        label: "CELPIP for Pharmacist",
      },
      {
        href: "/celpip-for-medical-laboratory-technologist",
        label: "CELPIP for Medical Laboratory Technologist",
      },
      {
        href: "/celpip-for-teacher-certification",
        label: "CELPIP for Teacher Certification",
      },
      {
        href: "/celpip-for-health-care-aide",
        label: "CELPIP for Health Care Aide (HCA)",
      },
    ],
  },
  {
    title: "Career Programs",
    links: [
      {
        href: "/celpip-for-physiotherapist",
        label: "CELPIP for Physiotherapist",
      },
      {
        href: "/celpip-for-commercial-truck-driver",
        label: "CELPIP for Commercial Truck Driver",
      },
      {
        href: "/celpip-for-caregiver-home-support",
        label: "CELPIP for Caregiver & Home Support",
      },
      {
        href: "/celpip-for-skilled-trades",
        label: "CELPIP for Skilled Trades",
      },
      {
        href: "/celpip-for-dentist-dental-hygienist",
        label: "CELPIP for Dentist & Dental Hygienist",
      },
      {
        href: "/celpip-for-startup-visa-entrepreneur",
        label: "CELPIP for Start-Up Visa (Entrepreneur)",
      },
      {
        href: "/celpip-for-social-worker",
        label: "CELPIP for Social Worker",
      },
      {
        href: "/celpip-for-midwife",
        label: "CELPIP for Midwife",
      },
      {
        href: "/celpip-for-tech-worker",
        label: "CELPIP for Tech Worker",
      },
    ],
  },
  {
    title: "Comparisons",
    links: [
      { href: "/celpip-retake", label: "CELPIP Retake" },
      {
        href: "/celpip-vs-ielts-express-entry-2026",
        label: "CELPIP vs IELTS Express Entry 2026",
      },
      { href: "/mad-english-tv-alternative", label: "Mad English TV Alternative" },
      { href: "/celpip-for-professional-licensure", label: "CELPIP for Professional Licensure" },
    ],
  },
  {
    title: "Practice",
    links: [
      { href: "/listening", label: "Listening" },
      { href: "/speaking", label: "Speaking" },
      { href: "/writing", label: "Writing" },
      { href: "/reading", label: "Reading" },
      { href: "/exam-overview", label: "Mock Exams" },
      { href: "/learning", label: "Ai Learning" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/pricing", label: "Pricing" },
      { href: "https://blog.celpippracticetest.com/", label: "Blog" },
      { href: "/celpip-vocabulary-pdf", label: "CELPIP Vocabulary PDF" },
      { href: "/reading-task-4-viewpoints", label: "Reading Task 4 Viewpoints" },
      { href: "/celpip-general-ls-practice", label: "CELPIP General LS Practice" },
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

export const NoUserFooter = () => {
  return <FooterBase sections={guestSections} />;
};

const Footer = ({ isSignedIn }: FooterProps) => {
  if (isSignedIn) {
    return <UserFooter />;
  }

  return <NoUserFooter />;
};

export default Footer;

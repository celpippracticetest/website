import { Metadata } from "next";
import Download from "@mui/icons-material/Download";
import Bolt from "@mui/icons-material/Bolt";
import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";

const DEFAULT_APP_BASE_URL = "https://celpippracticetest.com";

function normalizeAppBaseUrl(raw: string | undefined): string {
  const input = (raw ?? "").trim().replace(/^['"]|['"]$/g, "");
  if (!input) return DEFAULT_APP_BASE_URL;

  // If it's already a valid absolute URL, keep it.
  try {
    return new URL(input).toString();
  } catch {
    // continue
  }

  // If it has an http(s) scheme but is still invalid, fall back.
  if (/^https?:\/\//i.test(input)) return DEFAULT_APP_BASE_URL;

  const hostPart = input.split("/")[0];
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(hostPart)) {
    return `http://${input}`;
  }

  return `https://${input}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = normalizeAppBaseUrl(process.env.APP_BASE_URL);
  const url = `${baseUrl}/app`;
  const title = "Download the CELPIP App for iOS & Android | CELPIP Practice Test";
  const description =
    "Download the CELPIP Practice Test app to get on-the-go CELPIP mock practice, instant scoring, and AI-powered feedback for Listening, Reading, Writing, and Speaking.";

  return {
    title,
    description,
    keywords: ["CELPIP app", "CELPIP practice test", "CELPIP mock exam", "AI feedback", "download app"],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      url,
      images: [
        {
          url: "/images/hero.png",
          width: 1200,
          height: 630,
          alt: "CELPIP Practice Test app",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/images/hero.png"],
    },
    robots: { index: true, follow: true },
  };
}

export default function AppDownloadPage() {
  const iosAppUrl = process.env.NEXT_PUBLIC_IOS_APP_URL;
  const androidAppUrl = process.env.NEXT_PUBLIC_ANDROID_APP_URL;

  const storeUrls = [iosAppUrl, androidAppUrl].filter((u): u is string => Boolean(u && u.trim()));

  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "CELPIP Practice Test",
    applicationCategory: "EducationApplication",
    operatingSystem: ["iOS", "Android"],
    description:
      "CELPIP Practice Test app for mobile mock exams, instant scoring, and AI feedback across Listening, Reading, Writing, and Speaking.",
    ...(storeUrls.length ? { downloadUrl: storeUrls[0] } : {}),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD"
    },
    featureList: [
      "Instant CELPIP scoring",
      "AI-powered feedback and practice drills",
      "Study on-the-go with mobile mock tests",
    ],
  };

  const StoreBadge = ({ kind, href }: { kind: "ios" | "android"; href?: string }) => {
    const disabled = !href?.trim();

    const baseClassName =
      "flex w-full flex-col justify-between rounded-2xl border px-5 py-4 transition-shadow";

    const className =
      kind === "ios"
        ? `${baseClassName} bg-black border-black text-white hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)]`
        : `${baseClassName} bg-slate-900 border-slate-900 text-white hover:shadow-[0_12px_30px_rgba(2,6,23,0.35)]`;

    const content = (
      <Box className="flex flex-col">
        <Box className="text-xs font-medium text-white/80">
          {kind === "ios" ? "Download on the" : "Get it on"}
        </Box>
        <Box className="mt-0.5 text-xl font-semibold tracking-tight">
          {kind === "ios" ? "App Store" : "Google Play"}
        </Box>
        <Box className="mt-1 text-xs text-white/70">CELPIP Practice Test</Box>
        <Box className="mt-2 h-px w-full bg-white/10" />
      </Box>
    );

    if (disabled) {
      return (
        <Box className={`${className} opacity-60 cursor-not-allowed`} aria-disabled="true">
          {content}
        </Box>
      );
    }

    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={kind === "ios" ? "Download on the App Store" : "Get it on Google Play"}
        className={className}
      >
        {content}
      </a>
    );
  };

  return (
    <Box className="cel-container py-10 md:py-14">
      <JsonLd data={appJsonLd} />

      <Box className="flex flex-col gap-6">
        <Box className="flex items-start justify-between gap-6 flex-wrap">
          <Box className="flex flex-col gap-2">
            <Box className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700">
              <Download className="h-4 w-4 text-blue-700" />
              Mobile App Downloads
            </Box>
            <h1 className="text-3xl font-bold text-slate-900 md:text-5xl">Download the CELPIP App</h1>
            <Box className="text-base text-slate-600 md:text-lg max-w-3xl">
              Practice CELPIP anywhere with instant scoring, AI-powered feedback, and realistic mock exam drills.
            </Box>
          </Box>

          <Box className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-blue-50 px-4 py-3">
            <Bolt className="h-5 w-5 text-blue-700" />
            <Box className="text-sm font-medium text-blue-900">Study faster with mobile practice</Box>
          </Box>
        </Box>

        <Box className="mt-2 flex flex-col gap-4 md:flex-row">
          <StoreBadge kind="ios" href={iosAppUrl} />
          <StoreBadge kind="android" href={androidAppUrl} />
        </Box>

        <Box className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
          <Box className="text-xl font-bold text-slate-900">What you can do in the app</Box>
          <Box className="mt-4 flex flex-col gap-3">
            <Box className="flex items-start gap-3">
              <Box className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <Box className="text-slate-700">
                <span className="font-medium text-slate-900">Mock exams:</span> Listening, Reading, Writing, and Speaking practice on your schedule.
              </Box>
            </Box>
            <Box className="flex items-start gap-3">
              <Box className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <Box className="text-slate-700">
                <span className="font-medium text-slate-900">Instant feedback:</span> AI-guided improvements to help you target the highest-impact errors.
              </Box>
            </Box>
            <Box className="flex items-start gap-3">
              <Box className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
              <Box className="text-slate-700">
                <span className="font-medium text-slate-900">On-the-go learning:</span> Review strategies and drill key question types anywhere.
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}


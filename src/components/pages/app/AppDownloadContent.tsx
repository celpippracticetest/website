import CheckCircle from "@mui/icons-material/CheckCircle";
import PhoneIphone from "@mui/icons-material/PhoneIphone";
import SvgDiamond from "@/components/icons/Diamond";
import { StoreBadgesRow } from "@/components/pages/app/StoreBadges";

const APP_FEATURES = [
  {
    title: "Mock exams on the go",
    description:
      "Practice Listening, Reading, Writing, and Speaking wherever you are.",
  },
  {
    title: "Instant AI feedback",
    description:
      "Get guided improvements on writing and speaking responses in seconds.",
  },
  {
    title: "Full skill coverage",
    description:
      "Drill question types, review strategies, and stay exam-ready between sessions.",
  },
] as const;

const TRUST_ITEMS = [
  "Free web practice available",
  "Sync progress with your account",
  "48-hour refund guarantee",
] as const;

type AppDownloadContentProps = {
  iosAppUrl?: string;
  androidAppUrl?: string;
};

export function AppDownloadContent({ iosAppUrl, androidAppUrl }: AppDownloadContentProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-10 screen744:px-8 screen744:py-14">
      <div className="flex flex-col gap-10 screen1024:flex-row screen1024:items-start screen1024:gap-12">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center gap-2">
            <SvgDiamond className="-rotate-12 text-primary1" aria-hidden />
            <span className="rounded-full bg-primary6 px-3 py-1 text-xs font-semibold text-primary1">
              Mobile app downloads
            </span>
          </div>

          <h1 className="text-balance text-3xl font-extrabold leading-tight text-text1 screen744:text-4xl screen1024:text-[2.75rem]">
            Download the CELPIP{" "}
            <span className="text-primary1">App</span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-text2 screen744:text-lg">
            Practice CELPIP anywhere with instant scoring, AI-powered feedback, and realistic
            mock exam drills on iOS and Android.
          </p>

          <StoreBadgesRow
            iosAppUrl={iosAppUrl}
            androidAppUrl={androidAppUrl}
            className="mt-8"
          />

          <ul className="m-0 mt-6 flex list-none flex-col gap-2 p-0 text-sm text-text3 screen744:flex-row screen744:flex-wrap screen744:gap-x-6 screen744:gap-y-2">
            {TRUST_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="w-full shrink-0 screen1024:max-w-md">
          <div className="rounded-3xl border border-outline/80 bg-white p-6 shadow-sm screen744:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary6 text-primary1">
                <PhoneIphone sx={{ fontSize: 24 }} aria-hidden />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary1">
                  In the app
                </p>
                <h2 className="text-lg font-bold text-text1">What you can do</h2>
              </div>
            </div>

            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {APP_FEATURES.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <CheckCircle sx={{ color: "#0DAA94", fontSize: 22 }} className="mt-0.5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold text-text1">{feature.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-text2">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

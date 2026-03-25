"use client";

import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Description from "@mui/icons-material/Description";
import MenuBook from "@mui/icons-material/MenuBook";
import Work from "@mui/icons-material/Work";
import LocalShipping from "@mui/icons-material/LocalShipping";
import Favorite from "@mui/icons-material/Favorite";
import Build from "@mui/icons-material/Build";
import SentimentSatisfiedAlt from "@mui/icons-material/SentimentSatisfiedAlt";
import RocketLaunch from "@mui/icons-material/RocketLaunch";
import People from "@mui/icons-material/People";
import ChildCare from "@mui/icons-material/ChildCare";
import Memory from "@mui/icons-material/Memory";
import MedicalServices from "@mui/icons-material/MedicalServices";
import Medication from "@mui/icons-material/Medication";
import Policy from "@mui/icons-material/Policy";
import Apartment from "@mui/icons-material/Apartment";
import School from "@mui/icons-material/School";
import Science from "@mui/icons-material/Science";
import Mic from "@mui/icons-material/Mic";
import { ExamModeFeatureSection } from "@/components/marketing/ExamModeFeatureSection";
import OnlineUsersCount from "@/components/analytics/OnlineUsersCount";

const iconMap = {
  Briefcase: Work,
  Truck: LocalShipping,
  Heart: Favorite,
  Wrench: Build,
  Smile: SentimentSatisfiedAlt,
  Rocket: RocketLaunch,
  Users: People,
  Baby: ChildCare,
  Cpu: Memory,
  MedicalServices,
  Medication,
  Policy,
  Apartment,
  School,
  Science,
  Mic,
} as const;

const PLATFORM_FEATURE_ROWS: { title: string; description: string }[] = [
  { title: "Writing and Speaking AI Feedback", description: "Instant scores and feedback." },
  { title: "60 Full-Length Mock Exams", description: "Practice in exam conditions." },
  { title: "Task-Specific Practice", description: "Focus on weaker sections." },
  { title: "Study on Your Schedule", description: "Access from any device." },
];

export type ProfessionPageConfig = {
  slug: string;
  title: string;
  badge: string;
  h1Highlight: string;
  /** Conversational question for AI search; optional, shown above the position-zero answer. */
  aiSnippetQuestion?: string;
  /** Informational lead (50–60 words) under H1 for AI/search snippets; not promotional. */
  aiSnippet: string;
  intro: string;
  sectionTitle: string;
  sectionSubtitle: string;
  card1Title: string;
  card1Desc: string;
  card1Challenge: string;
  card1Solution: string;
  chooseUsTitle: string;
  chooseUsSubtitle: string;
  faq: { question: string; answer: string }[];
  ctaTitle: string;
  accent: "blue" | "teal" | "amber" | "emerald" | "rose" | "cyan" | "indigo" | "violet" | "slate";
  icon: keyof typeof iconMap;
  relatedArticles?: { title: string; url: string; }[];
  relatedProfessions?: { title: string; url: string; }[];
};

const accentClasses = {
  blue: { badge: "bg-blue-50 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20", card: "border-t-blue-500", icon: "bg-blue-100 text-blue-600", cta: "from-blue-500", highlight: "text-blue-600" },
  teal: { badge: "bg-teal-50 text-teal-700", btn: "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20", card: "border-t-teal-500", icon: "bg-teal-100 text-teal-600", cta: "from-teal-500", highlight: "text-teal-600" },
  amber: { badge: "bg-amber-50 text-amber-700", btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20", card: "border-t-amber-500", icon: "bg-amber-100 text-amber-600", cta: "from-amber-500", highlight: "text-amber-600" },
  emerald: { badge: "bg-emerald-50 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20", card: "border-t-emerald-500", icon: "bg-emerald-100 text-emerald-600", cta: "from-emerald-500", highlight: "text-emerald-600" },
  rose: { badge: "bg-rose-50 text-rose-700", btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20", card: "border-t-rose-500", icon: "bg-rose-100 text-rose-600", cta: "from-rose-500", highlight: "text-rose-600" },
  cyan: { badge: "bg-cyan-50 text-cyan-700", btn: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20", card: "border-t-cyan-500", icon: "bg-cyan-100 text-cyan-600", cta: "from-cyan-500", highlight: "text-cyan-600" },
  indigo: { badge: "bg-indigo-50 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20", card: "border-t-indigo-500", icon: "bg-indigo-100 text-indigo-600", cta: "from-indigo-500", highlight: "text-indigo-600" },
  violet: { badge: "bg-violet-50 text-violet-700", btn: "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20", card: "border-t-violet-500", icon: "bg-violet-100 text-violet-600", cta: "from-violet-500", highlight: "text-violet-600" },
  slate: { badge: "bg-slate-100 text-slate-700", btn: "bg-slate-600 hover:bg-slate-700 shadow-slate-600/20", card: "border-t-slate-500", icon: "bg-slate-100 text-slate-600", cta: "from-slate-500", highlight: "text-slate-600" },
};

export function ProfessionPageTemplate({
  config,
  pageUrl,
}: {
  config: ProfessionPageConfig;
  /** Canonical URL for WebPage structured data (abstract = aiSnippet). */
  pageUrl: string;
}) {
  const c = accentClasses[config.accent];
  const IconComponent = iconMap[config.icon];
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url: pageUrl,
    name: `${config.title}: ${config.h1Highlight}`,
    abstract: config.aiSnippet,
    ...(config.aiSnippetQuestion
      ? { description: config.aiSnippetQuestion }
      : {}),
  };
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={webPageLd} />
      <JsonLd data={faqData} />
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${c.badge} text-sm font-medium mb-6`}>
            {IconComponent ? <IconComponent className="w-4 h-4" /> : null}
            <span>{config.badge}</span>
          </Box>
          <h1 className="text-4xl md:text-[40px] font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            {config.title}: <br className="hidden md:block" />
            <span className={`block text-2xl md:text-4xl font-extrabold mt-1 md:mt-2 ${c.highlight}`}>
              {config.h1Highlight}
            </span>
          </h1>
          {config.aiSnippetQuestion ? (
            <p className="text-lg md:text-xl text-slate-900 max-w-3xl mx-auto font-medium leading-snug mb-3 text-left md:text-center">
              {config.aiSnippetQuestion}
            </p>
          ) : null}
          <p className="text-base md:text-[1.0625rem] text-slate-800 max-w-3xl mx-auto leading-relaxed mb-6 text-left md:text-center font-normal">
            {config.aiSnippet}
          </p>
          <p className="text-[17px] text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">{config.intro}</p>
          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className={`h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl ${c.btn}`}>
                Start Free Practice Test <ArrowForward className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>
      <Box className="max-w-6xl mx-auto px-4 py-16">
        <Box className="mb-10 md:mb-12">
          <OnlineUsersCount variant="marketing" className="w-full shadow-sm ring-1 ring-slate-200/80" />
        </Box>
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{config.sectionTitle}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{config.sectionSubtitle}</p>
          </Box>
          <Box className="flex flex-col md:flex-row gap-6">
            <Card className={`flex-1 hover:shadow-md transition-shadow border-t-4 ${c.card}`}>
              <CardHeader>
                <Box className={`w-12 h-12 rounded-lg ${c.icon} flex items-center justify-center mb-4`}><Description className="w-6 h-6" /></Box>
                <CardTitle>{config.card1Title}</CardTitle>
                <CardDescription>{config.card1Desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100"><Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1"><Warning className="w-4 h-4" /> The Challenge</Box><p className="text-red-600 text-xs">{config.card1Challenge}</p></Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100"><Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle className="w-4 h-4" /> Our Solution</Box><p className="text-green-600 text-xs">{config.card1Solution}</p></Box>
                </Box>
              </CardContent>
            </Card>
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-slate-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4 text-slate-600"><MenuBook className="w-6 h-6" /></Box>
                <CardTitle>Full CELPIP-General Prep</CardTitle>
                <CardDescription>All Four Skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">Strong scores in all four components are typically required.</p>
                <Box className="bg-green-50 p-3 rounded-md border border-green-100"><Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle className="w-4 h-4" /> Our Solution</Box><p className="text-green-600 text-xs">60+ mock exams and task-specific practice.</p></Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
        <Box className="mb-20">
          <Box className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Box>
              <h2 className="text-3xl font-bold text-slate-900">{config.chooseUsTitle}</h2>
              <p className="mt-2 max-w-2xl text-slate-600">{config.chooseUsSubtitle}</p>
            </Box>
            <Link href="/exam-overview" className="shrink-0">
              <Button variant="outline" className="w-full md:w-auto">
                View All Features
              </Button>
            </Link>
          </Box>
          <Box
            className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-slate-900/5 border-t-4 ${c.card}`}
          >
            <Box className="hidden border-b border-slate-100 bg-slate-50/90 px-6 py-3.5 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-8 md:px-8">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">Feature</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">How it helps you</span>
            </Box>
            <Box className="divide-y divide-slate-100">
              {PLATFORM_FEATURE_ROWS.map((row, i) => (
                <Box
                  key={i}
                  className="px-5 py-5 transition-colors duration-200 hover:bg-slate-50/80 md:px-8 md:py-5"
                >
                  <Box className="flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:items-center md:gap-8">
                    <Box className="flex items-start gap-3.5 md:items-center">
                      <Box className={`shrink-0 rounded-xl p-2.5 shadow-sm ${c.icon}`}>
                        <CheckCircle className="h-5 w-5" />
                      </Box>
                      <span className="pt-0.5 text-base font-semibold leading-snug text-slate-900 md:pt-0">
                        {row.title}
                      </span>
                    </Box>
                    <Box className="border-t border-slate-100 pt-4 md:border-t-0 md:pt-0 pl-14 md:pl-0">
                      <p className="text-[15px] leading-relaxed text-slate-600">{row.description}</p>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <ExamModeFeatureSection variant="profession" accent={config.accent} />

        {/* Related Resources Section */}
        {(config.relatedArticles?.length || config.relatedProfessions?.length) ? (
          <Box className="mb-20">
            <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Related Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {config.relatedArticles && config.relatedArticles.length > 0 && (
                <Card className={`h-full border-t-4 ${c.card} shadow-sm hover:shadow-md transition-shadow`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MenuBook className={`w-5 h-5 ${c.icon.split(' ')[1]}`} />
                      Helpful Guides
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {config.relatedArticles.map((article, i) => (
                        <li key={i}>
                          <Link href={article.url} className="flex items-center text-slate-700 hover:text-slate-900 font-medium transition-colors group">
                            <ArrowForward className={`w-4 h-4 mr-2 ${c.icon.split(' ')[1]}`} />
                            {article.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {config.relatedProfessions && config.relatedProfessions.length > 0 && (
                <Card className={`h-full border-t-4 ${c.card} shadow-sm hover:shadow-md transition-shadow`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Work className={`w-5 h-5 ${c.icon.split(' ')[1]}`} />
                      Related Professions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {config.relatedProfessions.map((prof, i) => (
                        <li key={i}>
                          <Link href={prof.url} className="flex items-center text-slate-700 hover:text-slate-900 font-medium transition-colors group">
                            <ArrowForward className={`w-4 h-4 mr-2 ${c.icon.split(' ')[1]}`} />
                            {prof.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </Box>
        ) : null}

        <Box className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {config.faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                <AccordionContent className="text-slate-600 leading-relaxed">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Box>
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-slate-900" />
          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{config.ctaTitle}</h2>
            <p className="text-lg text-slate-300 mb-8">Start with a free sample test or choose a plan.</p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing"><Button size="lg" className={`w-full sm:w-auto text-white border-0 h-12 px-8 ${c.btn}`}>View Pricing and Plans</Button></Link>
              <Link href="/exam-overview"><Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-slate-600 hover:bg-slate-800 h-12 px-8">Try a Free Sample Test</Button></Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

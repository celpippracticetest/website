"use client";

import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  BookOpen,
  Briefcase,
  Truck,
  Heart,
  Wrench,
  Smile,
  Rocket,
  Users,
  Baby,
  Cpu,
} from "lucide-react";

const iconMap = {
  Briefcase,
  Truck,
  Heart,
  Wrench,
  Smile,
  Rocket,
  Users,
  Baby,
  Cpu,
} as const;

export type ProfessionPageConfig = {
  slug: string;
  title: string;
  badge: string;
  h1Highlight: string;
  intro: string;
  sectionTitle: string;
  sectionSubtitle: string;
  card1Title: string;
  card1Desc: string;
  card1Challenge: string;
  card1Solution: string;
  chooseUsTitle: string;
  chooseUsSubtitle: string;
  faq1Q: string;
  faq1A: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
  ctaTitle: string;
  accent: "blue" | "teal" | "amber" | "emerald" | "rose" | "cyan" | "indigo" | "violet" | "slate";
  icon: keyof typeof iconMap;
};

const accentClasses = {
  blue: { badge: "bg-blue-50 text-blue-700", btn: "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20", card: "border-t-blue-500", icon: "bg-blue-100 text-blue-600", cta: "from-blue-500" },
  teal: { badge: "bg-teal-50 text-teal-700", btn: "bg-teal-600 hover:bg-teal-700 shadow-teal-600/20", card: "border-t-teal-500", icon: "bg-teal-100 text-teal-600", cta: "from-teal-500" },
  amber: { badge: "bg-amber-50 text-amber-700", btn: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20", card: "border-t-amber-500", icon: "bg-amber-100 text-amber-600", cta: "from-amber-500" },
  emerald: { badge: "bg-emerald-50 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20", card: "border-t-emerald-500", icon: "bg-emerald-100 text-emerald-600", cta: "from-emerald-500" },
  rose: { badge: "bg-rose-50 text-rose-700", btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20", card: "border-t-rose-500", icon: "bg-rose-100 text-rose-600", cta: "from-rose-500" },
  cyan: { badge: "bg-cyan-50 text-cyan-700", btn: "bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20", card: "border-t-cyan-500", icon: "bg-cyan-100 text-cyan-600", cta: "from-cyan-500" },
  indigo: { badge: "bg-indigo-50 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20", card: "border-t-indigo-500", icon: "bg-indigo-100 text-indigo-600", cta: "from-indigo-500" },
  violet: { badge: "bg-violet-50 text-violet-700", btn: "bg-violet-600 hover:bg-violet-700 shadow-violet-600/20", card: "border-t-violet-500", icon: "bg-violet-100 text-violet-600", cta: "from-violet-500" },
  slate: { badge: "bg-slate-100 text-slate-700", btn: "bg-slate-600 hover:bg-slate-700 shadow-slate-600/20", card: "border-t-slate-500", icon: "bg-slate-100 text-slate-600", cta: "from-slate-500" },
};

export function ProfessionPageTemplate({ config }: { config: ProfessionPageConfig }) {
  const c = accentClasses[config.accent];
  const IconComponent = iconMap[config.icon];
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: config.faq1Q, acceptedAnswer: { "@type": "Answer", text: config.faq1A } },
      { "@type": "Question", name: config.faq2Q, acceptedAnswer: { "@type": "Answer", text: config.faq2A } },
      { "@type": "Question", name: config.faq3Q, acceptedAnswer: { "@type": "Answer", text: config.faq3A } },
    ],
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={faqData} />
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${c.badge} text-sm font-medium mb-6`}>
            {IconComponent ? <IconComponent className="w-4 h-4" /> : null}
            <span>{config.badge}</span>
          </Box>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            {config.title}: <br className="hidden md:block" />
            <span className={c.highlight}>{config.h1Highlight}</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">{config.intro}</p>
          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className={`h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl ${c.btn}`}>
                Start Free Practice Test <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>
      <Box className="max-w-6xl mx-auto px-4 py-16">
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">{config.sectionTitle}</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">{config.sectionSubtitle}</p>
          </Box>
          <Box className="flex flex-col md:flex-row gap-6">
            <Card className={`flex-1 hover:shadow-md transition-shadow border-t-4 ${c.card}`}>
              <CardHeader>
                <Box className={`w-12 h-12 rounded-lg ${c.icon} flex items-center justify-center mb-4`}><FileText className="w-6 h-6" /></Box>
                <CardTitle>{config.card1Title}</CardTitle>
                <CardDescription>{config.card1Desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100"><Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1"><AlertTriangle className="w-4 h-4" /> The Challenge</Box><p className="text-red-600 text-xs">{config.card1Challenge}</p></Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100"><Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle2 className="w-4 h-4" /> Our Solution</Box><p className="text-green-600 text-xs">{config.card1Solution}</p></Box>
                </Box>
              </CardContent>
            </Card>
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-slate-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4 text-slate-600"><BookOpen className="w-6 h-6" /></Box>
                <CardTitle>Full CELPIP-General Prep</CardTitle>
                <CardDescription>All Four Skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">Strong scores in all four components are typically required.</p>
                <Box className="bg-green-50 p-3 rounded-md border border-green-100"><Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle2 className="w-4 h-4" /> Our Solution</Box><p className="text-green-600 text-xs">60+ mock exams and task-specific practice.</p></Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
        <Box className="mb-20">
          <Box className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4"><Box><h2 className="text-3xl font-bold text-slate-900">{config.chooseUsTitle}</h2><p className="text-slate-600 mt-2">{config.chooseUsSubtitle}</p></Box><Link href="/exam-overview"><Button variant="outline">View All Features</Button></Link></Box>
          <Card className="overflow-hidden border-0 shadow-lg">
            <Table>
              <TableHeader><TableRow className="bg-slate-50 hover:bg-slate-50"><TableHead className="w-[35%] py-4 pl-6 font-bold text-slate-900">Feature</TableHead><TableHead className="py-4 font-bold text-slate-900">How It Helps You</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className={`flex items-center gap-3`}><Box className={`p-2 rounded ${c.icon}`}><CheckCircle2 className="w-4 h-4" /></Box>Writing and Speaking AI Feedback</Box></TableCell><TableCell className="py-4 text-slate-600">Instant scores and feedback.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className={`p-2 rounded ${c.icon}`}><CheckCircle2 className="w-4 h-4" /></Box>60 Full-Length Mock Exams</Box></TableCell><TableCell className="py-4 text-slate-600">Practice in exam conditions.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className={`p-2 rounded ${c.icon}`}><CheckCircle2 className="w-4 h-4" /></Box>Task-Specific Practice</Box></TableCell><TableCell className="py-4 text-slate-600">Focus on weaker sections.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className={`p-2 rounded ${c.icon}`}><CheckCircle2 className="w-4 h-4" /></Box>Study on Your Schedule</Box></TableCell><TableCell className="py-4 text-slate-600">Access from any device.</TableCell></TableRow>
              </TableBody>
            </Table>
          </Card>
        </Box>
        <Box className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1"><AccordionTrigger className="text-left">{config.faq1Q}</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">{config.faq1A}</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger className="text-left">{config.faq2Q}</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">{config.faq2A}</AccordionContent></AccordionItem>
            <AccordionItem value="item-3"><AccordionTrigger className="text-left">{config.faq3Q}</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">{config.faq3A}</AccordionContent></AccordionItem>
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

import { Metadata } from "next";
import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import MedicalServices from "@mui/icons-material/MedicalServices";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Star from "@mui/icons-material/Star";
import Favorite from "@mui/icons-material/Favorite";
import Mic from "@mui/icons-material/Mic";
import MenuBook from "@mui/icons-material/MenuBook";

export const metadata: Metadata = {
  title: "CELPIP for Nurses: Pass Nursing Registration in Canada",
  description:
    "CELPIP prep for nurses & healthcare workers. Meet BCCNM and provincial nursing college language requirements (Level 7+) with AI practice tests and instant feedback.",
  keywords: [
    "CELPIP for nurses Canada",
    "CELPIP nursing registration",
    "BCCNM English requirements",
    "CELPIP for healthcare workers",
    "nursing license Canada CELPIP",
    "CELPIP Level 7 nursing",
  ],
  openGraph: {
    title: "CELPIP for Nurses: Pass Nursing Registration in Canada",
    description:
      "Meet nursing college language requirements with CELPIP practice. AI scoring and feedback for Speaking & Listening. Trusted by healthcare professionals.",
    type: "article",
  },
  alternates: {
    canonical: "https://celpippracticetest.com/celpip-for-nurses",
  },
};

export default function CelpipForNursesPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What CELPIP score do nurses need in Canada?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most provincial nursing regulators (e.g. BCCNM, CNO) require a minimum of Level 7 or equivalent in all four skills, with some programs requiring Level 7 in Speaking and Listening for registration.",
        },
      },
      {
        "@type": "Question",
        name: "Can I use CELPIP for nursing registration?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CELPIP-General is accepted by nursing colleges across Canada for proof of English language proficiency. Check your specific province's requirements (BCCNM, CNO, etc.) for the exact score and test type.",
        },
      },
      {
        "@type": "Question",
        name: "How can I practice CELPIP Speaking for nursing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our platform offers full CELPIP Speaking practice with instant AI feedback on fluency, vocabulary, and structure. You can repeat tasks until you're confident, which helps reduce test-day anxiety common among healthcare workers.",
        },
      },
    ],
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={faqData} />

      {/* Hero Section */}
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium mb-6">
            <Favorite className="w-4 h-4 fill-teal-700" />
            <span>Trusted by Nurses & Healthcare Professionals</span>
          </Box>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            CELPIP for Nurses: <br className="hidden md:block" />
            <span className="text-teal-600">Meet Your Registration Requirements</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Nursing colleges across Canada accept CELPIP for language proficiency. Get the <span className="font-semibold text-slate-900">Level 7+</span> scores you need with practice tests and instant AI feedback—so you can focus on your career, not the test.
          </p>

          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-teal-600/20 hover:shadow-xl hover:translate-y-[-2px] transition-all bg-teal-600 hover:bg-teal-700">
                Start Free Practice Test
                <ArrowForward className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>

      {/* Main Content Container */}
      <Box className="max-w-6xl mx-auto px-4 py-16">
        {/* Why Nurses Choose CELPIP Section */}
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Nurses Use Our CELPIP Prep</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Healthcare workers often need strong Speaking and Listening scores. We give you unlimited practice with instant feedback—so you can clear the language requirement and get on with your nursing career.
            </p>
          </Box>

          <Box className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-teal-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4 text-teal-600">
                  <Mic className="w-6 h-6" />
                </Box>
                <CardTitle>Speaking & Listening Focus</CardTitle>
                <CardDescription>BCCNM, CNO & Provincial Regulators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  Many nursing programs require <strong>Level 7</strong> in Speaking and Listening for registration.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1">
                      <Warning className="w-4 h-4" /> The Challenge
                    </Box>
                    <p className="text-red-600 text-xs">Speaking to a computer under timed conditions can cause anxiety and lower scores.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">AI-powered Speaking practice with instant feedback on fluency and clarity.</p>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-slate-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                  <MedicalServices className="w-6 h-6" />
                </Box>
                <CardTitle>Full CELPIP-General Prep</CardTitle>
                <CardDescription>All 4 Skills When Required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  Some schools or pathways require <strong>all four skills</strong> at Level 7 or higher.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-amber-50 p-3 rounded-md border border-amber-100">
                    <Box className="flex gap-2 text-amber-700 text-sm font-semibold mb-1">
                      <MenuBook className="w-4 h-4" /> The Requirement
                    </Box>
                    <p className="text-amber-700 text-xs">Reading and Writing matter for many nursing registration and bridging programs.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">60+ mock exams and 3,000+ practice questions so you can strengthen every section.</p>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Why Choose Us Table Section */}
        <Box className="mb-20">
          <Box className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <Box>
              <h2 className="text-3xl font-bold text-slate-900">Why Nurses Choose Us</h2>
              <p className="text-slate-600 mt-2">Built for busy healthcare professionals.</p>
            </Box>
            <Box className="hidden md:block">
              <Link href="/exam-overview">
                <Button variant="outline">View All Features</Button>
              </Link>
            </Box>
          </Box>

          <Card className="overflow-hidden border-0 shadow-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[35%] py-4 pl-6 font-bold text-slate-900">Feature</TableHead>
                  <TableHead className="py-4 font-bold text-slate-900">How It Helps You</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-teal-100 text-teal-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Speaking & Writing AI Feedback
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Get instant scores and feedback so you know exactly where you stand before booking the real CELPIP.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-teal-100 text-teal-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      60 Full-Length Mock Exams
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Practice in exam conditions until you're confident. No limit on attempts.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-teal-100 text-teal-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Task-Specific Practice
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Focus on Speaking tasks or Reading/Writing if your program requires all four skills.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-teal-100 text-teal-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Study on Your Schedule
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Access practice from any device—study between shifts or during downtime.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </Box>

        {/* FAQ Section */}
        <Box className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">What CELPIP score do nurses need in Canada?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Most provincial nursing regulators (e.g. BCCNM in BC, CNO in Ontario) require a minimum of Level 7 (or CLB 7 equivalent) in all four components. Some programs specify Level 7 in Speaking and Listening. Always confirm with your specific nursing college or regulator.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">Can I use CELPIP for nursing registration?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Yes. CELPIP-General is widely accepted by nursing colleges and regulators across Canada as proof of English language proficiency. Check your province's nursing college website (e.g. BCCNM, CNO, CARNA) for their current CELPIP and score requirements.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">How can I practice CELPIP Speaking for nursing?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Our platform offers full CELPIP Speaking practice with instant AI scoring and feedback. You can repeat tasks as often as you need to build fluency and reduce test-day anxiety—a common concern for healthcare workers taking computer-based speaking tests.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Box>

        {/* Final CTA Section */}
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-teal-500 via-slate-900 to-slate-900" />

          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Meet Your Nursing Registration Requirements?</h2>
            <p className="text-lg text-slate-300 mb-8">
              Join thousands of healthcare professionals who use our CELPIP practice to achieve the scores they need. Start with a free sample test or choose a plan that fits your timeline.
            </p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white border-0 h-12 px-8">
                  View Pricing & Plans
                </Button>
              </Link>
              <Link href="/exam-overview">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white h-12 px-8">
                  Try a Free Sample Test
                </Button>
              </Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

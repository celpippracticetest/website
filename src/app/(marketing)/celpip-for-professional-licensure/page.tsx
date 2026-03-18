import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
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
import {
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Building2,
  Gavel,
  ArrowRight,
  Star
} from 'lucide-react';

const BASE_URL = process.env.APP_BASE_URL || 'https://celpippracticetest.com';

export const metadata: Metadata = {
  title: 'CELPIP for Professional Licensure: Get Your License Faster',
  description: "Don't let a test stall your career. Expert CELPIP prep for Real Estate, Healthcare, & Immigration professionals. Achieve Level 7+ with AI-driven feedback.",
  keywords: [
    'CELPIP for Professional Licensure Canada',
    'CELPIP Level 7 Real Estate BC',
    'BCFSA English requirements',
    'CELPIP for BC Care Aides',
    'RCIC language proficiency',
    'CELPIP General for professionals'
  ],
  alternates: {
    canonical: `${BASE_URL}/celpip-for-professional-licensure`,
  },
  openGraph: {
    title: 'CELPIP for Professional Licensure: Get Your License Faster',
    description: "Don't let a test stall your career. Expert CELPIP prep for Real Estate, Healthcare, & Immigration professionals. Achieve Level 7+ with AI-driven feedback.",
    type: 'article',
    url: `${BASE_URL}/celpip-for-professional-licensure`,
  },
};

export default function CelpipForNursesPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is the \"Level 7\" requirement for Real Estate in BC?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Applicants must achieve a minimum of Level 7 in all four components of the CELPIP-General test. Failing to meet this can trigger a 90-day waiting period for a rewrite."
      }
    }, {
      "@type": "Question",
      "name": "Can I study only for the Speaking and Listening sections?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "While some professions or citizenship paths only require the \"General LS\" (Listening and Speaking), most professional licenses require the full \"General\" test. Our modular practice allows you to focus on your weakest areas."
      }
    }, {
      "@type": "Question",
      "name": "How accurate is the AI feedback?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our AI is calibrated to Canadian Language Benchmark (CLB) standards, providing score estimations that help you identify vocabulary and structural gaps before your test date."
      }
    }]
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={faqData} />

      {/* Hero Section */}
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <Star className="w-4 h-4 fill-blue-700" />
            <span>Trusted by 10,000+ Professionals</span>
          </Box>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            Unlock Your Canadian Career: <br className="hidden md:block" />
            <span className="text-blue-600">CELPIP for Licensure</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Don't let a test delay your license. We provide the exact tools you need to meet regulatory benchmarks for <span className="font-semibold text-slate-900">Real Estate</span>, <span className="font-semibold text-slate-900">Healthcare</span>, and <span className="font-semibold text-slate-900">Immigration</span>.
          </p>

          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-blue-600/20 hover:shadow-xl hover:translate-y-[-2px] transition-all">
                Start Free Practice Test
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>

      {/* Main Content Container */}
      <Box className="max-w-6xl mx-auto px-4 py-16">

        {/* Value Prop / Specialized Prep Section */}
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Specialized Prep for High-Stakes Industries</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Generic English practice isn't enough. Get targeted training for your specific professional requirements.
            </p>
          </Box>

          <Box className="flex flex-col md:flex-row gap-6">
            {/* Real Estate Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
                  <Building2 className="w-6 h-6" />
                </Box>
                <CardTitle>Real Estate Professionals</CardTitle>
                <CardDescription>BC, SK, AB Requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  Mandatory <strong>Level 7+</strong> in all categories for BCFSA and other regulators.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4" /> The Risk
                    </Box>
                    <p className="text-red-600 text-xs">Failing twice may force you to retake your entire licensing course.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">Industry-specific mock exams to clear the "Level 7" hurdle.</p>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Healthcare Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-teal-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4 text-teal-600">
                  <Stethoscope className="w-6 h-6" />
                </Box>
                <CardTitle>Healthcare Workers</CardTitle>
                <CardDescription>BC Care Aides & Nurses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  Often requires <strong>Level 7</strong> in Speaking/Listening for registry and licensing.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4" /> The Challenge
                    </Box>
                    <p className="text-red-600 text-xs">"Performance freeze" when speaking to a computer under pressure.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">AI simulations to perfect your tone, fluency, and timing.</p>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Immigration Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4 text-purple-600">
                  <Gavel className="w-6 h-6" />
                </Box>
                <CardTitle>Immigration Consultants</CardTitle>
                <CardDescription>RCIC & CICC Requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  High standard of <strong>CLB 9</strong> required to enter practice.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1">
                      <AlertTriangle className="w-4 h-4" /> The Goal
                    </Box>
                    <p className="text-red-600 text-xs">Need to maximize score to prove expertise to future clients.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle2 className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">Advanced feedback to master the nuances for a CLB 9 score.</p>
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
              <h2 className="text-3xl font-bold text-slate-900">Why Professionals Choose Us</h2>
              <p className="text-slate-600 mt-2">Designed for efficiency and results.</p>
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
                  <TableHead className="py-4 font-bold text-slate-900">How It Helps Your Career</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-blue-100 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </Box>
                      60 Full-Length Mock Exams
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">The largest library available to "brute force" your way to success through practice.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-blue-100 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </Box>
                      Instant AI Scoring
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Real-time feedback on Writing/Speaking. Know exactly where you stand before booking the exam.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-blue-100 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </Box>
                      Task-Specific Practice
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Target difficult sections like "Reading for Viewpoints" without wasting time on what you already know.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-blue-100 text-blue-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </Box>
                      Mobile-Optimized
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Study between client meetings or during shifts with our responsive platform.</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </Box>

        {/* FAQ Section with Accordion */}
        <Box className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">What is the "Level 7" requirement for Real Estate in BC?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Applicants must achieve a minimum of Level 7 in all four components of the CELPIP-General test. Failing to meet this can trigger a 90-day waiting period for a rewrite, significantly delaying your licensure process.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">Can I study only for the Speaking and Listening sections?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                While some professions or citizenship paths only require the "General LS" (Listening and Speaking), most professional licenses require the full "General" test. Our platform is modular, so you can focus heavily on Speaking/Listening if those are your weak points, while still having access to Reading/Writing prep.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">How accurate is the AI feedback?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Our AI is calibrated specifically to Canadian Language Benchmark (CLB) standards. It provides instant score estimations and detailed feedback on vocabulary, grammar, and structure to help you identify gaps before your actual test date.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Box>

        {/* Final CTA Section */}
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          {/* Decorative background elements */}
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900" />

          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Secure Your Professional Future?</h2>
            <p className="text-lg text-slate-300 mb-8">
              From basic access to our <strong>Professional Pass Guarantee</strong>, we have the tools to ensure you never have to take this test twice.
            </p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/plans">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 px-8">
                  View Pricing & Packages
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

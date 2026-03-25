import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CheckCircle from "@mui/icons-material/CheckCircle";
import VerifiedUser from "@mui/icons-material/VerifiedUser";
import Schedule from "@mui/icons-material/Schedule";
import TrackChanges from "@mui/icons-material/TrackChanges";
import TrendingUp from "@mui/icons-material/TrendingUp";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Star from "@mui/icons-material/Star";
import { JsonLd } from '@/components/seo/JsonLd';

const BASE_URL = process.env.APP_BASE_URL || 'https://celpippracticetest.com';

export const metadata: Metadata = {
  title: 'CELPIP for Canadian Real Estate | Achieve Level 7 & Get Licensed',
  description: "Meet English proficiency requirements for real estate licensing across Canada. Get Level 7+ on the CELPIP General test with prep that works for every province and territory.",
  keywords: [
    'CELPIP for Real Estate Canada',
    'CELPIP Real Estate licensing Canada',
    'BCFSA English requirement',
    'RECO Ontario CELPIP',
    'Real Estate English test Canada',
    'CELPIP Level 7 Real Estate'
  ],
  alternates: {
    canonical: `${BASE_URL}/celpip-for-real-estate`,
  },
  openGraph: {
    title: 'CELPIP for Canadian Real Estate | Achieve Level 7 & Get Licensed',
    description: "Meet English proficiency requirements for real estate licensing across Canada. Get Level 7+ on the CELPIP General test with prep that works for every province and territory.",
    type: 'article',
    url: `${BASE_URL}/celpip-for-real-estate`,
  },
};

export default function CelpipForRealEstatePage() {
  const jsonLdData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": "CELPIP Preparation for Canadian Real Estate Licensing",
    "description": "CELPIP preparation to help real estate candidates across Canada achieve Level 7+ for provincial licensing requirements.",
    "provider": {
      "@type": "Organization",
      "name": "CELPIPPracticeTest.com",
      "sameAs": "https://celpippracticetest.com"
    },
    "offers": {
      "@type": "Offer",
      "category": "Paid",
      "price": "49",
      "priceCurrency": "CAD",
      "url": "https://celpippracticetest.com/pricing"
    },
    "hasCourseInstance": {
      "@type": "CourseInstance",
      "courseMode": "online",
      "courseWorkload": "PT10H"
    }
  };

  const provincesAndTerritories = [
    { name: 'Alberta', regulator: 'RECA', note: 'Real Estate Council of Alberta accepts CELPIP for licensing.' },
    { name: 'British Columbia', regulator: 'BCFSA', note: 'BC Financial Services Authority requires Level 7+ in all four components.' },
    { name: 'Manitoba', regulator: 'MREA', note: 'Manitoba Real Estate Association recognizes CELPIP for language proficiency.' },
    { name: 'New Brunswick', regulator: 'NBREA', note: 'New Brunswick Real Estate Association accepts CELPIP.' },
    { name: 'Newfoundland and Labrador', regulator: 'NLAR', note: 'Provincial real estate licensing may require CELPIP or equivalent.' },
    { name: 'Northwest Territories', regulator: 'Territorial', note: 'Real estate licensing requirements align with Canadian standards.' },
    { name: 'Nova Scotia', regulator: 'NSREC', note: 'Nova Scotia Real Estate Commission accepts CELPIP for registration.' },
    { name: 'Nunavut', regulator: 'Territorial', note: 'Territorial licensing follows Canadian language requirements.' },
    { name: 'Ontario', regulator: 'RECO', note: 'Real Estate Council of Ontario accepts CELPIP for salesperson registration.' },
    { name: 'Prince Edward Island', regulator: 'PEI Real Estate', note: 'Provincial association recognizes CELPIP for licensing.' },
    { name: 'Quebec', regulator: 'OACIQ', note: 'French is primary; CELPIP may apply for English-language pathways.' },
    { name: 'Saskatchewan', regulator: 'SRA', note: 'Saskatchewan Real Estate Association accepts CELPIP for licensing.' },
    { name: 'Yukon', regulator: 'Territorial', note: 'Real estate licensing follows territorial and Canadian requirements.' },
  ];

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={jsonLdData} />

      {/* Hero Section */}
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <VerifiedUser className="w-4 h-4 fill-blue-700" />
            <span>Canada-Wide Real Estate Licensing</span>
          </Box>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            Secure Your Canadian Real Estate License: <br className="hidden md:block" />
            <span className="text-blue-600">Master the CELPIP Requirement</span>
          </h1>

          <h2 className="text-xl md:text-2xl font-semibold text-slate-700 mb-6 max-w-3xl mx-auto">
            Don’t let a language test be the "Career-Ender" that stops your licensing journey—in any province or territory.
          </h2>

          <p className="text-lg text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Across Canada, provincial and territorial regulators—from <strong>BCFSA in British Columbia</strong> to <strong>RECO in Ontario</strong> and <strong>RECA in Alberta</strong>—require proof of English proficiency. Many accept or require <strong>CELPIP General</strong> with <strong>Level 7 or higher</strong> in all four components. Failing can mean costly retakes and months of delay.
          </p>

          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-blue-600/20 hover:shadow-xl hover:translate-y-[-2px] transition-all">
                Take a Free Level 7 Diagnostic Test
                <ArrowForward className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>

      {/* Main Content Container */}
      <Box className="max-w-6xl mx-auto px-4 py-16">

        {/* Why Trust Us / Features Section */}
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Canadian Real Estate Candidates Trust Us</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We provide the "insurance" you need to pass the first time and avoid costly delays—whether you're licensing in BC, Ontario, Alberta, or anywhere in Canada.
            </p>
          </Box>

          <Box className="flex flex-col md:flex-row gap-6">
            {/* Avoid Penalty Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-red-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center mb-4 text-red-600">
                  <Schedule className="w-6 h-6" />
                </Box>
                <CardTitle>Avoid the 90-Day Rewrite Penalty</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 mb-4">
                  A failed attempt doesn't just cost money; it costs time. Many provincial regulators mandate waiting periods for exam rewrites.
                </p>
                <p className="text-sm text-slate-600 border-l-2 border-red-200 pl-3">
                  Our platform is designed to ensure your proficiency is confirmed <strong>before</strong> you spend on the official CELPIP exam.
                </p>
              </CardContent>
            </Card>

            {/* AI Estimation Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-blue-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 text-blue-600">
                  <TrendingUp className="w-6 h-6" />
                </Box>
                <CardTitle>AI-Driven Score Estimation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 mb-4">
                  Most candidates struggle with <strong>Speaking</strong> and <strong>Writing</strong> due to lack of feedback.
                </p>
                <p className="text-sm text-slate-600 border-l-2 border-blue-200 pl-3">
                  Our AI grader provides instant score reports aligned to Canadian CELPIP standards, showing you exactly how to move from a Level 6 to a Level 7+.
                </p>
              </CardContent>
            </Card>

            {/* Brute Force Advantage Card */}
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-green-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center mb-4 text-green-600">
                  <VerifiedUser className="w-6 h-6" />
                </Box>
                <CardTitle>The "60-Test" Advantage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 mb-4">
                  While others offer 5 or 10 tests, we provide <strong>60 full-length mock exams</strong>.
                </p>
                <p className="text-sm text-slate-600 border-l-2 border-green-200 pl-3">
                  Practice until the format is second nature, eliminating the "test anxiety" that causes many high-potential agents to freeze.
                </p>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Real Estate Requirements by Province & Territory */}
        <Box className="mb-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-4">Real Estate English Requirements Across Canada</h2>
          <p className="text-center text-slate-600 max-w-2xl mx-auto mb-10">
            CELPIP is accepted for real estate licensing in provinces and territories across Canada. Requirements and regulators vary by jurisdiction.
          </p>
          <Box className="flex flex-col gap-3">
            {provincesAndTerritories.map(({ name, regulator, note }) => (
              <Box
                key={name}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 p-4 rounded-xl bg-white border border-slate-200 shadow-sm"
              >
                <Box className="font-semibold text-slate-900 min-w-[200px]">{name}</Box>
                <Box className="text-sm font-medium text-blue-600">{regulator}</Box>
                <Box className="text-sm text-slate-600 flex-1">{note}</Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Path to Compliance Section */}
        <Box className="mb-20">
          <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">Your Path to Licensing Compliance</h2>
          <Box className="flex flex-wrap gap-4 justify-center">
            {[
              {
                step: "Step 1",
                title: "Diagnostic Exam",
                desc: "Identify if you are currently hitting the Level 7 benchmark.",
                icon: <TrackChanges className="w-6 h-6" />
              },
              {
                step: "Step 2",
                title: "Targeted Practice",
                desc: "Focus on 'Reading for Viewpoints' or 'Speaking Task 6'—areas where most candidates lose points.",
                icon: <CheckCircle className="w-6 h-6" />
              },
              {
                step: "Step 3",
                title: "AI Feedback Loop",
                desc: "Use our AI scoring to refine your vocabulary and structure.",
                icon: <TrendingUp className="w-6 h-6" />
              },
              {
                step: "Step 4",
                title: "Official Test Success",
                desc: "Walk into the CELPIP center with the confidence of someone who has already passed 60 simulations.",
                icon: <VerifiedUser className="w-6 h-6" />
              }
            ].map((item, index) => (
              <Box key={index} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors min-w-[220px] flex-1 max-w-[280px]">
                <Box className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {item.icon}
                </Box>
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 block">{item.step}</span>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Testimonial Section */}
        <Box className="mb-20 bg-blue-50 rounded-2xl p-8 md:p-12 relative overflow-hidden">
          <Box className="absolute top-6 left-8 text-blue-200 transform -translate-x-4 -translate-y-4">
            <svg width="100" height="100" viewBox="0 0 24 24" fill="currentColor" className="opacity-50">
              <path d="M14.017 21L14.017 18C14.017 16.096 15.106 14.542 16.892 13.573L17.489 13.25L17.489 19.25L21.489 19.25L21.489 8.25L11.489 8.25L11.489 21L14.017 21ZM5.01697 21L5.01697 18C5.01697 16.096 6.10597 14.542 7.89197 13.573L8.48897 13.25L8.48897 19.25L12.489 19.25L12.489 8.25L2.48897 8.25L2.48897 21L5.01697 21Z" />
            </svg>
          </Box>
          <Box className="relative z-10 max-w-3xl mx-auto text-center">
            <Box className="flex justify-center gap-1 mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </Box>
            <blockquote className="text-xl md:text-2xl font-medium text-slate-900 mb-6 leading-relaxed">
              "I was terrified of the English requirement after being out of school for 15 years. This platform gave me the exact simulation I needed to hit Level 8 across the board. I'm now licensed and working in Vancouver!"
            </blockquote>
            <cite className="flex items-center justify-center gap-3 not-italic">
              <Box className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold">DS</Box>
              <Box className="text-left">
                <span className="block font-bold text-slate-900">David S.</span>
                <span className="block text-sm text-slate-600">Licensed Realtor</span>
              </Box>
            </cite>
          </Box>
        </Box>

        {/* Final CTA Section */}
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-blue-500 via-slate-900 to-slate-900" />

          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start your new career?</h2>
            <p className="text-lg text-slate-300 mb-8">
              Join thousands of Canadian real estate professionals who used <strong>celpippracticetest.com</strong> to clear their final hurdle.
            </p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white border-0 h-12 px-8">
                  Explore Professional Pricing Plans
                </Button>
              </Link>
              <Link href="/exam-overview">
                <Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-slate-600 hover:bg-slate-800 hover:text-white h-12 px-8">
                  Access Free Prep Resources
                </Button>
              </Link>
            </Box>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}

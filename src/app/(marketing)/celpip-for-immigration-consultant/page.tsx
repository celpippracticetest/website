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
import Policy from "@mui/icons-material/Policy";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Description from "@mui/icons-material/Description";
import AccountBalance from "@mui/icons-material/AccountBalance";
import MenuBook from "@mui/icons-material/MenuBook";

export const metadata: Metadata = {
  title: "CELPIP for Immigration Consultants: RCIC & CICC Language Requirements",
  description:
    "Meet RCIC and CICC English requirements with CELPIP. Achieve CLB 9 for immigration consultant licensing. AI practice for Writing & Speaking—trusted by aspiring consultants.",
  keywords: [
    "CELPIP for immigration consultants",
    "RCIC English requirements",
    "CICC language proficiency",
    "CELPIP CLB 9",
    "immigration consultant license Canada",
    "CELPIP for RCIC",
  ],
  openGraph: {
    title: "CELPIP for Immigration Consultants: RCIC & CICC Language Requirements",
    description:
      "Achieve CLB 9 with CELPIP practice. Meet RCIC and CICC language requirements for immigration consultant licensing. Instant AI feedback on Writing & Speaking.",
    type: "article",
  },
  alternates: {
    canonical: "https://celpippracticetest.com/celpip-for-immigration-consultant",
  },
};

export default function CelpipForImmigrationConsultantPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What CELPIP score do immigration consultants need?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "To become a licensed immigration consultant (RCIC) in Canada, you typically need a minimum of CLB 9 (CELPIP Level 9) in all four skills: Listening, Reading, Writing, and Speaking. CICC and provincial bodies set these requirements.",
        },
      },
      {
        "@type": "Question",
        name: "Is CELPIP accepted for RCIC licensing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. CELPIP-General is accepted by the College of Immigration and Citizenship Consultants (CICC) and relevant bodies for proof of English language proficiency when applying to become a Regulated Canadian Immigration Consultant (RCIC).",
        },
      },
      {
        "@type": "Question",
        name: "How can I get CLB 9 in CELPIP Writing?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Our platform provides full CELPIP Writing practice with instant AI scoring and detailed feedback on structure, coherence, and vocabulary—aligned to CLB levels. Practice repeatedly until you consistently hit the level required for RCIC.",
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
          <Box className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-sm font-medium mb-6">
            <AccountBalance className="w-4 h-4" />
            <span>Trusted by Aspiring RCICs & Immigration Professionals</span>
          </Box>

          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            CELPIP for Immigration Consultants: <br className="hidden md:block" />
            <span className="text-purple-600">Meet RCIC & CICC Requirements</span>
          </h1>

          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Becoming a Regulated Canadian Immigration Consultant (RCIC) requires <span className="font-semibold text-slate-900">CLB 9</span> in all four skills. Get the CELPIP scores you need with practice tests and instant AI feedback on Writing and Speaking—so you can clear the language bar and focus on your career.
          </p>

          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-purple-600/20 hover:shadow-xl hover:translate-y-[-2px] transition-all bg-purple-600 hover:bg-purple-700">
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
        {/* Why Immigration Consultants Choose Us */}
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Future RCICs Use Our CELPIP Prep</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              RCIC and CICC requirements demand a high standard of English—CLB 9 across all skills. We give you targeted practice and instant feedback so you can reach that bar with confidence.
            </p>
          </Box>

          <Box className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-purple-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4 text-purple-600">
                  <Description className="w-6 h-6" />
                </Box>
                <CardTitle>Writing & Speaking at CLB 9</CardTitle>
                <CardDescription>RCIC & CICC Requirements</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  Licensing bodies require <strong>CLB 9 (CELPIP Level 9)</strong> in Listening, Reading, Writing, and Speaking.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1">
                      <Warning className="w-4 h-4" /> The Bar
                    </Box>
                    <p className="text-red-600 text-xs">Writing and Speaking at CLB 9 demand strong structure, vocabulary, and clarity—generic prep often isn't enough.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">AI scoring and feedback calibrated to CLB levels so you know when you're ready for the real exam.</p>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-slate-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
                  <Policy className="w-6 h-6" />
                </Box>
                <CardTitle>Full CELPIP-General Prep</CardTitle>
                <CardDescription>All Four Skills</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">
                  You need strong scores in <strong>all four</strong> components—no section can be weak.
                </p>
                <Box className="space-y-3">
                  <Box className="bg-amber-50 p-3 rounded-md border border-amber-100">
                    <Box className="flex gap-2 text-amber-700 text-sm font-semibold mb-1">
                      <MenuBook className="w-4 h-4" /> The Requirement
                    </Box>
                    <p className="text-amber-700 text-xs">Listening and Reading matter as much as Writing and Speaking for RCIC eligibility.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1">
                      <CheckCircle className="w-4 h-4" /> Our Solution
                    </Box>
                    <p className="text-green-600 text-xs">60+ mock exams and task-specific practice so you can strengthen every skill to CLB 9.</p>
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
              <h2 className="text-3xl font-bold text-slate-900">Why Immigration Consultants Choose Us</h2>
              <p className="text-slate-600 mt-2">Built for the high standard your career demands.</p>
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
                      <Box className="p-2 rounded bg-purple-100 text-purple-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Writing & Speaking AI Feedback
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Get instant scores and CLB-aligned feedback so you know exactly when you're at the level required for RCIC.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-purple-100 text-purple-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      60 Full-Length Mock Exams
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Practice in real exam conditions until you consistently perform at the level you need.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-purple-100 text-purple-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Task-Specific Practice
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Focus on Writing tasks, Speaking, or weaker sections without wasting time on what you've already mastered.</TableCell>
                </TableRow>
                <TableRow className="hover:bg-slate-50/50">
                  <TableCell className="font-medium pl-6 py-4">
                    <Box className="flex items-center gap-3">
                      <Box className="p-2 rounded bg-purple-100 text-purple-600">
                        <CheckCircle className="w-4 h-4" />
                      </Box>
                      Study on Your Schedule
                    </Box>
                  </TableCell>
                  <TableCell className="py-4 text-slate-600">Access full practice from any device so you can prepare alongside work or other commitments.</TableCell>
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
              <AccordionTrigger className="text-left">What CELPIP score do immigration consultants need?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                To become a Regulated Canadian Immigration Consultant (RCIC), you typically need a minimum of CLB 9 (CELPIP Level 9) in all four components: Listening, Reading, Writing, and Speaking. The College of Immigration and Citizenship Consultants (CICC) and related bodies set these requirements—always confirm the current standard on their official site.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">Is CELPIP accepted for RCIC licensing?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Yes. CELPIP-General is accepted by the College of Immigration and Citizenship Consultants (CICC) as proof of English language proficiency when applying to become an RCIC. You will need to meet the minimum score (typically CLB 9 in each skill) and submit results as per CICC guidelines.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">How can I get CLB 9 in CELPIP Writing?</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">
                Our platform provides full CELPIP Writing practice with instant AI scoring and detailed feedback on structure, coherence, vocabulary, and grammar—aligned to Canadian Language Benchmark levels. You can repeat tasks and track progress until you consistently achieve the level required for RCIC eligibility.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Box>

        {/* Final CTA Section */}
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-purple-500 via-slate-900 to-slate-900" />

          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Meet Your RCIC Language Requirements?</h2>
            <p className="text-lg text-slate-300 mb-8">
              Join aspiring immigration consultants who use our CELPIP practice to achieve CLB 9. Start with a free sample test or choose a plan that fits your timeline.
            </p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button size="lg" className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white border-0 h-12 px-8">
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

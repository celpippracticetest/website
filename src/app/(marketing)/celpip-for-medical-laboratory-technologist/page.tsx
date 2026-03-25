import { Metadata } from "next";
import { Box } from "@/components/ui/Box";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import CheckCircle from "@mui/icons-material/CheckCircle";
import Warning from "@mui/icons-material/Warning";
import Science from "@mui/icons-material/Science";
import ArrowForward from "@mui/icons-material/ArrowForward";
import Description from "@mui/icons-material/Description";
import MenuBook from "@mui/icons-material/MenuBook";

export const metadata: Metadata = {
  title: "CELPIP for Medical Laboratory Technologist: MLT Licensing in Canada",
  description: "CELPIP prep for MLT licensing. Meet CSMLS and provincial language requirements (Level 7+) with AI practice tests and instant feedback.",
  keywords: ["CELPIP for MLT", "medical lab technologist Canada", "CSMLS English requirements"],
  openGraph: { title: "CELPIP for Medical Laboratory Technologist: MLT Licensing in Canada", description: "Meet MLT language requirements with CELPIP practice.", type: "article" },
  alternates: { canonical: "https://celpippracticetest.com/celpip-for-medical-laboratory-technologist" },
};

export default function CelpipForMedicalLaboratoryTechnologistPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What CELPIP score do MLTs need in Canada?", acceptedAnswer: { "@type": "Answer", text: "CSMLS and provincial bodies typically require Level 7 (CLB 7) or higher in all four skills for MLT certification. Confirm with CSMLS and your province." } },
      { "@type": "Question", name: "Is CELPIP accepted for MLT certification?", acceptedAnswer: { "@type": "Answer", text: "Yes. CELPIP-General is accepted by CSMLS and provincial regulators as proof of English language proficiency for MLT certification in Canada." } },
      { "@type": "Question", name: "How can I practice CELPIP for MLT registration?", acceptedAnswer: { "@type": "Answer", text: "Our platform offers full CELPIP practice with instant AI feedback on all four skills so you can meet the language requirement for MLT licensing." } },
    ],
  };

  return (
    <Box className="min-h-screen bg-slate-50">
      <JsonLd data={faqData} />
      <Box className="bg-white border-b border-slate-200">
        <Box className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
          <Box className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-sm font-medium mb-6">
            <Science className="w-4 h-4" />
            <span>Trusted by MLTs</span>
          </Box>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 text-slate-900 tracking-tight leading-[1.1]">
            CELPIP for Medical Laboratory Technologist: <br className="hidden md:block" />
            <span className="text-cyan-600">Meet MLT Licensing Requirements</span>
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            MLT certification in Canada often requires Level 7+ in all four skills. Get the CELPIP scores you need with practice tests and instant AI feedback.
          </p>
          <Box className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/exam-overview">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full shadow-lg shadow-cyan-600/20 hover:shadow-xl bg-cyan-600 hover:bg-cyan-700">
                Start Free Practice Test <ArrowForward className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4 sm:mt-0">No credit card required</p>
          </Box>
        </Box>
      </Box>
      <Box className="max-w-6xl mx-auto px-4 py-16">
        <Box className="mb-20">
          <Box className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why MLTs Use Our CELPIP Prep</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">CSMLS and provincial regulators demand strong English. We give you targeted practice and instant feedback.</p>
          </Box>
          <Box className="flex flex-col md:flex-row gap-6">
            <Card className="flex-1 hover:shadow-md transition-shadow border-t-4 border-t-cyan-500">
              <CardHeader>
                <Box className="w-12 h-12 rounded-lg bg-cyan-100 flex items-center justify-center mb-4 text-cyan-600"><Description className="w-6 h-6" /></Box>
                <CardTitle>Writing and Speaking at Level 7+</CardTitle>
                <CardDescription>CSMLS and Provincial Regulators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-slate-700 text-sm">Many regulators require Level 7 in all four skills.</p>
                <Box className="space-y-3">
                  <Box className="bg-red-50 p-3 rounded-md border border-red-100">
                    <Box className="flex gap-2 text-red-700 text-sm font-semibold mb-1"><Warning className="w-4 h-4" /> The Challenge</Box>
                    <p className="text-red-600 text-xs">Clear communication is essential for reporting and teamwork.</p>
                  </Box>
                  <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                    <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle className="w-4 h-4" /> Our Solution</Box>
                    <p className="text-green-600 text-xs">AI feedback so you know when you are ready for the exam.</p>
                  </Box>
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
                <Box className="bg-green-50 p-3 rounded-md border border-green-100">
                  <Box className="flex gap-2 text-green-700 text-sm font-semibold mb-1"><CheckCircle className="w-4 h-4" /> Our Solution</Box>
                  <p className="text-green-600 text-xs">60+ mock exams and task-specific practice.</p>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
        <Box className="mb-20">
          <Box className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <Box><h2 className="text-3xl font-bold text-slate-900">Why MLTs Choose Us</h2><p className="text-slate-600 mt-2">Built for lab professionals.</p></Box>
            <Link href="/exam-overview"><Button variant="outline">View All Features</Button></Link>
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
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className="p-2 rounded bg-cyan-100 text-cyan-600"><CheckCircle className="w-4 h-4" /></Box>Writing and Speaking AI Feedback</Box></TableCell><TableCell className="py-4 text-slate-600">Instant scores and feedback.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className="p-2 rounded bg-cyan-100 text-cyan-600"><CheckCircle className="w-4 h-4" /></Box>60 Full-Length Mock Exams</Box></TableCell><TableCell className="py-4 text-slate-600">Practice in exam conditions.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className="p-2 rounded bg-cyan-100 text-cyan-600"><CheckCircle className="w-4 h-4" /></Box>Task-Specific Practice</Box></TableCell><TableCell className="py-4 text-slate-600">Focus on weaker sections.</TableCell></TableRow>
                <TableRow className="hover:bg-slate-50/50"><TableCell className="font-medium pl-6 py-4"><Box className="flex items-center gap-3"><Box className="p-2 rounded bg-cyan-100 text-cyan-600"><CheckCircle className="w-4 h-4" /></Box>Study on Your Schedule</Box></TableCell><TableCell className="py-4 text-slate-600">Access from any device.</TableCell></TableRow>
              </TableBody>
            </Table>
          </Card>
        </Box>
        <Box className="max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl font-bold mb-8 text-center text-slate-900">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1"><AccordionTrigger className="text-left">What CELPIP score do MLTs need in Canada?</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">CSMLS and provincial bodies typically require Level 7 (CLB 7) or higher in all four skills. Confirm with CSMLS and your province.</AccordionContent></AccordionItem>
            <AccordionItem value="item-2"><AccordionTrigger className="text-left">Is CELPIP accepted for MLT certification?</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">Yes. CELPIP-General is accepted by CSMLS and provincial regulators as proof of English proficiency for MLT certification.</AccordionContent></AccordionItem>
            <AccordionItem value="item-3"><AccordionTrigger className="text-left">How can I practice CELPIP for MLT registration?</AccordionTrigger><AccordionContent className="text-slate-600 leading-relaxed">Our platform provides full CELPIP practice with instant AI scoring and feedback on all four skills for MLT licensing.</AccordionContent></AccordionItem>
          </Accordion>
        </Box>
        <Box className="relative overflow-hidden bg-slate-900 text-white rounded-3xl p-8 md:p-12 text-center">
          <Box className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-cyan-500 via-slate-900 to-slate-900" />
          <Box className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Meet Your MLT Licensing Requirements?</h2>
            <p className="text-lg text-slate-300 mb-8">Start with a free sample test or choose a plan.</p>
            <Box className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing"><Button size="lg" className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700 text-white border-0 h-12 px-8">View Pricing and Plans</Button></Link>
              <Link href="/exam-overview"><Button size="lg" variant="outline" className="w-full sm:w-auto bg-transparent text-white border-slate-600 hover:bg-slate-800 h-12 px-8">Try a Free Sample Test</Button></Link>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

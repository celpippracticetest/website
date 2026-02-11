import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Retaking CELPIP? Waiting Period, Re-evaluation & Success Strategy',
  description: 'Failed CELPIP Writing? Wondering how soon you can retake the test? Learn about the 4-day waiting period, re-evaluation success rates, and our score improvement plan.',
  keywords: ['CELPIP re-evaluation success rate', 'how soon can I retake CELPIP', 'failed CELPIP writing', 'celpip retake policy', 'celpip remarking'],
  openGraph: {
    title: 'Retaking CELPIP? Waiting Period, Re-evaluation & Success Strategy',
    description: 'Failed CELPIP Writing? Wondering how soon you can retake the test? Learn about the 4-day waiting period, re-evaluation success rates, and our score improvement plan.',
    type: 'article',
  },
};

export default function RetakePage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "How soon can I retake the CELPIP test?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You must wait at least 4 calendar days after your test date before you can register for another CELPIP test sitting."
      }
    }, {
      "@type": "Question",
      "name": "Is it worth applying for a re-evaluation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If you are only 1 point away from your target score in Speaking or Writing, a re-evaluation might be worth it. However, success rates vary, and fees apply (which are refunded if your score changes)."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Retaking CELPIP: Your Roadmap to Success</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Did you fall short of your target score? You are not alone. Many candidates need more than one attempt to achieve a CLB 9 or higher. The key is to analyze what went wrong and adjust your strategy.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Retake Policy Rules</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Waiting Period:</strong> You cannot register for a test session that is within 4 calendar days of your last test.</li>
            <li><strong>No Limits:</strong> There is no limit on the total number of times you can take the test.</li>
            <li><strong>Registration:</strong> Slots fill up fast, so book in advance once your waiting period is over.</li>
          </ul>
        </Box>

        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Re-evaluation (Remarking)</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Timing:</strong> Must apply within 6 months of the test date.</li>
            <li><strong>Components:</strong> Only Speaking and Writing can be re-evaluated.</li>
            <li><strong>Cost:</strong> There is a fee, but it is refunded if your score increases.</li>
            <li><strong>Success Rate:</strong> Variable. Best for borderline cases (e.g., scoring 8 when you need 9).</li>
          </ul>
        </Box>
      </Box>

      <Box className="bg-indigo-50 p-8 rounded-lg border border-indigo-200 mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2 text-slate-900">Score Improvement Plan</h2>
        <p className="text-slate-700 mb-6 max-w-2xl mx-auto">
          Don't just retake the test without changing your preparation. Our AI-powered practice tests identify your specific weaknesses so you can fix them before your next attempt.
        </p>
        <Link href="/exam-overview">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full text-lg">
            Start Your Improvement Plan
          </Button>
        </Link>
      </Box>
    </Box>
  );
}

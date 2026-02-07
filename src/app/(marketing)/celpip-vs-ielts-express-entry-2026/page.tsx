import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'CELPIP vs IELTS for Express Entry 2026 | CLB Score Conversion',
  description: 'Compare CELPIP and IELTS for Canada Express Entry in 2026. See CLB score conversions and why CELPIP might be easier (Spell Checker!).',
  keywords: ['CELPIP vs IELTS 2026', 'Express Entry english test', 'CLB converter', 'is celpip easier than ielts', 'celpip writing spell check'],
  openGraph: {
    title: 'CELPIP vs IELTS for Express Entry 2026 | CLB Score Conversion',
    description: 'Compare CELPIP and IELTS for Canada Express Entry in 2026. See CLB score conversions and why CELPIP might be easier (Spell Checker!).',
    type: 'article',
  },
};

export default function CelpipVsIeltsPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Is CELPIP easier than IELTS for Express Entry?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Many candidates find CELPIP easier because it is fully computer-based, uses Canadian English, and includes a spell-checker for the writing component."
      }
    }, {
      "@type": "Question",
      "name": "Does CELPIP Writing have a spell checker?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes! Unlike IELTS, the CELPIP Writing test provides an integrated spell-checker, which can be a significant advantage for candidates."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">CELPIP vs. IELTS for Express Entry 2026</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Choosing between CELPIP and IELTS is a critical decision for your Canadian Permanent Residency (PR) application. Both are accepted by IRCC, but they have distinct differences that can affect your score.
        </p>
      </Box>

      <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Why Choose CELPIP?</h2>
        <ul className="list-disc pl-6 space-y-2 text-slate-700">
          <li><strong>Integrated Spell Checker:</strong> A huge advantage in the Writing section. IELTS does not offer this.</li>
          <li><strong>Canadian Accent:</strong> The Listening section features standard Canadian English, which may be easier to understand for those living in Canada.</li>
          <li><strong>Single Sitting:</strong> The entire test (Listening, Reading, Writing, Speaking) is done in one 3-hour sitting. No separate speaking appointment.</li>
        </ul>
      </Box>

      <Box className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">CLB Score Conversion Table</h2>
        <Box className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-700 border-collapse border border-slate-300">
            <thead className="bg-slate-100 text-slate-900 font-semibold">
              <tr>
                <th className="px-4 py-2 border border-slate-300">CLB Level</th>
                <th className="px-4 py-2 border border-slate-300">CELPIP Score</th>
                <th className="px-4 py-2 border border-slate-300">IELTS (General) Listening</th>
                <th className="px-4 py-2 border border-slate-300">Reading</th>
                <th className="px-4 py-2 border border-slate-300">Writing</th>
                <th className="px-4 py-2 border border-slate-300">Speaking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-2 border border-slate-300 font-bold">10</td>
                <td className="px-4 py-2 border border-slate-300">10</td>
                <td className="px-4 py-2 border border-slate-300">8.5</td>
                <td className="px-4 py-2 border border-slate-300">8.0</td>
                <td className="px-4 py-2 border border-slate-300">7.5</td>
                <td className="px-4 py-2 border border-slate-300">7.5</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border border-slate-300 font-bold">9</td>
                <td className="px-4 py-2 border border-slate-300">9</td>
                <td className="px-4 py-2 border border-slate-300">8.0</td>
                <td className="px-4 py-2 border border-slate-300">7.0</td>
                <td className="px-4 py-2 border border-slate-300">7.0</td>
                <td className="px-4 py-2 border border-slate-300">7.0</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border border-slate-300 font-bold">8</td>
                <td className="px-4 py-2 border border-slate-300">8</td>
                <td className="px-4 py-2 border border-slate-300">7.5</td>
                <td className="px-4 py-2 border border-slate-300">6.5</td>
                <td className="px-4 py-2 border border-slate-300">6.5</td>
                <td className="px-4 py-2 border border-slate-300">6.5</td>
              </tr>
              <tr>
                <td className="px-4 py-2 border border-slate-300 font-bold">7</td>
                <td className="px-4 py-2 border border-slate-300">7</td>
                <td className="px-4 py-2 border border-slate-300">6.0</td>
                <td className="px-4 py-2 border border-slate-300">6.0</td>
                <td className="px-4 py-2 border border-slate-300">6.0</td>
                <td className="px-4 py-2 border border-slate-300">6.0</td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

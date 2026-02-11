import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'CELPIP Practice Test Vancouver | Test Centers & Local Classes',
  description: 'Prepare for CELPIP in Vancouver, BC. Find test centers, local tips for real estate agents and tech workers, and online practice resources.',
  keywords: ['CELPIP practice Vancouver', 'CELPIP test centers Vancouver', 'english test for real estate bc', 'celpip preparation vancouver'],
  openGraph: {
    title: 'CELPIP Practice Test Vancouver | Test Centers & Local Classes',
    description: 'Prepare for CELPIP in Vancouver, BC. Find test centers, local tips for real estate agents and tech workers, and online practice resources.',
    type: 'article',
  },
};

export default function VancouverPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Where can I take the CELPIP test in Vancouver?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "There are multiple test centers in Vancouver, including locations at Ashton College, Simon Fraser University, and various other language centers in Burnaby, Surrey, and Richmond."
      }
    }, {
      "@type": "Question",
      "name": "Is CELPIP popular in Vancouver?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, as the test is Canadian, it is widely used in Vancouver for PR applications and professional licensing (like Real Estate Council of BC)."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">CELPIP Practice & Preparation in Vancouver</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Vancouver is a hub for new immigrants and professionals. Whether you are aiming for Permanent Residency or need your Real Estate License from the BCFSA, achieving a high CELPIP score is essential.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Popular Test Centers</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Ashton College:</strong> 1190 Melville St, Vancouver</li>
            <li><strong>ELS Language Centers:</strong> 549 Howe St, Vancouver</li>
            <li><strong>Mosaic:</strong> 5575 Boundary Rd, Vancouver</li>
            <li><strong>Kwantlen Polytechnic (Surrey):</strong> 12666 72 Ave, Surrey</li>
          </ul>
        </Box>

        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Local Tips</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Traffic:</strong> Allow extra time for transit or parking, especially for downtown centers.</li>
            <li><strong>Noise:</strong> Some centers can be busy. Practice in a slightly noisy environment (like a coffee shop) to simulate test day.</li>
            <li><strong>Time Zone:</strong> Pacific Time (PST/PDT).</li>
          </ul>
        </Box>
      </Box>
    </Box>
  );
}

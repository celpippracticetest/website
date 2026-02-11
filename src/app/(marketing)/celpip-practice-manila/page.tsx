import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'CELPIP Practice Test Manila | Philippines Test Centers',
  description: 'Taking the CELPIP test in Manila? Find test centers, compare with IELTS for Filipino nurses, and access online practice tailored for Philippines time zone.',
  keywords: ['CELPIP Manila', 'CELPIP Philippines', 'celpip for filipino nurses', 'celpip review center manila'],
  openGraph: {
    title: 'CELPIP Practice Test Manila | Philippines Test Centers',
    description: 'Taking the CELPIP test in Manila? Find test centers, compare with IELTS for Filipino nurses, and access online practice tailored for Philippines time zone.',
    type: 'article',
  },
};

export default function ManilaPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Where is the CELPIP test center in Manila?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The test is often administered at locations like the Pearson Professional Centers in Makati City or other authorized venues. Always check your registration confirmation."
      }
    }, {
      "@type": "Question",
      "name": "Is CELPIP accepted for Filipino Nurses in Canada?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, CELPIP is accepted by Canadian nursing regulatory bodies. Many Filipino nurses find the computer-based format and Canadian accent easier to manage than IELTS."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">CELPIP Review & Practice in Manila</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Mabuhay! If you are planning to move to Canada from the Philippines, the CELPIP test is a popular choice. We provide online resources accessible from Manila to help you succeed.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Success Stories</h2>
          <blockquote className="italic text-slate-600 mb-4 border-l-4 border-blue-500 pl-4">
            "I took IELTS three times and couldn't get the writing score. I tried CELPIP and passed on my first try! The spell checker saved me."
            <footer className="text-sm font-bold mt-2">- Maria, Registered Nurse (now in Toronto)</footer>
          </blockquote>
        </Box>

        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Why Online Practice?</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Time Difference:</strong> Our platform is available 24/7, so you can practice late at night or early morning in Manila time.</li>
            <li><strong>No Commute:</strong> Save time avoiding Manila traffic by studying from home.</li>
            <li><strong>Affordable:</strong> Online practice is often more cost-effective than expensive review centers.</li>
          </ul>
        </Box>
      </Box>
    </Box>
  );
}

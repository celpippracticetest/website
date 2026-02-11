import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'CELPIP Practice Test Dubai | UAE Test Centers',
  description: 'Taking the CELPIP test in Dubai? Find test dates, locations, and preparation tips specifically for candidates in the UAE.',
  keywords: ['CELPIP Dubai', 'CELPIP test dates UAE', 'celpip practice test dubai', 'canada immigration dubai'],
  openGraph: {
    title: 'CELPIP Practice Test Dubai | UAE Test Centers',
    description: 'Taking the CELPIP test in Dubai? Find test dates, locations, and preparation tips specifically for candidates in the UAE.',
    type: 'article',
  },
};

export default function DubaiPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Where can I take CELPIP in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The main test center in Dubai is often located at the Canadian University Dubai or other partner institutions. Check the official CELPIP website for the most current venue."
      }
    }, {
      "@type": "Question",
      "name": "How often are tests held in Dubai?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Test dates in Dubai can fill up quickly due to high demand for Canadian immigration. It is recommended to book 2-3 months in advance."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">CELPIP Preparation in Dubai, UAE</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          For many residents in Dubai and the UAE, the CELPIP test is the gateway to Canadian Permanent Residency. Understanding the local testing environment can give you an edge.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Why Online Practice is Crucial</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Limited Local Classes:</strong> While there are coaching centers, high-quality specific CELPIP instruction can be harder to find than IELTS.</li>
            <li><strong>Flexibility:</strong> Study around your work schedule with our 24/7 accessible platform.</li>
            <li><strong>Immediate Feedback:</strong> Don't wait for a tutor to grade your writing. Get instant AI feedback.</li>
          </ul>
        </Box>

        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Test Day Tips for UAE</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>ID Documents:</strong> Ensure you bring the exact ID you used for registration (Passport).</li>
            <li><strong>Air Conditioning:</strong> Exam centers in Dubai can be quite cold due to AC. Bring a light jacket or sweater.</li>
            <li><strong>Arrive Early:</strong> Dubai traffic can be unpredictable. Plan to arrive at least 45 minutes before your slot.</li>
          </ul>
        </Box>
      </Box>
    </Box>
  );
}

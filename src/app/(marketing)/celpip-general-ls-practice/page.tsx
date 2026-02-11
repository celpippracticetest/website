"use client";

import React, { useState } from 'react';
import { Box } from '@/components/ui/Box';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';
import Link from 'next/link';
import SvgArrowRight from '@/components/icons/ArrowRight';

export default function CelpipGeneralLSPage() {
  const [citizenshipStatus, setCitizenshipStatus] = useState<string>('');
  const [isEligible, setIsEligible] = useState<boolean | null>(null);

  const checkEligibility = () => {
    // Basic logic for demonstration: Application for citizenship usually requires LS
    if (citizenshipStatus === 'applying_citizenship') {
      setIsEligible(true);
    } else {
      setIsEligible(false);
    }
  };

  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is the difference between CELPIP-General and CELPIP-General LS?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The CELPIP-General Test assesses all four skills (Listening, Reading, Writing, Speaking) and is for PR applications. The CELPIP-General LS Test assesses only Listening and Speaking and is primarily for Canadian Citizenship applications."
      }
    }, {
      "@type": "Question",
      "name": "Do I need Reading and Writing for Canadian Citizenship?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, for Canadian Citizenship, you typically only need to prove your Listening and Speaking proficiency, which is why the CELPIP-General LS test is accepted."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">CELPIP General LS Practice</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          The CELPIP-General LS test focuses exclusively on <strong>Listening</strong> and <strong>Speaking</strong> skills. It is officially accepted by Immigration, Refugees and Citizenship Canada (IRCC) for <strong>Canadian Citizenship applications</strong>.
        </p>
      </Box>

      <Box className="bg-slate-50 p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Citizenship Eligibility Calculator</h2>
        <p className="text-slate-700 mb-4">Unsure if you need the General or General LS test? (Simplified Check)</p>

        <Box className="flex flex-col gap-4 mb-4">
          <label className="flex flex-col gap-2">
            <span className="text-slate-700 font-medium">What is your primary goal?</span>
            <select
              className="p-2 border rounded-md"
              value={citizenshipStatus}
              onChange={(e) => {
                setCitizenshipStatus(e.target.value);
                setIsEligible(null);
              }}
            >
              <option value="">Select an option</option>
              <option value="applying_citizenship">Applying for Canadian Citizenship</option>
              <option value="applying_pr">Applying for Permanent Residence (PR)</option>
              <option value="professional_license">Professional Licensing (Real Estate, Nursing, etc.)</option>
            </select>
          </label>

          <Button onClick={checkEligibility} className="self-start">Check Eligibility</Button>
        </Box>

        {isEligible === true && (
          <Box className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800">
            <p className="font-semibold">You likely need the CELPIP-General LS Test.</p>
            <p>You do NOT need Reading or Writing sections.</p>
            <Link href="/exam-overview" className="text-blue-600 font-semibold flex items-center gap-2 mt-2 hover:underline">
              Start Listening & Speaking Practice <SvgArrowRight />
            </Link>
          </Box>
        )}

        {isEligible === false && (
          <Box className="p-4 bg-blue-50 border border-blue-200 rounded-md text-blue-800">
            <p className="font-semibold">You likely need the CELPIP-General Test.</p>
            <p>This includes Listening, Reading, Writing, and Speaking.</p>
            <Link href="/exam-overview" className="text-blue-600 font-semibold flex items-center gap-2 mt-2 hover:underline">
              Start Full Practice <SvgArrowRight />
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  );
}

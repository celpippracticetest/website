import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Mastering CELPIP Reading Task 4: Viewpoints Guide & Practice',
  description: 'Struggling with CELPIP Reading for Viewpoints? Download our free PDF guide and checklist. Learn the difference between main ideas and viewpoints.',
  keywords: ['CELPIP reading task 4 tips', 'reading for viewpoints practice', 'CELPIP viewpoints vs main idea', 'celpip reading strategies'],
  openGraph: {
    title: 'Mastering CELPIP Reading Task 4: Viewpoints Guide & Practice',
    description: 'Struggling with CELPIP Reading for Viewpoints? Download our free PDF guide and checklist. Learn the difference between main ideas and viewpoints.',
    type: 'article',
  },
};

export default function ReadingTask4Page() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What is CELPIP Reading Task 4?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Reading Task 4 is 'Reading for Viewpoints'. You read an online article and answer questions that require you to identify the writer's opinion or the viewpoints of others mentioned in the text."
      }
    }, {
      "@type": "Question",
      "name": "How is 'Reading for Viewpoints' different from other tasks?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Unlike other tasks that focus on factual information, Task 4 requires you to infer opinions, attitudes, and implicit meanings from the text."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Mastering Reading Task 4: The Viewpoints Guide</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Reading Task 4, "Reading for Viewpoints," is often cited as the most difficult part of the CELPIP Reading test. It requires you to distinguish between facts and opinions, and to understand the subtle viewpoints of different characters or the author.
        </p>
      </Box>

      <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Key Strategies for Success</h2>
        <ul className="list-disc pl-6 space-y-4 text-slate-700">
          <li>
            <strong>Identify the Tone:</strong> Is the writer critical, supportive, neutral, or sarcastic? Look for adjectives and adverbs that betray emotion.
          </li>
          <li>
            <strong>Contrast Words:</strong> Pay attention to words like "however," "although," "despite." These often signal a shift in viewpoint or a counter-argument.
          </li>
          <li>
            <strong>Scan for Names:</strong> Questions often ask about a specific person's opinion. Quickly find their name in the text and read the surrounding sentences carefully.
          </li>
        </ul>
      </Box>

      <Box className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8 text-center">
        <h2 className="text-xl font-bold mb-2 text-slate-900">Free Download: The Viewpoints Checklist</h2>
        <p className="text-slate-700 mb-4">
          Get our exclusive PDF checklist with key vocabulary words that signal opinions and a step-by-step method for analyzing Viewpoints passages.
        </p>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full">
          Download PDF Guide
        </Button>
      </Box>

      <Box className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">Practice Makes Perfect</h2>
        <p className="text-slate-700">
          The best way to master this task is to read opinion pieces in newspapers (editorials) and practice with our realistic mock tests.
        </p>
      </Box>
    </Box>
  );
}

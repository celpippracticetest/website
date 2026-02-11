import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { Button } from '@/components/ui/button';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'CELPIP Vocabulary PDF Download | Words for CLB 9+',
  description: 'Boost your CELPIP score with our essential vocabulary list. Download the PDF glossary containing connectors for Writing Task 2 and top adjectives for describing scenes.',
  keywords: ['CELPIP vocabulary pdf', 'words for CLB 9', 'connectors for writing task 2', 'celpip speaking vocabulary', 'celpip adjectives'],
  openGraph: {
    title: 'CELPIP Vocabulary PDF Download | Words for CLB 9+',
    description: 'Boost your CELPIP score with our essential vocabulary list. Download the PDF glossary containing connectors for Writing Task 2 and top adjectives for describing scenes.',
    type: 'article',
  },
};

export default function VocabularyPage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "What vocabulary do I need for CLB 9?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "For CLB 9, you need to use a range of 'precise and effective' vocabulary. This means avoiding common words like 'good' or 'bad' and using more specific terms like 'beneficial,' 'detrimental,' 'breathtaking,' or 'chaotic'."
      }
    }, {
      "@type": "Question",
      "name": "Are transition words important for CELPIP Writing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, transition words (connectors) are crucial for coherence and cohesion. Using words like 'furthermore,' 'consequently,' and 'on the other hand' helps organize your ideas logically."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Essential CELPIP Vocabulary for CLB 9+</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Vocabulary accounts for a significant portion of your score in both Speaking and Writing. Using a varied and precise vocabulary is key to moving from a level 7 to a level 9 or higher.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Writing Task 2 Connectors</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Addition:</strong> Furthermore, Moreover, Additionally</li>
            <li><strong>Contrast:</strong> However, Conversely, On the other hand</li>
            <li><strong>Result:</strong> Consequently, Therefore, As a result</li>
            <li><strong>Example:</strong> For instance, To illustrate, Specifically</li>
          </ul>
        </Box>

        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Describing a Scene (Speaking)</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Atmosphere:</strong> Bustling, Serene, Chaotic, Vibrant</li>
            <li><strong>Position:</strong> In the foreground, To the left, Adjacent to</li>
            <li><strong>People:</strong> Engaged in, Absorbed by, Interacting with</li>
            <li><strong>Weather:</strong> Overcast, Scorching, Blustery, Humid</li>
          </ul>
        </Box>
      </Box>

      <Box className="bg-green-50 p-8 rounded-lg border border-green-200 mb-8 text-center">
        <h2 className="text-2xl font-bold mb-2 text-slate-900">Download the Ultimate Vocabulary Guide</h2>
        <p className="text-slate-700 mb-6 max-w-2xl mx-auto">
          We've compiled a comprehensive list of high-scoring words and phrases organized by task type. Download the free PDF to study on the go.
        </p>
        <Button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full text-lg">
          Download PDF Glossary
        </Button>
      </Box>
    </Box>
  );
}

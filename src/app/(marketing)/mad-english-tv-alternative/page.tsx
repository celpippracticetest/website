import React from 'react';
import { Metadata } from 'next';
import { Box } from '@/components/ui/Box';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Interactive CELPIP Practice vs Mad English TV & HZad Education',
  description: 'Looking for a Mad English TV alternative? Video lectures are great, but practice makes perfect. Try our interactive CELPIP mock tests with AI scoring.',
  keywords: ['Mad English TV alternative', 'HZad Education celpip', 'interactive celpip practice', 'celpip mock test vs videos'],
  openGraph: {
    title: 'Interactive CELPIP Practice vs Mad English TV & HZad Education',
    description: 'Looking for a Mad English TV alternative? Video lectures are great, but practice makes perfect. Try our interactive CELPIP mock tests with AI scoring.',
    type: 'article',
  },
};

export default function AlternativePage() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [{
      "@type": "Question",
      "name": "Is Mad English TV good for CELPIP preparation?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, Mad English TV offers excellent instructional videos. However, passive watching isn't enough. You need active practice with feedback to improve your score."
      }
    }, {
      "@type": "Question",
      "name": "How is this platform different from HZad Education?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We focus on interactive, computer-based mock tests that simulate the real exam environment, providing instant AI scores and feedback, which complements the strategies taught by educators like HZad."
      }
    }]
  };

  return (
    <Box className="max-w-4xl mx-auto px-4 py-8">
      <JsonLd data={faqData} />
      <h1 className="text-3xl font-bold mb-6 text-slate-900">Beyond Video Lectures: Interactive CELPIP Practice</h1>

      <Box className="mb-8">
        <p className="text-lg text-slate-700 mb-4">
          Popular YouTube channels like <strong>Mad English TV</strong> and <strong>HZad Education</strong> are fantastic resources for learning CELPIP strategies and tips. We love their content! However, knowing the strategy is only half the battle.
        </p>
      </Box>

      <Box className="grid md:grid-cols-2 gap-6 mb-8">
        <Box className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Video Lectures (Passive Learning)</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li>Great for understanding the test format.</li>
            <li>Learn high-level strategies and templates.</li>
            <li><strong>Missing:</strong> Real-time feedback on YOUR performance.</li>
            <li><strong>Missing:</strong> Exam pressure simulation.</li>
          </ul>
        </Box>

        <Box className="bg-blue-50 p-6 rounded-lg shadow-sm border border-blue-200">
          <h2 className="text-xl font-bold mb-4 text-slate-800">Our Interactive Platform (Active Learning)</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>Simulated Environment:</strong> Practice with the same timer and interface as the real test.</li>
            <li><strong>AI Scoring:</strong> Get instant estimates for your Speaking and Writing scores.</li>
            <li><strong>Detailed Feedback:</strong> Understand exactly <em>why</em> you got a score and how to improve.</li>
            <li><strong>Apply Strategies:</strong> Put the tips you learned from videos into action.</li>
          </ul>
        </Box>
      </Box>

      <Box className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-800">The Perfect Combination</h2>
        <p className="text-slate-700">
          We recommend a hybrid approach. Watch the expert tutorials on YouTube to grasp the concepts, then come to our platform to <strong>practice, practice, practice</strong>. This combination ensures you aren't just memorizing templates, but actually building the skills needed to score a 9+.
        </p>
      </Box>
    </Box>
  );
}

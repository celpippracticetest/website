export interface InternalLink {
  keyword: string;
  url: string;
  exactMatch?: boolean; // If true, only matches the exact word/phrase (default: true for short words)
}

export const internalLinks: InternalLink[] = [
  // Practice Sections
  { keyword: "Speaking Test", url: "/speaking" },
  { keyword: "Listening Test", url: "/listening" },
  { keyword: "Reading Test", url: "/reading" },
  { keyword: "Writing Test", url: "/writing" },
  
  // General Terms
  { keyword: "CELPIP General", url: "/" },
  { keyword: "Practice Test", url: "/exam-overview" },
  { keyword: "Free Sample Test", url: "/exam-overview" },
  { keyword: "Mock Exam", url: "/exam-overview" },
  { keyword: "CLB 7", url: "/wiki/celpip-exam-overview" },
  { keyword: "CLB 9", url: "/wiki/celpip-exam-overview" },

  // Professions
  { keyword: "Nurse", url: "/celpip-for-nurses", exactMatch: false },
  { keyword: "Physiotherapist", url: "/celpip-for-physiotherapist", exactMatch: false },
  { keyword: "Truck Driver", url: "/celpip-for-commercial-truck-driver", exactMatch: false },
  { keyword: "Pharmacist", url: "/celpip-for-pharmacists", exactMatch: false },
  { keyword: "Dentist", url: "/celpip-for-dentist-dental-hygienist", exactMatch: false },
  { keyword: "Caregiver", url: "/celpip-for-caregiver-home-support", exactMatch: false },
  { keyword: "Social Worker", url: "/celpip-for-social-worker", exactMatch: false },
  
  // Specific Concepts (2026 DEO: high-intent keywords for blog internal linking)
  { keyword: "Speaking Templates", url: "/wiki/celpip-speaking-templates-2025" },
  { keyword: "Writing Templates", url: "/wiki/celpip-writing-task-1-email-template" },
  { keyword: "Vocabulary", url: "/wiki/celpip-speaking-task-1-guide" },
  { keyword: "Vocabulary upgrades", url: "/wiki/celpip-speaking-task-1-guide" },
  { keyword: "CLB 9 Vocabulary", url: "/wiki/celpip-speaking-task-1-guide" },
  { keyword: "CELPIP Speaking Task 1 Template", url: "/wiki/celpip-speaking-task-1-template" },
];

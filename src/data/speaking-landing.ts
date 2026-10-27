/**
 * Copy for the public /speaking landing page (logged-out visitors).
 * Task order, prep and speaking times follow the official CELPIP-General
 * Speaking test (8 scored tasks, about 15-20 minutes).
 */

export type SpeakingTaskInfo = {
  id: string;
  name: string;
  description: string;
  prepSeconds: number;
  speakSeconds: number;
};

export const SPEAKING_TASKS: SpeakingTaskInfo[] = [
  { id: "1", name: "Giving Advice", description: "Advise a friend or family member and explain your reasons.", prepSeconds: 30, speakSeconds: 90 },
  { id: "2", name: "Talking about a Personal Experience", description: "Describe a real experience from your life in detail.", prepSeconds: 30, speakSeconds: 60 },
  { id: "3", name: "Describing a Scene", description: "Describe a picture so the listener can imagine it.", prepSeconds: 30, speakSeconds: 60 },
  { id: "4", name: "Making Predictions", description: "Look at the same scene and predict what happens next.", prepSeconds: 30, speakSeconds: 60 },
  { id: "5", name: "Comparing and Persuading", description: "Choose between two options and persuade someone to agree.", prepSeconds: 60, speakSeconds: 60 },
  { id: "6", name: "Dealing with a Difficult Situation", description: "Pick a way to handle a tricky situation and explain it.", prepSeconds: 60, speakSeconds: 60 },
  { id: "7", name: "Expressing Opinions", description: "Give and support your opinion on an everyday issue.", prepSeconds: 30, speakSeconds: 90 },
  { id: "8", name: "Describing an Unusual Situation", description: "Describe something strange to someone who can't see it.", prepSeconds: 30, speakSeconds: 60 },
];

export const SPEAKING_FORMAT_ROWS: { label: string; value: string }[] = [
  { label: "Scored tasks", value: "8 (plus one unscored practice task)" },
  { label: "Total time", value: "About 15–20 minutes" },
  { label: "Preparation time", value: "30–60 seconds per task" },
  { label: "Speaking time", value: "60–90 seconds per task" },
  { label: "How you answer", value: "Into a microphone; your answers are recorded" },
  { label: "Scored on", value: "CELPIP levels M, 1–12 (maps to CLB)" },
];

export const SPEAKING_PRACTICE_TIPS: string[] = [
  "Practise with the real timer so 30 seconds of prep feels normal.",
  "Record every answer and listen back once before the next try.",
  "Work on one thing at a time: structure, then vocabulary, then pace.",
  "Rotate through all 8 tasks so no task type surprises you.",
];

export const SPEAKING_SAMPLE = {
  task: "Task 1 · Giving Advice",
  question:
    "Your friend is moving to a new city for work and feels nervous about it. Advise your friend on how to settle in.",
  answer:
    "Hi Sam, I totally understand why you're nervous, but I think you'll love it. First, I'd suggest finding a neighbourhood close to your office, so your commute stays short and you have more energy after work. Second, try joining a club or a sports team in your first month. It's the fastest way to meet people. And finally, don't forget to explore. Pick one new café or park every weekend, and the city will start to feel like home.",
  whyItWorks: [
    "Answers the question directly in the first sentence",
    "Three clear pieces of advice with signposting (first, second, finally)",
    "Each tip has a reason, not just an instruction",
    "Natural, friendly tone that fits the situation",
  ],
};

export const SPEAKING_SCORING: { title: string; description: string }[] = [
  { title: "Content / Coherence", description: "Relevant ideas, organised clearly and logically." },
  { title: "Vocabulary", description: "Precise, varied word choice that suits the task." },
  { title: "Listenability", description: "Fluency, pronunciation and rhythm that are easy to follow." },
  { title: "Task Fulfillment", description: "A complete answer to every part of the prompt." },
];

export const SPEAKING_TOPICS: string[] = [
  "Work and career",
  "Education",
  "Home and community",
  "Money and shopping",
  "Travel and leisure",
  "Family and friends",
  "Health and lifestyle",
  "Technology",
];

export const SPEAKING_FAQS: { question: string; answer: string }[] = [
  {
    question: "How can I improve my Speaking score in the CELPIP test?",
    answer:
      "Practise all 8 tasks under real timing, record yourself and listen back, and focus on clear structure: a direct answer, two or three supporting points, and a short close. Our AI review shows you which of the four scoring areas to work on next.",
  },
  {
    question: "How can I sound more natural when speaking in the CELPIP test?",
    answer:
      "Talk to the person in the prompt, not to the examiner. Use contractions, everyday phrases and linking words like 'actually' or 'on top of that', and avoid memorised templates. Natural pace matters more than speed.",
  },
  {
    question: "Can I use notes during the Speaking section of the CELPIP test?",
    answer:
      "No. Paper and notes are not allowed in the Speaking section. Use the preparation time to plan your main points in your head.",
  },
  {
    question: "How can I deal with nervousness during the Speaking test?",
    answer:
      "Familiarity is the best cure: the more timed practice you do, the less the clock will surprise you. If you lose your place, pause briefly, then continue with your next point instead of starting over.",
  },
  {
    question: "Is speaking fast important in the CELPIP test?",
    answer:
      "No. Listenability rewards clear, steady speech. Speaking too fast usually adds mistakes and hurts pronunciation. Aim to use most of your time with a calm, even pace.",
  },
  {
    question: "Do I get time to think before answering in the CELPIP Speaking test?",
    answer:
      "Yes. Every task has preparation time: 30 seconds for most tasks and 60 seconds for Tasks 5 and 6.",
  },
  {
    question: "How is the CELPIP Speaking section scored?",
    answer:
      "Certified raters score your recordings on Content/Coherence, Vocabulary, Listenability and Task Fulfillment. Your result is a CELPIP level from M to 12, which corresponds to a CLB level.",
  },
];

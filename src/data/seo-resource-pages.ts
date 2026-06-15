export type SeoResourcePage = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  quickAnswer: {
    question: string;
    answer: string;
  };
  sections: {
    title: string;
    body: string;
    bullets?: string[];
  }[];
  samples?: {
    title: string;
    prompt: string;
    answer: string;
    notes: string[];
  }[];
  primaryCta: {
    label: string;
    href: string;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
  faqs: {
    question: string;
    answer: string;
  }[];
  lastModified: string;
};

export const seoResourcePages: Record<string, SeoResourcePage> = {
  "free-celpip-practice-test": {
    slug: "free-celpip-practice-test",
    title: "Free CELPIP Practice Test Online | Listening, Reading, Writing, Speaking",
    description:
      "Start a free CELPIP practice test online with realistic Listening, Reading, Writing, and Speaking tasks, timed practice, and score-focused feedback.",
    h1: "Free CELPIP Practice Test Online",
    intro:
      "Use this page as a starting point for free CELPIP practice across all four skills. The fastest improvement comes from combining timed skill drills, full mock exams, answer review, and repeated practice on weak task types.",
    quickAnswer: {
      question: "Where can I take a free CELPIP practice test online?",
      answer:
        "You can start free CELPIP practice on CELPIPPracticeTest.com with skill-specific tasks for Listening, Reading, Writing, and Speaking. For the best result, begin with one skill section, review your mistakes, then move into a full timed mock exam when you are comfortable with the format.",
    },
    sections: [
      {
        title: "What to Practice First",
        body:
          "Start with the skill that is most likely to limit your target CLB score. Many test-takers need the most feedback in Writing and Speaking, while Listening and Reading improve fastest when you review exact mistakes by task type.",
        bullets: [
          "Writing: email and survey response structure.",
          "Speaking: all eight timed response types.",
          "Reading: correspondence, diagrams, information, and viewpoints.",
          "Listening: note-taking and paraphrased answer choices.",
        ],
      },
      {
        title: "How to Use a Free Practice Test",
        body:
          "Treat free practice as diagnosis, not just repetition. Time yourself, finish the task without pausing, review the answer or feedback, and write down one specific fix for the next attempt.",
      },
    ],
    primaryCta: { label: "Start Free Practice", href: "/practice-overview" },
    secondaryCta: { label: "Try a Full Mock Exam", href: "/exam-overview" },
    faqs: [
      {
        question: "Is the free CELPIP practice test timed?",
        answer:
          "Yes. Timed practice helps you build realistic pacing and reduces surprises on test day.",
      },
      {
        question: "Which CELPIP skill should I practice first?",
        answer:
          "Start with the skill furthest from your target CLB score. If you are unsure, begin with Writing or Speaking because feedback is especially valuable there.",
      },
      {
        question: "Can a practice test predict my CELPIP score?",
        answer:
          "Practice tests can estimate readiness and reveal weak task types, but your official CELPIP result depends on real test-day performance.",
      },
    ],
    lastModified: "2026-06-15T00:00:00.000Z",
  },
  "celpip-writing-task-1-samples": {
    slug: "celpip-writing-task-1-samples",
    title: "CELPIP Writing Task 1 Samples | Email Examples and Structure",
    description:
      "Study CELPIP Writing Task 1 email samples with prompts, model answers, structure notes, tone guidance, and practice links.",
    h1: "CELPIP Writing Task 1 Samples",
    intro:
      "CELPIP Writing Task 1 asks you to write an email for a realistic situation. A strong answer covers every bullet point, uses the correct tone, and organizes ideas into clear paragraphs.",
    quickAnswer: {
      question: "How do I write a good CELPIP Writing Task 1 email?",
      answer:
        "A good CELPIP Writing Task 1 email starts with a clear purpose, answers every bullet point from the prompt, uses a tone that matches the audience, and ends with a natural closing. Keep the structure simple: opening, two or three body paragraphs, and a closing sentence.",
    },
    sections: [
      {
        title: "Recommended Structure",
        body:
          "Use a predictable structure so you do not waste time deciding how to organize the email during the test.",
        bullets: [
          "Greeting and purpose: explain why you are writing.",
          "Body paragraph 1: answer the first one or two bullet points.",
          "Body paragraph 2: add details, request action, or explain a problem.",
          "Closing: thank the reader or state the next step.",
        ],
      },
      {
        title: "Tone Rules",
        body:
          "Use formal language for work, landlord, complaint, and service emails. Use friendly but still clear language for a friend, neighbour, or classmate.",
      },
    ],
    samples: [
      {
        title: "Sample: Complaint Email",
        prompt:
          "You bought a laptop online, but it arrived with a damaged screen. Write an email to customer service explaining the problem, requesting a solution, and asking about the next steps.",
        answer:
          "Dear Customer Service Team,\n\nI am writing about a laptop I ordered from your website last week. Unfortunately, when the package arrived yesterday, I noticed that the screen was cracked and the laptop could not be used properly.\n\nI would like to request either a replacement or a full refund. I have kept the original box and can send photos of the damage if needed. Please let me know whether I should return the laptop by mail or take it to one of your stores.\n\nI would appreciate a response as soon as possible because I need the laptop for work. Thank you for your help.\n\nSincerely,\nAlex Chen",
        notes: [
          "The purpose is clear in the first paragraph.",
          "All prompt requirements are covered.",
          "The tone is formal and polite.",
        ],
      },
    ],
    primaryCta: { label: "Practice CELPIP Writing", href: "/writing" },
    secondaryCta: { label: "See Task 2 Samples", href: "/celpip-writing-task-2-samples" },
    faqs: [
      {
        question: "How many words should CELPIP Writing Task 1 be?",
        answer:
          "A typical Task 1 response is about 150 to 200 words. Focus on completing the task clearly rather than forcing an exact word count.",
      },
      {
        question: "Should I use a template for Task 1?",
        answer:
          "Use a flexible structure, not a memorized template. The email must match the situation and audience.",
      },
    ],
    lastModified: "2026-06-15T00:00:00.000Z",
  },
  "celpip-writing-task-2-samples": {
    slug: "celpip-writing-task-2-samples",
    title: "CELPIP Writing Task 2 Samples | Survey Answers and CLB 9 Structure",
    description:
      "Review CELPIP Writing Task 2 survey response samples with prompt analysis, model answers, structure notes, and practice guidance.",
    h1: "CELPIP Writing Task 2 Samples",
    intro:
      "CELPIP Writing Task 2 asks you to choose one option in a survey and explain your opinion. A strong response is specific, organized, and supported by realistic reasons or examples.",
    quickAnswer: {
      question: "How do I answer CELPIP Writing Task 2?",
      answer:
        "Choose one survey option clearly, give two or three reasons, support each reason with a practical example, and end with a short conclusion. Avoid listing generic advantages; explain why your chosen option is better for the people in the situation.",
    },
    sections: [
      {
        title: "Recommended Structure",
        body:
          "Task 2 is easier when you use a direct opinion structure.",
        bullets: [
          "Opening: state the option you choose.",
          "Reason 1: explain the strongest practical benefit.",
          "Reason 2: add a different benefit or solve a concern.",
          "Conclusion: restate why this option is best.",
        ],
      },
      {
        title: "What Makes an Answer Strong",
        body:
          "High-scoring answers sound natural and specific. They connect the choice to real people, costs, convenience, safety, time, or community impact.",
      },
    ],
    samples: [
      {
        title: "Sample: Community Survey",
        prompt:
          "Your city has money for one improvement. Option A: build a new public playground. Option B: add more bus shelters. Choose one option and explain your reasons.",
        answer:
          "I believe the city should add more bus shelters because this improvement would help a larger number of residents every day.\n\nFirst, many people rely on public transportation to get to work, school, and medical appointments. In bad weather, waiting without shelter is uncomfortable and sometimes unsafe, especially for seniors, children, and people with health problems. Covered shelters would make public transit more practical throughout the year.\n\nSecond, better bus stops may encourage more people to use transit instead of driving. This could reduce traffic and parking pressure in busy areas. Although a playground would be useful for families, bus shelters would support students, workers, seniors, and visitors across the whole city.\n\nFor these reasons, I think bus shelters are the better choice.",
        notes: [
          "The writer chooses one option immediately.",
          "Each paragraph gives a separate reason.",
          "The answer compares both options without becoming unfocused.",
        ],
      },
    ],
    primaryCta: { label: "Practice CELPIP Writing", href: "/writing" },
    secondaryCta: { label: "See Task 1 Samples", href: "/celpip-writing-task-1-samples" },
    faqs: [
      {
        question: "Do I need to discuss both options in Task 2?",
        answer:
          "You should clearly support one option. You can briefly mention the other option, but most of the response should explain your chosen answer.",
      },
      {
        question: "How can I get CLB 9 in CELPIP Writing Task 2?",
        answer:
          "Aim for a clear opinion, logical paragraphing, specific examples, accurate grammar, and vocabulary that fits the survey topic.",
      },
    ],
    lastModified: "2026-06-15T00:00:00.000Z",
  },
  "celpip-speaking-samples": {
    slug: "celpip-speaking-samples",
    title: "CELPIP Speaking Samples | Task Answers, Structure, and Practice Tips",
    description:
      "Practice with CELPIP Speaking samples for common task types, including advice, scene description, opinion, and difficult situations.",
    h1: "CELPIP Speaking Samples",
    intro:
      "CELPIP Speaking rewards clear, organized, complete answers. You do not need perfect English, but you do need to answer the prompt directly and keep speaking with a simple structure.",
    quickAnswer: {
      question: "What does a strong CELPIP Speaking answer sound like?",
      answer:
        "A strong CELPIP Speaking answer is direct, organized, and easy to follow. It usually starts with the main answer, gives two or three supporting details, and ends naturally before time runs out. Fluency, pronunciation, vocabulary, and task completion all matter.",
    },
    sections: [
      {
        title: "Simple Speaking Formula",
        body:
          "Use a flexible structure instead of memorized sentences.",
        bullets: [
          "Answer: give your advice, opinion, choice, or description.",
          "Reason: explain why your answer makes sense.",
          "Detail: add an example, consequence, or comparison.",
          "Close: finish naturally without repeating everything.",
        ],
      },
      {
        title: "Practice Method",
        body:
          "Record every answer. Then listen once for task completion, once for fluency, and once for pronunciation. Pick one issue to improve on the next attempt.",
      },
    ],
    samples: [
      {
        title: "Sample: Giving Advice",
        prompt:
          "Your friend wants to improve English speaking but feels nervous talking to native speakers. Give advice.",
        answer:
          "I think you should start with small, low-pressure conversations instead of trying to speak perfectly right away. For example, you can order coffee, ask a simple question in a store, or join a short online conversation group.\n\nThis will help because confidence grows through repetition. If you speak for only five minutes every day, you will become more comfortable with common phrases and natural pronunciation. You can also record yourself once a week and notice which words are difficult.\n\nMost importantly, do not wait until your English is perfect. Speaking is the way you improve, so small daily practice is much better than silent studying.",
        notes: [
          "The advice is clear from the first sentence.",
          "The answer includes examples and a practical reason.",
          "The ending reinforces the main message naturally.",
        ],
      },
    ],
    primaryCta: { label: "Practice CELPIP Speaking", href: "/speaking" },
    secondaryCta: { label: "Review Speaking Templates", href: "/wiki/celpip-speaking-task-1-template" },
    faqs: [
      {
        question: "How many CELPIP Speaking tasks are there?",
        answer:
          "There are eight speaking tasks, including giving advice, describing a scene, making predictions, comparing options, and expressing an opinion.",
      },
      {
        question: "Should I memorize CELPIP Speaking answers?",
        answer:
          "No. Memorized answers often fail because prompts change. Use flexible structures and practice responding naturally.",
      },
    ],
    lastModified: "2026-06-15T00:00:00.000Z",
  },
  "editorial-policy": {
    slug: "editorial-policy",
    title: "Editorial Policy and Scoring Methodology | CELPIP Practice Test",
    description:
      "Learn how CELPIP Practice Test creates, reviews, and updates study guides, practice resources, AI feedback, and score-improvement content.",
    h1: "Editorial Policy and Scoring Methodology",
    intro:
      "This page explains how our CELPIP preparation content is planned, reviewed, and updated. It is designed to help learners, search engines, and AI systems understand the source and limits of our study guidance.",
    quickAnswer: {
      question: "How does CELPIP Practice Test create study guidance?",
      answer:
        "CELPIP Practice Test creates study guidance by focusing on the public CELPIP format, common task requirements, learner performance patterns, and practical language-development strategies. Our content is educational and independent; it is not official CELPIP material and should be used alongside the official test provider's instructions.",
    },
    sections: [
      {
        title: "Editorial Standards",
        body:
          "Our public guides are written to be clear, practical, and useful for test-takers preparing for Canadian immigration, citizenship, employment, and professional pathways.",
        bullets: [
          "We prioritize plain-English explanations over vague test-prep advice.",
          "We separate official test facts from practice recommendations.",
          "We update pages when the product, study method, or public exam context changes.",
          "We avoid presenting AI feedback as an official CELPIP score.",
        ],
      },
      {
        title: "AI Feedback and Practice Scores",
        body:
          "AI feedback is used as a practice tool to help learners notice grammar, vocabulary, fluency, coherence, and task-completion issues. It is not a substitute for the official CELPIP score, and results should be treated as preparation guidance.",
      },
      {
        title: "Independence",
        body:
          "CELPIPPRACTICETEST.com is an independent platform and is not affiliated with, endorsed by, or associated with Paragon Testing Enterprises or the official CELPIP test.",
      },
    ],
    primaryCta: { label: "Start Practice", href: "/practice-overview" },
    secondaryCta: { label: "Contact Us", href: "/contact-us" },
    faqs: [
      {
        question: "Is CELPIPPracticeTest.com official CELPIP material?",
        answer:
          "No. CELPIPPracticeTest.com is independent and is not affiliated with, endorsed by, or associated with the official CELPIP test provider.",
      },
      {
        question: "Are AI practice scores official scores?",
        answer:
          "No. AI practice scores are educational estimates and feedback signals for preparation. Only the official CELPIP test provider can issue official scores.",
      },
    ],
    lastModified: "2026-06-15T00:00:00.000Z",
  },
};

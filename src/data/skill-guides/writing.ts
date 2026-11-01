import type { SkillGuide } from "./types";

/** Copy from the content team's "CELPIP Writing Practice Test 2026" doc (Nov 2026). */
export const writingGuide: SkillGuide = {
  skill: "writing",
  title: "CELPIP Writing Practice Test 2026 – Free Online Practice",
  intro:
    "Prepare for the CELPIP Writing test with 120 online practice exercises covering both writing tasks: Writing an Email and Responding to Survey Questions, with 60 exercises for each task. Practise with exam-style prompts, learn to organise your ideas and support your opinions, and develop clear, coherent responses within the time limit. Submit your writing to receive AI-powered feedback and an estimated CELPIP level out of 12, helping you identify areas for improvement. Start with free practice and explore more writing exercises and full mock exams as you prepare for test day.",
  badge: "120 practice exercises · Both tasks",
  hero: {
    taskLabel: "Task 1 · Writing an Email",
    prompt: "Write an email to your building manager about a noise problem and suggest a solution.",
    stats: [
      { label: "Time left", value: "21:40" },
      { label: "Words", value: "164" },
    ],
    visual: "lines",
    feedbackLabel: "Readability · Task Fulfillment",
  },
  sections: [
    {
      type: "practice",
      id: "practice",
      title: "CELPIP Writing Practice Tests",
      intro: "Pick a task to start practising with exam-style prompts and the real time limit.",
      tasks: [
        { id: "1", label: "Task 1", name: "Writing an Email", description: "Write an email that addresses the situation and all the instructions in the prompt.", chips: ["27 minutes", "150–200 words"] },
        { id: "2", label: "Task 2", name: "Responding to Survey Questions", description: "Choose an option and explain your preference with reasons and supporting details.", chips: ["26 minutes", "150–200 words"] },
      ],
    },
    {
      type: "table",
      id: "format",
      title: "CELPIP Writing Test Format",
      intro:
        "Both tasks are completed on a computer. You have approximately 27 minutes for the email task and 26 minutes for the survey response. Each response should generally be around 150–200 words.",
      columns: ["Task", "What You Need to Do", "Time", "Suggested Word Count"],
      rows: [
        ["Task 1: Writing an Email", "Write an email that addresses the situation and all the instructions in the prompt.", "27 minutes", "150–200 words"],
        ["Task 2: Responding to Survey Questions", "Choose an option and explain your preference with reasons and supporting details.", "26 minutes", "150–200 words"],
      ],
    },
    {
      type: "cards",
      id: "tasks",
      title: "Explore the CELPIP Writing Tasks",
      intro:
        "There are two specific tasks in the CELPIP Writing section. Practise each task individually before you do a full CELPIP practice test.",
      items: [
        { title: "Task 1: Writing an Email", text: "In this task, you write an email in response to a given situation. Follow the instructions in the prompt and include all the relevant details needed to address the situation." },
        { title: "Task 2: Responding to Survey Questions", text: "In this task, you answer a survey question about which of two options you prefer. You are asked to support your preference with reasons and examples." },
      ],
    },
    {
      type: "tips",
      id: "how-to-practice",
      title: "How to Practice CELPIP Writing Effectively",
      intro:
        "Improve your CELPIP Writing skills by practising both tasks, reviewing your responses, and learning from your mistakes. Focus on expressing your ideas clearly, organising your response logically, and addressing every part of the prompt.",
      items: [
        { title: "Practise one task at a time", text: "Work on Writing an Email and Responding to Survey Questions separately until you understand the requirements of each task." },
        { title: "Practise under timed conditions", text: "Stick to the test timing for each task to make sure you have plenty of practice writing to the time limits." },
        { title: "Plan your response before writing", text: "Spend a short time identifying the purpose, key points, and order of your ideas." },
        { title: "Respond to all aspects of the prompt", text: "Confirm that you have answered all questions and included all pertinent information about the scenario." },
        { title: "Develop your ideas with supporting details", text: "Present your ideas with explanations and examples that support them rather than bare topic statements." },
        { title: "Review your response after each practice", text: "Check whether your answer is relevant, well organised, easy to follow, and appropriate in tone. Look for grammar, spelling, punctuation, and word-choice errors." },
        { title: "Maintain an error list", text: "Record common problems, such as grammatical errors, awkward sentences, limited vocabulary, or weak paragraph organisation. Review this list before your next practice session." },
        { title: "Rewrite and practise with a new prompt", text: "Improve your original response using what you have learned, then apply the same skills to a different topic." },
        { title: "Complete a full practice test", text: "Once you are comfortable with both tasks individually, practise completing them in one sitting under test conditions." },
      ],
    },
    {
      type: "sample",
      id: "samples",
      title: "CELPIP Writing Sample Answers",
      intro: "See full templates and high-scoring sample answers for each task.",
      links: [
        { title: "Task 1 template", text: "Writing an Email: structure, phrases and samples", href: "/blog/celpip-writing-task-1-template" },
        { title: "Task 2 template", text: "Survey Questions: structure, phrases and samples", href: "/blog/celpip-writing-task-2-template" },
      ],
    },
    {
      type: "scoring",
      id: "scoring",
      title: "How Is CELPIP Writing Scored?",
      paragraphs: ["CELPIP Writing tests your writing ability on four dimensions. Read about them here."],
      criteria: [
        { title: "Content/Coherence", text: "This criterion includes the quantity and quality of your ideas, your organization of them, and the degree to which you develop them with appropriate elaboration and support." },
        { title: "Vocabulary", text: "Vocabulary assessment considers your word choice, range of expressions, precision, and ability to use words appropriately in different contexts." },
        { title: "Readability", text: "Readability measures how easily a reader can understand your response. It includes paragraphing, transitions, spelling, punctuation, grammar, and sentence structure." },
        { title: "Task Fulfillment", text: "Task Fulfillment measures how well you follow the instructions, achieve the purpose of the task, use an appropriate tone, and meet the expected response length." },
      ],
    },
    {
      type: "checklist",
      id: "strong-response",
      title: "What Makes a Strong CELPIP Writing Response?",
      intro:
        "Strong answers are not just filled with sophisticated language and sentence structures. They effectively convey the intended message to the intended audience, use ideas that develop logically, and answer the question.",
      items: [
        "Follow all instructions.",
        "Organise your ideas in a clear, logical order.",
        "Support your main points with relevant reasons or examples.",
        "Match your tone to the situation.",
        "Edit for accuracy and clarity.",
      ],
    },
    {
      type: "list",
      id: "topics",
      title: "Common CELPIP Writing Topics and Scenarios",
      intro:
        "CELPIP Writing tasks focus on everyday situations that require you to communicate clearly, explain your ideas, or express and support an opinion. Practising a variety of topics can help you organise your thoughts and respond more confidently to different prompts.",
      items: [
        { title: "Employment and careers", text: "Careers and job opportunities at work, and work-related communication." },
        { title: "Housing and neighbourhoods", text: "Renting, settling down and amenities in your neighbourhood." },
        { title: "Education and development", text: "Courses, learning events and other learning products." },
        { title: "Transportation", text: "Public transit, commuting, and transportation services." },
        { title: "Public and community services", text: "Local amenities, community life and public service concerns." },
        { title: "Shopping and consumer problems", text: "Issues with a product, a service, or how the product was purchased." },
        { title: "Things we do", text: "Lifestyle, hobbies, and everyday choices." },
        { title: "Community and public places", text: "Parks and green spaces, environmental issues and local improvement projects." },
      ],
    },
    {
      type: "faq",
      id: "faq",
      title: "FAQ",
      intro: "Get information on preparing for the writing component of the CELPIP test, such as the test tasks, timing and word count.",
      items: [
        { question: "How many tasks are in the CELPIP Writing test?", answer: "The CELPIP-General Writing test consists of two tasks. In the first you will write an email in response to a given situation; in the second, you will select one of two options and support your choice with reasons and examples." },
        { question: "How long do I have to complete the Writing section?", answer: "You have 27 minutes for Task 1 and 26 minutes for Task 2. Use these time limits in practice so you will have enough time to plan, write and edit your writing." },
        { question: "How many words should I write in CELPIP Writing?", answer: "The recommended length is 150-200 words for each task. Try to keep your responses within this range, ensuring you answer all elements of the prompt and fully develop your ideas. Excessively long or short responses may impact your score." },
        { question: "How can I improve my CELPIP Writing score?", answer: "Practise both tasks under timed conditions. Follow all the instructions, organise your ideas clearly, and support your points with relevant details. Review your responses to identify recurring errors, then rewrite them and apply what you have learned to new prompts." },
        { question: "Can I use contractions in the CELPIP Writing test?", answer: "Yes. It's okay to use natural contractions, for example I'm, don't, and it's, where they are right for the situation and the style of your email. In a more formal email you might use I am and do not instead of I'm and don't." },
        { question: "How is CELPIP Writing scored?", answer: "CELPIP Writing evaluates your work on four criteria: Content/Coherence, Vocabulary, Readability, and Task Fulfillment. These factors include idea development, organization, spelling, sentence structure, readability, task relevance, task completeness, tone, and total word count. You will receive your result as a CELPIP level between 0-12." },
        { question: "What should I include in a CELPIP email?", answer: "Address the purpose of the email and respond to every point in the prompt. Depending on the situation, include an appropriate greeting, an opening that explains why you are writing, body paragraphs covering the required details, and a suitable closing. Use a tone that matches the intended reader and the situation." },
      ],
    },
  ],
};

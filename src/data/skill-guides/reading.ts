import type { SkillGuide } from "./types";

/** Copy from the content team's "CELPIP Reading Practice Test 2026" doc (Nov 2026). */
export const readingGuide: SkillGuide = {
  skill: "reading",
  title: "CELPIP Reading Practice Test 2026 – Free Online Practice",
  intro:
    "Get ready for the CELPIP Reading test by doing 200 online practice exercises, which include 50 activities for each of the four reading tasks. These exercises mirror exam-style questions that focus on everyday written English, such as emails, diagrams, informational texts, and opinion pieces. Enhance your skills in identifying essential details, grasping various perspectives, and boosting both your reading speed and accuracy. After answering questions, review your responses to identify common patterns and gain the confidence needed to finish each section within the allotted time. Begin with complimentary CELPIP Reading practice tests as you work towards achieving your desired score.",
  badge: "200 practice exercises · All 4 parts",
  hero: {
    taskLabel: "Part 2 · Apply a Diagram",
    prompt: "Read the email and the bus schedule. Which route gets Maria to the clinic before 9:00?",
    stats: [
      { label: "Time left", value: "6:48" },
      { label: "Answered", value: "5 / 8" },
    ],
    visual: "lines",
    feedbackLabel: "Answers checked instantly",
  },
  sections: [
    {
      type: "practice",
      id: "practice",
      title: "CELPIP Reading Practice Tests",
      intro: "Pick a part to start practising with exam-style questions and the real timer.",
      tasks: [
        { id: "1", label: "Part 1", name: "Reading Correspondence", description: "Read emails and other correspondence to understand purpose and key details.", chips: ["~11 minutes"] },
        { id: "2", label: "Part 2", name: "Reading to Apply a Diagram", description: "Combine a written message and a diagram to find the correct answer.", chips: ["~9 minutes"] },
        { id: "3", label: "Part 3", name: "Reading for Information", description: "Identify main ideas, supporting details and relevant facts in a passage.", chips: ["~10 minutes"] },
        { id: "4", label: "Part 4", name: "Reading for Viewpoints", description: "Understand and compare different opinions and the reasons behind them.", chips: ["~13 minutes"] },
      ],
    },
    {
      type: "table",
      id: "format",
      title: "CELPIP Reading Test Format",
      intro:
        "The CELPIP Reading test assesses your ability to understand written English in everyday and workplace contexts. It consists of four sections, each focusing on a different type of reading task.",
      columns: ["Section", "Approximate Time", "What You Need to Do"],
      rows: [
        ["Part 1", "11 minutes", "Read emails and other correspondence to understand the purpose, key details, and information communicated."],
        ["Part 2", "9 minutes", "Combine information from a written message and a diagram to identify the correct answer."],
        ["Part 3", "10 minutes", "Read an informational passage and identify main ideas, supporting details, and relevant facts."],
        ["Part 4", "13 minutes", "Understand different opinions, compare perspectives, and interpret the reasons behind them."],
      ],
    },
    {
      type: "cards",
      id: "sections",
      title: "Explore the CELPIP Reading Sections",
      intro:
        "Each section of the CELPIP Reading test focuses on a different way of understanding written information. Familiarising yourself with these task types can help you identify relevant details, interpret information accurately, and approach questions more effectively.",
      items: [
        { title: "Part 1: Reading Correspondence", text: "Read emails and other written messages, then answer questions about their purpose, main ideas, and key details.", focus: "Identify why the message was written, the main issue, and any requests, explanations, or proposed solutions." },
        { title: "Part 2: Reading to Make Use of a Diagram", text: "Use information from a written message together with a diagram, table, schedule, or other visual material to answer questions.", focus: "Compare the information in the message with the relevant details in the visual material. The correct answer may depend on both sources." },
        { title: "Part 3: Reading for Information", text: "Read an informational passage and identify its main ideas, supporting details, and relevant facts.", focus: "Understand the purpose of each paragraph and how its examples, explanations, and details support the main ideas." },
        { title: "Part 4: Reading for Viewpoints", text: "Read a passage presenting different opinions on a topic. Identify each viewpoint, understand the reasons behind it, and compare the arguments presented.", focus: "Look for similarities and differences between viewpoints. Pay attention to paraphrasing, as questions may express ideas differently from the passage." },
      ],
    },
    {
      type: "tips",
      id: "how-to-practice",
      title: "How to Practice CELPIP Reading Effectively",
      intro:
        "Speed up your CELPIP Reading skills by practising the sections, checking your errors, and making a plan to read effectively within the time limits. You want not only to increase speed but to locate the correct information and comprehend the question.",
      items: [
        { title: "Work through one section at a time", text: "Begin with Reading Correspondence, Reading to Apply a Diagram, Reading for Information or Reading for Viewpoints. Take each section on its own before trying a complete test." },
        { title: "Set a timer", text: "Practise with a time limit for each section so that you get comfortable answering questions without taking too long on any one item." },
        { title: "Skim for the main idea", text: "Read through at a speed that enables you to grasp the topic and the author's purpose. Focus on headings, the first sentences of paragraphs, and other signposts that show the organisational structure." },
        { title: "Search for a particular piece of information", text: "Search for key terms, names, dates, numbers, and other information related to the question. This can help you find information more quickly without reading the whole text again." },
        { title: "Recognise synonyms and paraphrases", text: "Questions and answer choices may express ideas differently from the original text. Build your vocabulary and practise identifying equivalent meanings rather than searching only for exact word matches." },
        { title: "Apply the diagram and text together", text: "In Part 2, compare the text with the diagram, tables, graphs or pictures. Make sure you have answered the question by referring to both." },
        { title: "Compare points of view before making a choice", text: "In Part 4, find out who holds each opinion, and read between the lines: what the text says, what a person thinks, and what you can logically conclude." },
        { title: "Learn from the wrong choices", text: "Go back to the reading and see what supports the best answer. Was it a matter of missing a detail, not recognising a word, not noticing a paraphrased idea, or making an unsupported inference?" },
        { title: "Answer every question", text: "If you are unsure, eliminate clearly incorrect options and select the best remaining answer. Do not leave questions unanswered when time is running out." },
        { title: "Complete a full practice test", text: "Once you are comfortable with each section, complete all four parts in sequence. Use the results to identify recurring weaknesses and plan your next round of practice." },
      ],
    },
    {
      type: "sample",
      id: "samples",
      title: "CELPIP Reading Sample Questions and Answers",
      intro: "Try real-format questions for free. Every practice set shows the correct answers when you finish, so you can see why each answer is right.",
      links: [
        { title: "Part 1 sample questions", text: "Reading Correspondence", taskId: "1" },
        { title: "Part 2 sample questions", text: "Reading to Apply a Diagram", taskId: "2" },
        { title: "Part 3 sample questions", text: "Reading for Information", taskId: "3" },
        { title: "Part 4 sample questions", text: "Reading for Viewpoints", taskId: "4" },
      ],
    },
    {
      type: "scoring",
      id: "scoring",
      title: "How Is Reading in CELPIP Scored?",
      paragraphs: [
        "In CELPIP Reading tests, the score of the test is determined by the number of questions answered correctly. The raw score is then converted into a CELPIP level ranging from 0 to 12. Since there are no penalties for wrong answers, you should make sure to answer all the questions asked in the test.",
      ],
      subsections: [
        { title: "How Many Scored Questions Are There in the CELPIP Reading Test?", text: "There are 38 scored questions in the Reading test. However, some extra questions may be included that won't be counted toward the final score." },
        { title: "How Is the Raw Score Converted into a CELPIP Level?", text: "The raw score is converted into a CELPIP level that ranges from 0 to 12. The number of correct answers needed to get a certain level may differ between test versions due to the variability of the raw score conversion process. The results report indicates your CELPIP level instead of the actual number of correct answers." },
      ],
    },
    {
      type: "list",
      id: "question-types",
      title: "Common CELPIP Reading Question Types",
      intro:
        "CELPIP Reading questions assess different skills, from identifying the main idea of a passage to interpreting details and comparing viewpoints. Practising these question types can help you understand what each question requires and choose answers more accurately.",
      items: [
        { title: "Main ideas and purpose", text: "Determine the overall point of a paragraph or the purpose of an email." },
        { title: "Details and specifics", text: "Find names, dates, numbers, reasons, and other details in the text." },
        { title: "Diagram reading and interpretation", text: "Integrate data from written messages with information presented on diagrams, tables, or visual images." },
        { title: "Vocabulary in context", text: "Work out the meaning of a word or phrase from the surrounding words." },
        { title: "Paraphrasing and synonyms", text: "Identify whether a question or answer option is paraphrasing, i.e. conveying the same idea as the text in different words." },
        { title: "Compare views", text: "Determine the differences and similarities between ideas, arguments or views." },
        { title: "Making inferences", text: "Draw reasonable conclusions from the information provided without adding assumptions that the passage does not support." },
        { title: "Understanding relationships between ideas", text: "Identify how examples, explanations, reasons and conclusions relate to each other within a passage." },
      ],
    },
    {
      type: "faq",
      id: "faq",
      title: "FAQ",
      items: [
        { question: "How many parts are there in the CELPIP Reading test?", answer: "The CELPIP Reading test consists of the following four sections: Reading Correspondence, Reading to Apply a Diagram, Reading for Information and Reading for Viewpoints. The test may also contain some unscored items that are used for test development purposes." },
        { question: "How long is the CELPIP Reading test?", answer: "The CELPIP Reading test takes approximately 43 to 56 minutes, depending on the test version and whether unscored questions are included. Each section has its own time limit, so practise managing your time across all four sections." },
        { question: "Can I go back to previous questions in CELPIP Reading?", answer: "You can review and change your answers within the current section while its timer is running. Once you move to the next section, you cannot return to the previous one. Make sure you review your answers before the section ends." },
        { question: "How can I improve my CELPIP Reading score?", answer: "Practise each section, improve your vocabulary, and learn to skim for the main ideas and scan for detail. Analyse why you got questions wrong and practise identifying paraphrases. Take practice tests in real exam conditions to increase your speed and accuracy." },
        { question: "What types of texts appear in the CELPIP Reading test?", answer: "The test includes different types of written material, such as emails and other correspondence, informational passages, visual information used alongside written messages, and texts presenting different viewpoints." },
        { question: "How can I manage my time during CELPIP Reading?", answer: "Each section has a set time and number of questions. When you start a new section, check the timer and number of questions. Quickly read through the passage to find the main idea, then look for the keywords in each question and scan the passage for information." },
        { question: "How is the CELPIP Reading section scored?", answer: "One point is awarded for each correct answer to a scored question, and nothing is deducted for an incorrect answer. Your raw score is converted to a CELPIP level from 0 to 12. The conversion may differ between test forms and some questions may not be scored." },
      ],
    },
  ],
};

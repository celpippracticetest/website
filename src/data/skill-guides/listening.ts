import type { SkillGuide } from "./types";

/** Copy from the content team's "CELPIP Listening Practice Test 2026" doc (Nov 2026). */
export const listeningGuide: SkillGuide = {
  skill: "listening",
  title: "CELPIP Listening Practice Test 2026 – Free Online Practice",
  intro:
    "Practice all six parts of the CELPIP Listening Test through timed listening activities that include problem solving, everyday conversation, information, news reports, discussion, and viewpoints. Practice includes 30 questions for each part, which means 180 practice questions altogether across all six sections. Get your scores immediately and check your answer keys to find out about your errors. Make use of these free CELPIP Listening practice tests to become familiar with the test format, learn how to take notes, and be prepared for test day.",
  badge: "180 practice questions · All 6 parts",
  hero: {
    taskLabel: "Part 1 · Problem Solving",
    prompt: "Listen to the conversation. What does the woman suggest they do about the broken heater?",
    stats: [
      { label: "Recording", value: "1:48" },
      { label: "Questions", value: "3 / 8" },
    ],
    visual: "wave",
    feedbackLabel: "Score + answer key ready",
  },
  sections: [
    {
      type: "practice",
      id: "practice",
      title: "CELPIP Listening Practice Test",
      intro: "Pick a part to start practising with real-format recordings and questions.",
      tasks: [
        { id: "1", label: "Part 1", name: "Listening to Problem Solving", description: "A conversation about a problem and possible solutions.", chips: ["8 questions"] },
        { id: "2", label: "Part 2", name: "A Daily Life Conversation", description: "A conversation about everyday life.", chips: ["5 questions"] },
        { id: "3", label: "Part 3", name: "Listening for Information", description: "A recording providing specific information.", chips: ["6 questions"] },
        { id: "4", label: "Part 4", name: "Listening to a News Item", description: "A news report.", chips: ["5 questions"] },
        { id: "5", label: "Part 5", name: "Listening to a Discussion", description: "A discussion between several speakers.", chips: ["8 questions"] },
        { id: "6", label: "Part 6", name: "Listening to Viewpoints", description: "Speakers expressing different viewpoints.", chips: ["6 questions"] },
      ],
    },
    {
      type: "table",
      id: "format",
      title: "CELPIP Listening Test Format",
      intro:
        "The CELPIP-General Listening test is about 46-55 minutes long and has six parts with 38 total scored questions. You listen to recordings and answer multiple-choice questions.",
      columns: ["Part", "What You Hear", "Questions"],
      rows: [
        ["Part 1", "A conversation about a problem and possible solutions", "8"],
        ["Part 2", "A conversation about everyday life", "5"],
        ["Part 3", "A recording providing specific information", "6"],
        ["Part 4", "A news report", "5"],
        ["Part 5", "A discussion between several speakers", "8"],
        ["Part 6", "Speakers expressing different viewpoints", "6"],
      ],
    },
    {
      type: "cards",
      id: "sections",
      title: "Explore the CELPIP Listening Sections",
      intro:
        "Read about the six sections of the CELPIP Listening test to find out what kinds of questions each section asks, what you will hear, and what you should listen for. Find out what each section is for, and what skills you will need to answer questions correctly, from following normal conversations and spotting keywords to identifying speakers' opinions and ideas.",
      items: [
        { title: "Part 1: Listening to Problem Solving", text: "Listen to a discussion of a problem and its solutions. What is the issue under discussion, what worries the speakers, what solutions do they offer and which one solves the problem?" },
        { title: "Part 2: A Daily Life Conversation", text: "Hear an everyday situational dialogue. Find out what the speakers are talking about, what they want to say and the information that is important for the questions." },
        { title: "Part 3: Listening for Information", text: "Take note of facts, details, and other information. Notice names, numbers, explanations and other details so that you can choose the right answer." },
        { title: "Part 4: Listening to a News Item", text: "Listen to a news story and determine the facts: what happened, who was involved, and where and when it took place, why it is important and what information is given to explain the event." },
        { title: "Part 5: Listening to a Discussion", text: "Listen to a recording of different people. Keep track of the main points and ideas presented by the speakers, what each speaker says and the details they use, and the connections between speakers." },
        { title: "Part 6: Listening to Viewpoints", text: "Hear speakers' views on a subject. Recognise whether speakers agree or disagree with each other and why. Find out what thoughts are behind the words and are not said directly." },
      ],
    },
    {
      type: "tips",
      id: "how-to-practice",
      title: "How to Practice CELPIP Listening Effectively",
      intro:
        "All practice sessions should be training sessions in which you get to know the test format, discover your problem areas and learn from your mistakes. The following steps will help you tailor your practice sessions to make the most of them.",
      items: [
        { text: "Before you try answering any questions, familiarise yourself with the type of questions you will find in a part by working through the part. Then spend some time working on it until you are more comfortable with the recordings and questions." },
        { text: "Listen to the recording and answer all the questions without looking at the key until you've finished." },
        { text: "Once your answers are checked, revisit the items you answered incorrectly. Determine what information you may have missed, what you didn't understand, or why you selected the wrong answer." },
        { text: "Check the correct answer against your choice and go back to the section of the recording if necessary. Concentrate on the correct answer, rather than on the information that was used to derive that answer." },
        { text: "Replay a hard recording and attempt to answer the questions without referring to the answer sheet. This allows you to confirm whether you now understand the recording more clearly." },
        { text: "When you've become more comfortable with one of the listening sections, work on another section and keep a record of your frequent mistakes so you're aware of what to focus on." },
      ],
      outro: "Pair your listening practice with a complete CELPIP Practice Test to get used to the timing and experience of the full test.",
    },
    {
      type: "sample",
      id: "samples",
      title: "CELPIP Listening Practice Questions and Answers",
      intro: "Try real-format recordings and questions for free. You get your score right away, plus the answer key to review each mistake.",
      links: [
        { title: "Part 1", text: "Problem Solving", taskId: "1" },
        { title: "Part 2", text: "Daily Life Conversation", taskId: "2" },
        { title: "Part 3", text: "Information", taskId: "3" },
        { title: "Part 4", text: "News Item", taskId: "4" },
        { title: "Part 5", text: "Discussion", taskId: "5" },
        { title: "Part 6", text: "Viewpoints", taskId: "6" },
      ],
    },
    {
      type: "scoring",
      id: "scoring",
      title: "How Is CELPIP Listening Scored?",
      paragraphs: [
        "CELPIP Listening scores are based on how many questions you get right. Your raw score is scaled to a CELPIP level from 0 to 12, with adjustments made to compensate for variations in test version difficulty. You are not penalized for incorrect answers.",
        "The number of correct answers needed for a particular CELPIP level may vary slightly between test versions. Your official result is reported as a CELPIP level rather than a raw score.",
      ],
    },
    {
      type: "scoring",
      id: "skills",
      title: "What Listening Skills Should You Practice?",
      paragraphs: [
        "To get ready for the CELPIP Listening test, consider what you need to do in order to understand conversations, talks, and recorded material. Working on these things will help you identify important information and follow what is being said and implied.",
      ],
      criteria: [
        { title: "Understanding Main Ideas", text: "After listening to a recording, identify the main idea. You should be able to sum up the focus of the recording in a sentence or two." },
        { title: "Listening for Details", text: "Remember particular facts such as names, numbers, dates, reasons, and other key details. When going over a wrong answer, pinpoint the fact you did not understand or remember." },
        { title: "Understanding Viewpoints", text: "Recognise each speaker's ideas, attitudes and wishes, and how these vary from one person to another. Listen for what each speaker is thinking, what influences their thinking and how their views differ." },
        { title: "Making Inferences", text: "Understand information that is implied by the speakers. Work out the meaning the speakers imply, based on what you know from the recording and the speakers' words." },
      ],
    },
    {
      type: "list",
      id: "question-types",
      title: "Typical CELPIP Listening Question Types",
      intro:
        "Practice various kinds of listening questions to help you get used to understanding spoken English during everyday situations and test scenarios, such as:",
      items: [
        { title: "Main ideas and purpose", text: "Find the main topic, purpose, and key point of a conversation or recording." },
        { title: "Everyday conversations and problems", text: "Follow discussions of daily routines, scheduled plans, shared problems, and potential solutions." },
        { title: "News story or informational recording", text: "Identify the main idea and supporting facts." },
        { title: "Specific facts & details", text: "Remember specific facts such as names, numbers, reasons, and other relevant details." },
        { title: "Opinion, attitude and intention", text: "Know what speakers believe, how they feel, and what they intend." },
        { title: "Contrast", text: "Identify what is different between the speakers' opinions and what you can conclude from it." },
      ],
    },
    {
      type: "checklist",
      id: "checklist",
      title: "Make the Most of Your Listening Practice",
      intro: "Before you finish your listening practice, make sure you have:",
      items: [
        "Completed practice questions for all six sections.",
        "Practiced listening to each recording only once, as in the actual test.",
        "Developed a note-taking method that works for you.",
        "Analyzed your incorrect answers and identified common error patterns.",
        "Practiced understanding opinions, implied ideas, and main points.",
        "Completed a full practice test within the time limit.",
      ],
      outro: "For a more comprehensive preparation plan, combine listening activities with a full practice test and practice all four language skills.",
    },
    {
      type: "faq",
      id: "faq",
      title: "FAQ",
      intro: "Get answers to frequently asked questions about the CELPIP Listening test.",
      items: [
        { question: "What are the sections of the CELPIP Listening test?", answer: "The CELPIP-General Listening test consists of six sections: Problem Solving, Daily Life Conversation, Listening for Information, a News Item, a Discussion, and Viewpoints. There are a total of 38 scored questions in these sections." },
        { question: "How long is the CELPIP Listening test?", answer: "The Listening test takes about 46-55 minutes, including the recordings and the time to answer the questions." },
        { question: "During the CELPIP Listening test, can I take notes?", answer: "Yes. The test centre gives you paper and a pen. Write down keywords, names, numbers and other information in a way that doesn't cause you to lose your train of thought." },
        { question: "Is it possible to listen to the audio multiple times?", answer: "No. Each of the audio recordings only plays once on the test itself. Practising with one-time playback is a good way to prepare." },
        { question: "How can I boost my CELPIP Listening score?", answer: "Practise all six parts. Make quick notes. Check the answers and analyse your mistakes. Concentrate on the main points, the details, and the purpose and opinion of the speakers." },
        { question: "What questions are in CELPIP Listening?", answer: "Questions will test your knowledge of main ideas, details, problems and solutions, attitudes, opinions and viewpoints. You choose the best answer from a list of options." },
        { question: "How is the CELPIP Listening scored?", answer: "Your score is determined by the number of correct answers, which is then converted to a CELPIP level from 0 to 12. The conversion can differ slightly between test versions." },
      ],
    },
  ],
};

import type { SkillGuide } from "./types";

/** Copy from the content team's "Speaking Practice" doc (Nov 2026). */
export const speakingGuide: SkillGuide = {
  skill: "speaking",
  title: "CELPIP Speaking Practice Test 2026 – Free Online Practice",
  intro:
    "Prepare for your CELPIP Speaking test with 480 online CELPIP speaking practice questions covering all 8 speaking tasks (60 questions per task). Practice with questions as they are presented on the test, ranging from providing advice and sharing personal experiences, to comparing options, and expressing personal opinions, all in timed conditions. Receive feedback on your fluency and the organisation of your responses, plus an estimated CELPIP level out of 12 on supported practice responses. Determine your strengths and areas to improve upon before test day. Start your free CELPIP Speaking practice today.",
  badge: "480 practice questions · All 8 tasks",
  hero: {
    taskLabel: "Task 1 · Giving Advice",
    prompt: "Your friend is moving to a new city and feels nervous. Advise your friend on how to settle in.",
    stats: [
      { label: "Preparation", value: "0:30" },
      { label: "Speaking", value: "1:12" },
    ],
    visual: "wave",
    feedbackLabel: "Vocabulary · Listenability",
  },
  sections: [
    {
      type: "practice",
      id: "practice",
      title: "CELPIP Speaking Practice Test",
      intro: "Pick a task to start practising with real-format prompts and the real timers.",
      tasks: [
        { id: "1", label: "Task 1", name: "Giving Advice", description: "Give advice and explain your suggestions.", chips: ["Prep 30s", "Speak 90s"] },
        { id: "2", label: "Task 2", name: "Talking about a Personal Experience", description: "Describe a personal experience and provide relevant details.", chips: ["Prep 30s", "Speak 60s"] },
        { id: "3", label: "Task 3", name: "Describing a Scene", description: "Describe a picture, including the people and activities.", chips: ["Prep 30s", "Speak 60s"] },
        { id: "4", label: "Task 4", name: "Making Predictions", description: "Predict what might happen next based on a picture.", chips: ["Prep 30s", "Speak 60s"] },
        { id: "5", label: "Task 5", name: "Comparing and Persuading", description: "Compare two options and persuade someone to choose one.", chips: ["Prep 60s + 60s", "Speak 60s"] },
        { id: "6", label: "Task 6", name: "Dealing with a Difficult Situation", description: "Explain how you would handle a challenging situation.", chips: ["Prep 60s", "Speak 60s"] },
        { id: "7", label: "Task 7", name: "Expressing Opinions", description: "Express your opinion and support it with reasons.", chips: ["Prep 30s", "Speak 90s"] },
        { id: "8", label: "Task 8", name: "Describing an Unusual Situation", description: "Describe an unusual picture clearly to someone who cannot see it.", chips: ["Prep 30s", "Speak 60s"] },
      ],
    },
    {
      type: "table",
      id: "format",
      title: "CELPIP Speaking Test Format",
      intro:
        "The CELPIP-General Speaking test takes approximately 15 minutes and consists of eight tasks. You read each task prompt on the computer, use the allocated preparation time to organise your ideas, and record your response through a microphone.",
      columns: ["Task", "Preparation Time", "Speaking Time", "What It Asks You to Do"],
      rows: [
        ["Task 1: Giving Advice", "30 seconds", "90 seconds", "Give advice and explain your suggestions."],
        ["Task 2: Talking about a Personal Experience", "30 seconds", "60 seconds", "Describe a personal experience and provide relevant details."],
        ["Task 3: Describing a Scene", "30 seconds", "60 seconds", "Describe a picture, including the people and activities."],
        ["Task 4: Making Predictions", "30 seconds", "60 seconds", "Predict what might happen next based on a picture."],
        ["Task 5: Comparing and Persuading", "Part 1: 60 seconds · Part 2: 60 seconds", "Part 1: No speaking · Part 2: 60 seconds", "Compare two options and persuade someone to choose one."],
        ["Task 6: Dealing with a Difficult Situation", "60 seconds", "60 seconds", "Explain how you would handle a challenging situation."],
        ["Task 7: Expressing Opinions", "30 seconds", "90 seconds", "Express your opinion and support it with reasons."],
        ["Task 8: Describing an Unusual Situation", "30 seconds", "60 seconds", "Describe an unusual picture clearly to someone who cannot see it."],
      ],
    },
    {
      type: "cards",
      id: "tasks",
      title: "Explore the CELPIP Speaking Tasks",
      intro:
        "The CELPIP Speaking Test contains 8 tasks. These tasks measure your ability to communicate in common situations in your day-to-day life. Some examples of things you may be asked to do include: giving advice, talking about a photo or experience, predicting, comparing and contrasting choices, dealing with a difficult situation, and sharing an opinion. Knowing what you need to do in each task can help you prepare your ideas and plan your speaking time.",
      items: [
        { title: "Task 1: Giving Advice", text: "Propose some options to someone in a certain situation. Give reasons for your recommendations and include any relevant information to make your suggestions clear and persuasive." },
        { title: "Task 2: Discussing a Personal Experience", text: "Tell us about an incident in your life, for example a memorable event or a new or unexpected situation. Describe what happened, give details and structure your story so that it is easy for the listener to follow." },
        { title: "Task 3: Describing a Scene", text: "Tell what you see in a picture. Name people and things, and say what they are doing and what is around them. Tell only the most important details, and speak clearly so that your listener can visualize the picture." },
        { title: "Task 4: Making Predictions", text: "Describe what you think is likely to happen next, based on what you can see and what is happening in the picture rather than making guesses that are unrelated to the scene." },
        { title: "Task 5: Comparing and Persuading", text: "Compare two options, explain their advantages and disadvantages, and persuade the other person to choose the option that best meets their needs." },
        { title: "Task 6: Dealing With a Difficult Situation", text: "Explain how you would respond to a difficult situation: what you would say or do. Demonstrate that you have identified the problem, that you have a good idea of how to deal with it and that you would say or do the right thing in the circumstances." },
        { title: "Task 7: Expressing Opinions", text: "Say what you think about the topic and then explain why you think that way. Give clear reasons and examples, and arrange your ideas in a logical order so that the other person can understand what you believe and why." },
        { title: "Task 8: Describing an Unusual Situation", text: "Tell a story about an interesting or different picture. Describe the main people, objects and their actions so that the listener can get an idea of what the picture was like. Use the correct words to identify what was in the picture." },
      ],
    },
    {
      type: "tips",
      id: "how-to-practice",
      title: "How to Practice CELPIP Speaking Efficiently",
      intro:
        "Practise each task, listen to your recordings, and use what you learn to improve your next response. Focus on organising your ideas clearly and communicating them effectively within the time limit.",
      items: [
        { title: "Practise each speaking task separately", text: "Practise one speaking task at a time so that you understand the task requirements before moving on to the others. This way you can develop the right organisation for each task." },
        { title: "Practise under timed conditions", text: "Follow the preparation and speaking time limits to practise organising your ideas quickly and completing your responses within the allotted time." },
        { title: "Plan your main ideas and supporting details", text: "During preparation, select a few reasons, examples, or details to elaborate on your key idea." },
        { title: "Review your recordings", text: "Listen to your recordings and assess where words are hard to understand, if you tend to say words multiple times, have pauses between sentences or can't understand entire sentences." },
        { title: "Learn from sample answers", text: "Review sample speaking responses to learn how to organise ideas, support your main points, and use relevant vocabulary. Focus on how answers are structured rather than memorising complete responses." },
        { title: "Review and improve your answers", text: "Identify what you could explain more clearly or organise better, then record a revised response and compare the two versions." },
        { title: "Practise with different prompts", text: "Practise the same techniques with an unrelated topic so you can speak naturally instead of delivering memorised sentences." },
        { title: "Complete a full Speaking practice test", text: "Practise each of the tasks at the times given until you are able to do them all together fluently with stamina." },
      ],
    },
    {
      type: "sample",
      id: "samples",
      title: "CELPIP Speaking Sample Answers",
      intro: "A strong response to a real-format prompt, and what makes it work.",
      sample: {
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
      },
      links: [
        { title: "Task 1 template", text: "Giving Advice", href: "/blog/celpip-speaking-task-1-template" },
        { title: "Task 2 template", text: "Personal Experience", href: "/blog/celpip-speaking-task-2-template" },
        { title: "Task 3 guide", text: "Describing a Scene", href: "/blog/celpip-speaking-task-3" },
        { title: "Task 4 guide", text: "Making Predictions", href: "/blog/celpip-speaking-task-4" },
        { title: "Task 5 template", text: "Comparing and Persuading", href: "/blog/celpip-speaking-task-5-template" },
        { title: "Task 6 guide", text: "Difficult Situation", href: "/blog/celpip-speaking-task-6" },
        { title: "Task 7 template", text: "Expressing Opinions", href: "/blog/celpip-speaking-task-7-template" },
        { title: "Task 8 guide", text: "Unusual Situation", href: "/blog/celpip-speaking-task-8" },
      ],
    },
    {
      type: "scoring",
      id: "scoring",
      title: "How Is CELPIP Speaking Scored?",
      paragraphs: [
        "As with the other CELPIP tests, trained scorers determine your speaking score, although the CELPIP Speaking test is also supported by AI. Your performance is scored in four different categories (Content/Coherence, Vocabulary, Listenability, and Task Fulfillment), with each category representing a component of your speaking ability and contributing to your total CELPIP Speaking level, which is scored from 0-12.",
        "Your score tells you how well you communicated your ideas, how you presented and organised your response, your choice of words, and how well you met the demands of each task. Reading through the criteria will show you where to improve and direct your practice more successfully.",
      ],
    },
    {
      type: "scoring",
      id: "skills",
      title: "What Speaking Skills Should You Practice?",
      paragraphs: [
        "To improve your performance, focus on expressing your ideas clearly, organising your responses logically, and addressing each task effectively.",
      ],
      criteria: [
        { title: "Content/Coherence", text: "Express your ideas clearly and organise information so that your response flows naturally. Support your main points with relevant reasons and examples." },
        { title: "Vocabulary", text: "Use a range of accurate and appropriate words and expressions to convey your meaning. Practise choosing vocabulary that suits the topic and context, and avoid unnecessary repetition." },
        { title: "Listenability", text: "Speak clearly so that the listener can easily understand you. Practise your pronunciation, pace, intonation, and fluency. Work on reducing unnecessary pauses and filler words." },
        { title: "Task Fulfillment", text: "Follow the prompt and include the necessary information within the allotted time. Ensure your answer aligns with the task, maintains a suitable tone, and has sufficient detail to express your points clearly." },
      ],
    },
    {
      type: "list",
      id: "item-types",
      title: "Common CELPIP Speaking Item Types",
      intro:
        "Get used to doing all sorts of speaking exercises to practice talking about things, explaining situations and reacting to normal situations in English.",
      items: [
        { title: "Providing advice", text: "Give someone who has a difficulty some useful advice and tell them how it might be beneficial." },
        { title: "Describing personal experiences", text: "Talk about an event or experience from your life, providing relevant details in a clear, logical order." },
        { title: "Use your voice describing scenes", text: "Who are the people, what are the objects, what is happening, what does the place look like." },
        { title: "Making predictions", text: "Talk about what might happen next by using clues in the picture or the scene." },
        { title: "Compare and convince", text: "Compare two options to describe the benefits, and then persuade someone to opt for one of the options." },
        { title: "Dealing with difficult situations", text: "Explain how you would respond to a challenging situation using appropriate language and practical solutions." },
        { title: "Making comments", text: "Explain your view about a subject and support it with reasons and data." },
        { title: "Picturing an unusual scene", text: "Describe an unusual scene and then explain the details that make it unusual." },
      ],
    },
    {
      type: "checklist",
      id: "checklist",
      title: "Make the Most of Your Speaking Practice",
      intro: "Before finishing your CELPIP Speaking practice, make sure you have:",
      items: [
        "Completed all eight task types.",
        "Practised under the appropriate time limits.",
        "Recorded and reviewed your responses.",
        "Identified recurring grammar, vocabulary, or pronunciation issues.",
        "Worked on at least one specific weakness.",
        "Repeated a task to measure your progress.",
      ],
    },
    {
      type: "faq",
      id: "faq",
      title: "FAQ",
      intro: "See the most frequently asked questions about the CELPIP Speaking test.",
      items: [
        { question: "What can I do to increase my Speaking score?", answer: "Practise under timed test conditions and record your responses. Correct and redo the ones you find most difficult, focusing on the four scoring areas: Content/Coherence, Listenability, Vocabulary and Task Fulfillment. Note any mistakes and repeat the task to avoid making the same errors." },
        { question: "How can I sound more natural while speaking in the test?", answer: "Use familiar words and expressions, vary your sentence structures, and maintain a natural speaking pace. Avoid forcing advanced vocabulary or memorised phrases into your answers." },
        { question: "Is it okay to take notes during CELPIP Speaking?", answer: "You can take notes during the preparation time provided for each task. Use keywords to organise your ideas rather than writing complete sentences." },
        { question: "How many questions are there in the CELPIP Speaking part?", answer: "The CELPIP-General Speaking section consists of eight tasks, each designed to assess a different communication skill." },
        { question: "How do I deal with nerves and stress during the Speaking test?", answer: "Use a timer to practise, learn how to do all eight tasks and create a simple planning system. Concentrate on explaining your ideas rather than trying to get the perfect answer." },
        { question: "Is speed important in the CELPIP Speaking test?", answer: "Speaking too fast can make your speech less clear; speaking too slowly can leave some of your ideas underdeveloped. Find a natural rhythm and use your allotted time to your advantage." },
        { question: "Is there any time to think before I give my answer in the CELPIP Speaking?", answer: "Yes. Each task includes a designated preparation period, usually 30 or 60 seconds. Use this time to identify your main ideas and organise your response." },
        { question: "How is the CELPIP Speaking section scored?", answer: "Your responses are rated on four areas: Content/Coherence, Vocabulary, Listenability and Task Fulfillment. The result of your Speaking is displayed on the CELPIP level scale." },
      ],
    },
  ],
};

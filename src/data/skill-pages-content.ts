export interface SkillPageContent {
    title: string;
    /** 2–3 sentence direct answer for AI/search snippets — shown before CTAs. */
    answerFirstIntro: string;
    aiAnswer?: {
        question: string;
        answer: string;
    };
    description: string;
    tasks: {
        id: string;
        title: string;
        description: string;
    }[];
    tipsTitle: string;
    tips: string[];
    format: {
        title: string;
        description: string;
        points: string[];
    };
    scoreFocus?: {
        title: string;
        items: {
            label: string;
            detail: string;
        }[];
    };
    commonMistakes?: string[];
    faqs: {
        question: string;
        answer: string;
    }[];
}

export const skillPagesContent: Record<string, SkillPageContent> = {
    writing: {
        title: "Free CELPIP Writing Practice Exam",
        aiAnswer: {
            question: "What is the best way to practice CELPIP Writing?",
            answer:
                "The best way to practice CELPIP Writing is to write Task 1 emails and Task 2 survey responses under the official time limits, then review your answer for task fulfillment, paragraph structure, tone, vocabulary range, grammar, and word count. High-scoring practice should include model answers and feedback rather than only writing more responses.",
        },
        answerFirstIntro:
            "The CELPIP Writing test has two tasks—writing an email and responding to survey questions—and takes 53 minutes in total. You type your answers on a computer, and each task is scored on grammar, coherence, vocabulary, and task fulfillment. Scores are reported on the CELPIP scale from 1 to 12.",
        description:
            "Writing is a crucial part of the CELPIP test, since it shows how well you're capable of conveying ideas clearly and properly in written English. This <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice exam for Writing</a> uses real test-style email and survey tasks so you feel confident and ready. We also link to our broader <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice test</a> hub for full-section preparation.",
        tasks: [
            {
                id: "1",
                title: "Task #1",
                description: "Writing an Email",
            },
            {
                id: "2",
                title: "Task #2",
                description: "Survey Questions",
            },
        ],
        tipsTitle: "Tips to Improve Your CELPIP Writing Score",
        tips: [
            "Plan ahead before you write",
            "Take a few minutes to sketch out your ideas and framework",
            "Maintain a topic and cover all aspects of the task completely",
            "Practice under timing so that you finish both tasks within the given time frame",
            "Write in paragraphs. One idea per paragraph with supporting details. This is easier to read",
            "Get your tone right. Formal for work or complaint emails, less formal or friendly for personal emails.",
            "Proofread and edit",
            "Just check through your work for grammar, spelling, and punctuation errors if you can, as tiny improvements will boost your score",
            "Practice frequent themes. Complaint, request, and survey response emails about community or lifestyle problems are very frequent, so practicing such themes gives confidence.",
        ],
        format: {
            title: "CELPIP Writing Test Format (Quick Overview)",
            description:
                "It takes 53 minutes for the total Writing section in the CELPIP General writing Test. There are 2 tasks:",
            points: [
                "Task 1: Email Writing, write an email from a situation. You have ~27 minutes.",
                "Task 2: Answering Survey Questions, choose one option, say why, give reasons/examples. You have ~26 minutes. ~150-200 words.",
            ],
        },
        scoreFocus: {
            title: "What CELPIP Writing Scoring Rewards",
            items: [
                {
                    label: "Task fulfillment",
                    detail: "Answer every bullet in the prompt and stay close to the requested purpose, audience, and tone.",
                },
                {
                    label: "Coherence",
                    detail: "Use clear paragraphs, transitions, and a logical order so the reader can follow your ideas quickly.",
                },
                {
                    label: "Vocabulary and grammar",
                    detail: "Use accurate everyday English, varied sentence structures, and precise word choices without overcomplicating the response.",
                },
            ],
        },
        commonMistakes: [
            "Using a memorized template that does not match the prompt.",
            "Missing one required bullet point in Task 1.",
            "Writing too generally in Task 2 instead of giving specific reasons and examples.",
            "Using a tone that is too casual for formal emails or too stiff for friendly emails.",
        ],
        faqs: [
            {
                question: "Where can I practice CELPIP writing with sample answers?",
                answer:
                    "Our platform provides numerous writing prompts with sample answers to help you guide your practice.",
            },
            {
                question: "Do you have AI feedback on writing exercises?",
                answer:
                    "Yes. Writing is automatically scored by our AI engine with feedback on grammar, coherence, and vocabulary.",
            },
            {
                question:
                    "Are the practice tests identical to the CELPIP writing test?",
                answer:
                    "They are designed to be as close as possible to the real test format and difficulty.",
            },
            {
                question: "How do I improve my CELPIP writing score?",
                answer:
                    "Regular practice, reviewing sample high-scoring answers, and getting feedback are essential.",
            },
            {
                question: "What is the best platform for CELPIP writing practice?",
                answer:
                    "Our platform offers AI-powered feedback and realistic practice tasks to help you succeed.",
            },
            {
                question: "How do I organize my time for writing?",
                answer:
                    "Allocate time for planning, writing, and reviewing. Stick to the recommended time limits for each task.",
            },
        ],
    },
    listening: {
        title: "Free CELPIP Listening Practice Exam",
        aiAnswer: {
            question: "How should I practice for CELPIP Listening?",
            answer:
                "Practice CELPIP Listening by completing all six task types with audio that plays once, taking short notes for names, numbers, opinions, and changes in meaning, then reviewing wrong answers by question type. The goal is not just hearing English, but learning to catch paraphrased details under time pressure.",
        },
        answerFirstIntro:
            "The CELPIP Listening test has six parts with about 38 questions and takes approximately 47–55 minutes. You listen to conversations, discussions, news items, and problem-solving scenarios through headphones at a computer. Scores are reported on the CELPIP scale from 1 to 12.",
        description:
            "Listening is the most important skill in the CELPIP test, since it shows how well you can hear and understand everyday conversations and English news. This <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice exam for Listening</a> gives you realistic audio and tasks to build confidence before test day. You can also explore our full <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice test</a> resources from the home page.",
        tasks: [
            {
                id: "1",
                title: "Task #1",
                description: "Problem solving",
            },
            {
                id: "2",
                title: "Task #2",
                description: "a daily life conversation",
            },
            {
                id: "3",
                title: "Task #3",
                description: "Information",
            },
            {
                id: "5",
                title: "Task #5",
                description: "Discussion",
            },
            {
                id: "4",
                title: "Task #4",
                description: "News item",
            },
            {
                id: "6",
                title: "Task #6",
                description: "Viewpoints",
            },
        ],
        tipsTitle: "Tips to Get the Most Out of These Practice Tests",
        tips: [
            "Record notes as you listen, keywords help in noting down key points",
            "Go over your mistakes to identify areas of improvement",
            "Try timing yourself to simulate the actual test experience",
        ],
        format: {
            title: "CELPIP Listening Test Format (Quick Overview)",
            description:
                "The CELPIP Listening test is approximately 47-55 minutes long and has 6 sections with around 38 questions. You'll listen to conversations, discussions, problem-solving exercises, and news-announcement style reports, all designed to replicate actual use of English in Canada.",
            points: [],
        },
        scoreFocus: {
            title: "What CELPIP Listening Scoring Rewards",
            items: [
                {
                    label: "Main idea recognition",
                    detail: "Understand the overall purpose of a conversation, discussion, or news item before focusing on details.",
                },
                {
                    label: "Detail accuracy",
                    detail: "Track specific facts, changes, speaker preferences, and implied meanings from a single audio play.",
                },
                {
                    label: "Paraphrase awareness",
                    detail: "Expect answer choices to use different words from the recording while keeping the same meaning.",
                },
            ],
        },
        commonMistakes: [
            "Trying to write full sentences instead of short notes.",
            "Choosing an answer because it repeats a word from the audio.",
            "Missing speaker attitude, agreement, or hesitation.",
            "Practicing with replayable audio and then struggling when the real test plays once.",
        ],
        faqs: [
            {
                question:
                    "Where can I practice CELPIP listening with audio and answers?",
                answer:
                    "You can practice CELPIP listening on our platform with realistic audio, timed tasks, and answer review across all six listening parts.",
            },
            {
                question:
                    "Do your listening practice tests include all 6 parts of the test?",
                answer:
                    "Yes. Our CELPIP listening practice covers all six parts: Problem Solving, Daily Life Conversation, Listening for Information, News Item, Discussion, and Viewpoints.",
            },
            {
                question: "Are CELPIP listening practice tests timed?",
                answer:
                    "Yes. Timed practice is available so you can train under conditions closer to the real CELPIP listening exam.",
            },
            {
                question:
                    "Can I replay the audio during CELPIP listening practice?",
                answer:
                    "In the real CELPIP test, each audio clip plays once. Our practice tests follow the same rule so you build the note-taking and focus skills you need on exam day.",
            },
            {
                question: "What is the best website for CELPIP listening practice?",
                answer:
                    "A strong CELPIP listening site should offer authentic audio, all six task types, timed practice, and detailed review. That is the goal of our platform.",
            },
            {
                question: "How can I improve my CELPIP listening score?",
                answer:
                    "Improve by practicing regularly, taking notes on key details, reviewing incorrect answers, and building familiarity with Canadian accents and everyday English contexts.",
            },
        ],
    },
    reading: {
        title: "Free CELPIP Reading Practice Exam",
        aiAnswer: {
            question: "How should I practice for CELPIP Reading?",
            answer:
                "Practice CELPIP Reading by drilling all four task types: correspondence, applying a diagram, reading for information, and reading for viewpoints. Use timed passages, scan for details, watch for paraphrases, and review why wrong answer choices are tempting but incorrect.",
        },
        answerFirstIntro:
            "The CELPIP Reading test consists of scored questions across four task types: Correspondence, Diagram, Information, and Viewpoints. Test-takers have approximately 55 minutes to complete the section on a computer. Scores are reported on the CELPIP scale from 1 to 12.",
        description:
            "This <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice exam</a> for reading helps you build the exact skills tested on exam day: understanding correspondence, using diagrams, locating key details in information texts, and comparing viewpoints. Use these CELPIP reading practice tests to improve timing, accuracy, vocabulary recognition, and confidence before the real exam.",
        tasks: [
            {
                id: "1",
                title: "Task #1",
                description: "Correspondence",
            },
            {
                id: "2",
                title: "Task #2",
                description: "Apply a Diagram",
            },
            {
                id: "3",
                title: "Task #3",
                description: "Information",
            },
            {
                id: "4",
                title: "Task #4",
                description: "Viewpoints",
            },
        ],
        tipsTitle: "How to Improve Your CELPIP Reading Score",
        tips: [
            "Skim each passage first to understand the topic, tone, and paragraph structure before answering questions.",
            "Scan for names, dates, numbers, and synonyms because CELPIP often paraphrases the wording from the passage.",
            "Practice all four reading task types so you can switch quickly between correspondence, diagrams, information, and viewpoints.",
            "Answer every question, even when unsure, because unanswered items cannot earn marks.",
            "Use timed practice to build pacing and reduce the risk of spending too long on one difficult question.",
            "Review incorrect answers carefully to learn why the best option is correct and why the distractors are wrong.",
            "Build vocabulary in context so unfamiliar words do not slow you down during the exam.",
            "Track recurring mistakes by task type to focus your next study session on the weakest reading skill.",
        ],
        format: {
            title: "CELPIP Reading Test Format",
            description:
                "The CELPIP Reading test includes 38 scored questions plus a short unscored practice task. The section is designed to measure how well you understand common written English in practical and academic-style situations under time pressure.",
            points: [
                "Reading Correspondence: read routine emails or letters and identify purpose, details, and implied meaning.",
                "Reading to Apply a Diagram: connect written information to charts, schedules, maps, or diagrams.",
                "Reading for Information: locate main ideas, supporting details, and logical relationships in short articles.",
                "Reading for Viewpoints: compare opinions, attitudes, and arguments across a longer passage.",
            ],
        },
        scoreFocus: {
            title: "What CELPIP Reading Scoring Rewards",
            items: [
                {
                    label: "Fast comprehension",
                    detail: "Identify the purpose, audience, and structure of a passage before answering detailed questions.",
                },
                {
                    label: "Evidence-based answers",
                    detail: "Choose answers supported by the passage rather than outside knowledge or assumptions.",
                },
                {
                    label: "Viewpoint comparison",
                    detail: "Separate facts, opinions, tone, and speaker attitudes in longer viewpoint passages.",
                },
            ],
        },
        commonMistakes: [
            "Reading every word slowly before looking at the questions.",
            "Ignoring diagrams, headings, and layout clues.",
            "Choosing an answer that is true but not supported by the passage.",
            "Missing synonym and paraphrase relationships between question and passage.",
        ],
        faqs: [
            {
                question:
                    "Where can I obtain CELPIP reading practice tests with answers?",
                answer:
                    "You can practice CELPIP reading on our platform with realistic task formats, answer checking, and task-by-task preparation.",
            },
            {
                question:
                    "Do your reading practice tests include all 4 parts of the test?",
                answer:
                    "Yes. Our CELPIP reading practice test covers all four parts: Reading Correspondence, Reading to Apply a Diagram, Reading for Information, and Reading for Viewpoints.",
            },
            {
                question: "Are CELPIP reading practice tests timed?",
                answer:
                    "Yes, timed practice is available so you can train under conditions that feel closer to the real CELPIP reading exam.",
            },
            {
                question: "Can practice tests predict my CELPIP reading score?",
                answer:
                    "Practice tests can help estimate your current level, highlight weak task types, and show whether your timing and accuracy are improving.",
            },
            {
                question: "What is the best website for CELPIP reading practice?",
                answer:
                    "A strong CELPIP reading website should offer realistic question types, timed practice, detailed review opportunities, and coverage of all reading tasks. That is the goal of our platform.",
            },
            {
                question:
                    "How is it possible to improve the Reading score in the CELPIP test?",
                answer:
                    "Improve your score by practicing consistently, reviewing mistakes by task type, expanding vocabulary in context, and using timing strategies that prevent you from getting stuck on one question.",
            },
        ],
    },
    speaking: {
        title: "Free CELPIP Speaking Practice Exam",
        aiAnswer: {
            question: "How should I practice for CELPIP Speaking?",
            answer:
                "Practice CELPIP Speaking by recording timed answers for all eight tasks, then reviewing whether each response directly answers the prompt, has a simple structure, uses clear reasons or details, and sounds fluent without long pauses. The best practice combines real prompts, recordings, and feedback on fluency, pronunciation, vocabulary, and task completion.",
        },
        answerFirstIntro:
            "The CELPIP Speaking test includes eight timed tasks—from giving advice to expressing opinions—and takes about 15–20 minutes. You speak into a microphone while prompts appear on screen, and responses are scored for fluency, pronunciation, vocabulary, and task fulfillment. Scores are reported on the CELPIP scale from 1 to 12.",
        description:
            "Speaking skill is one of the most useful sections of the CELPIP test. This skill will show your natural English speaking ability. Improve fluency with this <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP practice exam for Speaking</a> and timed prompts that mirror the real test. Additional <a href='/' style='color: inherit; text-decoration: underline;'>CELPIP speaking practice test</a> material appears below to prepare you step by step.",
        tasks: [
            {
                id: "1",
                title: "Task #1",
                description: "Giving Advice",
            },
            {
                id: "2",
                title: "Task #2",
                description: "Talking about personal experience",
            },
            {
                id: "3",
                title: "Task #3",
                description: "Describing a Scene",
            },
            {
                id: "4",
                title: "Task #4",
                description: "Making predictions",
            },
            {
                id: "5",
                title: "Task #5",
                description: "Comparing and Persuading",
            },
            {
                id: "6",
                title: "Task #6",
                description: "Dealing with a difficult situation",
            },
            {
                id: "7",
                title: "Task #7",
                description: "Expressing opinions",
            },
            {
                id: "8",
                title: "Task #8",
                description: "Describing an unusual situation",
            },
        ],
        tipsTitle: "Tips to Improve Your CELPIP Speaking Score",
        tips: [
            "Take particular care with clarity and organization and express ideas in a logical manner.",
            "Answer completely",
            "Record your voice and check out fluency or pronunciation",
            "Improve your vocabulary based on Canadian english",
            "Speak about common daily topics",
            "Focus on phrases not speed",
            "Get feedback from english experts",
        ],
        format: {
            title: "CELPIP Speaking Test Format (Quick Overview)",
            description:
                "The CELPIP speaking test takes 15 to 20 minutes and includes 8 different tasks. The tasks are set in real-life contexts such as giving advice, describing experiences, making predictions, comparing and persuading, and giving opinions. You will use a microphone and questions are on-screen. Your answers will be recorded and checked by examiners. This test analyzes your Canadian English fluency, pronunciation, vocabulary etc.",
            points: [],
        },
        scoreFocus: {
            title: "What CELPIP Speaking Scoring Rewards",
            items: [
                {
                    label: "Task completion",
                    detail: "Answer the exact situation, include enough detail, and finish within the response time.",
                },
                {
                    label: "Fluency and coherence",
                    detail: "Speak in organized chunks with natural transitions and few long pauses.",
                },
                {
                    label: "Pronunciation and vocabulary",
                    detail: "Use clear, understandable speech and precise everyday vocabulary for the situation.",
                },
            ],
        },
        commonMistakes: [
            "Starting without a structure and running out of time.",
            "Speaking too fast, which reduces clarity.",
            "Giving generic answers that do not match the specific prompt.",
            "Pausing for too long while searching for advanced vocabulary.",
        ],
        faqs: [
            {
                question:
                    "Where do I conduct CELPIP speaking practice tests with all 8 tasks?",
                answer:
                    "You can practice all 8 tasks on our platform with realistic prompts and timing.",
            },
            {
                question: "Do you have AI scoring for speaking?",
                answer:
                    "Yes. Our AI speech analysis marks your responses and gives personalized feedback on fluency, pronunciation, and content.",
            },
            {
                question: "Are speaking practice tests timed as in the actual exam?",
                answer:
                    "Yes, the tests follow the strict timing of the actual CELPIP exam.",
            },
            {
                question:
                    "Is it possible to practice CELPIP speaking with real prompts?",
                answer:
                    "We provide realistic prompts that mirror those found in the actual test.",
            },
            {
                question: "What is the best CELPIP speaking practice site?",
                answer:
                    "We believe our comprehensive practice tools and AI feedback make us the best choice.",
            },
            {
                question: "How to improve the Speaking score in the CELPIP test?",
                answer:
                    "Practice regularly, record yourself, listen to your recordings, and work on minimizing pauses and fillers.",
            },
        ],
    },
};

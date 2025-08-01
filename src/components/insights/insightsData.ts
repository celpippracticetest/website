
import { SkillDataMap } from "./skillTypes";

export const sectionColors = {
  speaking: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    iconBg: "bg-pink-100",
    indicator: "bg-pink-400"
  },
  writing: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-100",
    indicator: "bg-blue-400"
  },
  reading: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    iconBg: "bg-violet-100",
    indicator: "bg-violet-400"
  },
  listening: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    iconBg: "bg-sky-100",
    indicator: "bg-sky-400"
  },
};

export const skillData: SkillDataMap = {
  listening: {
    title: "Listening Assessment",
    description: "Conversation: Job Interview Discussion",
    questionResults: [
      { type: "Multiple choice questions:", score: "6/8 correct" },
      { type: "Fill-in-the-blank:", score: "7/10 correct" },
      { type: "Note completion:", score: "4/6 correct" },
    ],
    feedback: [
      { 
        label: "COMPREHENSION LEVEL", 
        score: 7.0, 
        description: "Good understanding of main ideas and key details. Pay closer attention to specific numerical information."
      },
      { 
        label: "NOTE-TAKING SKILLS", 
        score: 6.5, 
        description: "You captured most main points but missed some specific details. Practice faster note-taking techniques."
      },
      { 
        label: "VOCABULARY RECOGNITION", 
        score: 7.5, 
        description: "Good recognition of common terms. Work on industry-specific vocabulary and idiomatic expressions."
      }
    ],
    focusAreas: [
      "Practice with faster speech rates and different accents.",
      "Work on identifying speaker attitudes and implied meanings."
    ]
  },
  speaking: {
    title: "Speaking Assessment",
    description: "Task: Describing a Recent Experience",
    questionResults: [
      { type: "Fluency:", score: "7/10" },
      { type: "Vocabulary usage:", score: "8/10" },
      { type: "Pronunciation:", score: "6/10" },
    ],
    feedback: [
      { 
        label: "FLUENCY & COHERENCE", 
        score: 6.5, 
        description: "You speak at a natural pace but with some hesitations. Work on connecting ideas more smoothly."
      },
      { 
        label: "VOCABULARY RANGE", 
        score: 7.0, 
        description: "Good use of common expressions. Try to incorporate more advanced and specific vocabulary."
      },
      { 
        label: "PRONUNCIATION & CLARITY", 
        score: 6.0, 
        description: "Generally clear pronunciation but some issues with word stress and intonation patterns."
      }
    ],
    focusAreas: [
      "Practice speaking without pauses on familiar topics.",
      "Work on sentence stress and intonation patterns."
    ]
  },
  writing: {
    title: "Writing Assessment",
    description: "Task: Opinion Essay on Environmental Issues",
    questionResults: [
      { type: "Task completion:", score: "8/10" },
      { type: "Coherence & cohesion:", score: "7/10" },
      { type: "Grammar accuracy:", score: "6/10" },
    ],
    feedback: [
      { 
        label: "TASK RESPONSE", 
        score: 7.5, 
        description: "Your essay addresses all parts of the prompt but could provide more detailed examples."
      },
      { 
        label: "COHERENCE & COHESION", 
        score: 6.5, 
        description: "Good paragraph structure but need better transitions between ideas."
      },
      { 
        label: "GRAMMATICAL RANGE", 
        score: 7.0, 
        description: "You use a variety of structures but make errors with complex sentences and tense consistency."
      }
    ],
    focusAreas: [
      "Practice writing complex sentences with proper punctuation.",
      "Work on developing more specific examples to support main ideas."
    ]
  },
  reading: {
    title: "Reading Assessment",
    description: "Passage: Scientific Article on Climate Change",
    questionResults: [
      { type: "Comprehension questions:", score: "7/10 correct" },
      { type: "Vocabulary in context:", score: "8/10 correct" },
      { type: "Matching information:", score: "5/8 correct" },
    ],
    feedback: [
      { 
        label: "READING SPEED", 
        score: 6.0, 
        description: "Moderate reading pace. Practice skimming and scanning techniques to improve efficiency."
      },
      { 
        label: "DETAIL RECOGNITION", 
        score: 7.5, 
        description: "Good at identifying main ideas, occasionally miss supporting details."
      },
      { 
        label: "INFERENCE SKILLS", 
        score: 6.5, 
        description: "Can make basic inferences but need to develop skills for deeper implicit meaning."
      }
    ],
    focusAreas: [
      "Practice reading complex academic texts under time constraints.",
      "Work on identifying the writer's attitude and purpose."
    ]
  }
};

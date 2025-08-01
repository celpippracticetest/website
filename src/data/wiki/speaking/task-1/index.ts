
import { WikiArticle } from '../../index';
import { introContent } from './intro-content';
import { taskOverview } from './task-overview';
import { stepByStepGuide } from './step-by-step-guide';
import { advancedVocabulary } from './advanced-vocabulary';
import { sampleResponse } from './sample-response';
import { finalTips } from './final-tips';

export const speakingTask1Guide: WikiArticle = {
  title: "Mastering CELPIP Speaking Task 1: Giving Advice",
  slug: "celpip-speaking-task-1-guide",
  description: "A comprehensive guide with a six-step approach for giving advice in CELPIP Speaking Task 1, including sentence starters and vocabulary to deliver a well-organized response.",
  category: "Speaking",
  color: "#3ef396", // Green color for speaking
  summary: "A structured approach to help you deliver clear, logical, and persuasive advice for Task 1.",
  content: `
    ${introContent}
    
    ${taskOverview}
    
    ${stepByStepGuide}
    
    ${advancedVocabulary}
    
    ${sampleResponse}
    
    ${finalTips}
  `
};

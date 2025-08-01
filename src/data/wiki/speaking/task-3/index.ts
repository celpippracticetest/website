
import { WikiArticle } from '../../index';
import { mainContent } from './main-content';
import { stepStructure } from './step-structure';
import { vocabulary } from './vocabulary';
import { finalTips } from './final-tips';
import { introContent } from './intro-content';
import { stepByStepGuide } from './step-by-step-guide';
import { advancedVocabulary } from './advanced-vocabulary';
import { sampleDescription } from './sample-description';
import { scoreTips } from './score-tips';

// Create the template article
export const speakingTask3Template: WikiArticle = {
  title: "CELPIP Speaking Task 3: Mastering the Art of Describing a Scene",
  slug: "celpip-speaking-task-3-template",
  description: "A comprehensive guide with a six-step method for CELPIP Speaking Task 3, including sample sentences and vocabulary for describing scenes vividly.",
  category: "Speaking",
  color: "#3ef396", // Green color for speaking
  summary: "A six-step approach to help you describe scenes vividly and comprehensively for Task 3.",
  content: `
    ${mainContent}
    
    ${stepStructure}
    
    ${vocabulary}
    
    ${finalTips}
  `
};

// Create the scene description article
export const speakingTask3SceneDescription: WikiArticle = {
  title: "How to Master Scene Description in CELPIP Speaking Task",
  slug: "celpip-speaking-task-3-scene-description",
  description: "A detailed step-by-step approach with rich vocabulary and structural tips for describing scenes effectively in CELPIP Speaking Task 3.",
  category: "Speaking",
  color: "#3ef396", // Green color for speaking
  summary: "Learn how to structure your scene descriptions with detailed steps and vocabulary to create vivid mental images for CELPIP Speaking Task 3.",
  content: `
    ${introContent}
    
    ${stepByStepGuide}
    
    ${advancedVocabulary}
    
    ${sampleDescription}
    
    ${scoreTips}
  `
};

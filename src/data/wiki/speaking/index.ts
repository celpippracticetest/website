
import { WikiArticle } from '../index';
import { speakingScoreGuide } from './speaking-score-guide';
import { speakingTipsHighScore } from './speaking-tips';
import { speakingTemplates } from './speaking-templates';
import { speakingTask1Template } from './task-1-template';
import { speakingTask1Guide } from './task-1/index';
import { speakingTask2Template } from './task-2/index';
import { speakingTask3Template, speakingTask3SceneDescription } from './task-3/index';
import { speakingTask4Template } from './task-4-template';
import { speakingTask5Template } from './task-5-template';
import { speakingTask6Template } from './task-6-template';
import { speakingTask7Template } from './task-7-template';
import { speakingTask8Template } from './task-8-template';
import { fluentSpeakersGuide } from './fluent-speakers-guide';

// Combine all speaking articles into a single array
export const speakingArticles: WikiArticle[] = [
  speakingTipsHighScore,
  speakingScoreGuide,
  speakingTemplates,
  speakingTask1Template,
  speakingTask1Guide,
  speakingTask2Template,
  speakingTask3Template,
  speakingTask3SceneDescription,
  speakingTask4Template,
  speakingTask5Template,
  speakingTask6Template,
  speakingTask7Template,
  speakingTask8Template,
  fluentSpeakersGuide
];

// Export individual articles for direct access
export { 
  speakingTipsHighScore, 
  speakingScoreGuide, 
  speakingTemplates,
  speakingTask1Template,
  speakingTask1Guide,
  speakingTask2Template,
  speakingTask3Template,
  speakingTask3SceneDescription,
  speakingTask4Template,
  speakingTask5Template,
  speakingTask6Template,
  speakingTask7Template,
  speakingTask8Template,
  fluentSpeakersGuide
};

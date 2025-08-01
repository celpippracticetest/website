
import { WikiArticle } from '../index';
import { writingScoreGuide } from './writing-score-guide';
import { writingTask1Template } from './task-1-template';
import { writingTask2Template } from './task-2-template';
import { nativeSpeakersLowScores } from './native-speakers-low-scores';

export const writingArticles: WikiArticle[] = [
  writingScoreGuide,
  writingTask1Template,
  writingTask2Template,
  nativeSpeakersLowScores
];

// Export individual templates for direct access
export { writingScoreGuide, writingTask1Template, writingTask2Template, nativeSpeakersLowScores };

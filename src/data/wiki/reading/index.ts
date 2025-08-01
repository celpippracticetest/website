
import { WikiArticle } from '../index';
import { readingScoreGuide } from './reading-score-guide';
import { provenStrategies } from './proven-strategies';

// Combine all reading articles into a single array
export const readingArticles: WikiArticle[] = [
  readingScoreGuide,
  provenStrategies
];

// Export individual articles for direct access
export { readingScoreGuide, provenStrategies };


import { WikiArticle } from '../index';
import { listeningScoreGuide } from './listening-score-guide';

// Combine all listening articles into a single array
export const listeningArticles: WikiArticle[] = [
  listeningScoreGuide
];

// Export individual articles for direct access
export { listeningScoreGuide };

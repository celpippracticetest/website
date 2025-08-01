
import { writingArticles } from './writing';
import { listeningArticles } from './listening';
import { speakingArticles } from './speaking';
import { readingArticles } from './reading/index';
import { generalArticles } from './general';

// Combine all articles into a single array
export const wikiArticles = [
  ...writingArticles,
  ...listeningArticles,
  ...speakingArticles,
  ...readingArticles,
  ...generalArticles
];

// Export all category arrays for direct access
export { writingArticles, listeningArticles, speakingArticles, readingArticles, generalArticles };

// Types
export interface WikiArticle {
  title: string;
  slug: string;
  description: string;
  category: string;
  color: string;
  summary: string;
  content: string;
}


import { WikiArticle } from './index';
import { sevenDaySprint } from './general/seven-day-sprint';
import { essentialStrategies } from './general/essential-strategies';
import { completeSpeakingGuide } from './general/complete-speaking-guide';
import { hardestQuestions } from './general/hardest-questions';
import { generalVsLS } from './general/general-vs-ls';
import { celpipOverview } from './general/celpip-overview';

export const generalArticles: WikiArticle[] = [
  celpipOverview,
  sevenDaySprint,
  essentialStrategies,
  completeSpeakingGuide,
  hardestQuestions,
  generalVsLS
];

// Export individual articles for direct access
export { sevenDaySprint, essentialStrategies, completeSpeakingGuide, hardestQuestions, generalVsLS, celpipOverview };

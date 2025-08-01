
import { WikiArticle } from '../../index';
import { mainContent } from './main-content';
import { sampleResponses } from './sample-responses';
import { vocabularyPhrases } from './vocabulary-phrases';
import { commonMistakes } from './common-mistakes';
import { finalTips } from './final-tips';

export const speakingTask2Template: WikiArticle = {
  title: "Mastering CELPIP Speaking Task 2: Personal Experience Template & Tips",
  slug: "celpip-speaking-task-2-template",
  description: "A comprehensive guide to sharing personal experiences effectively in CELPIP Speaking Task 2, with sample responses and vocabulary.",
  category: "Speaking",
  color: "#3ef396", // Green color for speaking
  summary: "Learn how to structure and deliver engaging personal stories for CELPIP Speaking Task 2.",
  content: `
    <h2>Introduction to Speaking Task 2</h2>
    
    ${mainContent}
    
    <h2>Sample Responses for Different Topics</h2>
    
    ${sampleResponses}
    
    <h2>Powerful Vocabulary & Phrases for Task 2</h2>
    
    ${vocabularyPhrases}
    
    <h2>Common Mistakes to Avoid</h2>
    
    ${commonMistakes}
    
    <h2>Final Tips for Success</h2>
    
    ${finalTips}
    
    <h2>Conclusion: Your Key to a High Score</h2>
    
    <p>CELPIP Speaking Task 2 is your chance to showcase your storytelling skills and express your thoughts clearly. With the right structure, vocabulary, and fluency, you'll create engaging responses that impress the examiners.</p>
    <p>✨ Now it's your turn! Think about a personal experience and practice describing it using this structure. 🎙✨</p>
    
    <h3>🚀 Next Steps:</h3>
    <ul>
      <li>🔹 Practice a few personal stories with a timer.</li>
      <li>🔹 Record and analyze your responses.</li>
      <li>🔹 Use different vocabulary words in each attempt.</li>
    </ul>
    
    <p>📌 <strong>Final Thought:</strong> Confidence comes with practice! The more you prepare, the more natural your responses will feel.</p>
    <p>💬 What's one personal story you'd use for this task? Try narrating it using today's tips! 😊</p>
  `
};

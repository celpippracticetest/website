/**
 * Seed starter blog posts into `public.blogs` when the table is empty.
 *
 * Usage (from `website/`):
 *   npm run seed:blogs
 *   npm run seed:blogs -- --force   # upsert even when posts already exist
 */
import "./bootstrap-website-env";
import documentsClient from "@/lib/appDocumentsClient";
import { closeSql, getSql } from "@/lib/pg/pool";
import { BlogRepository } from "@/repositories/blog.repo";
import type { TBlogWriteInput } from "@/models/blog.model";

const STARTER_POSTS: TBlogWriteInput[] = [
  {
    title: "Complete Guide to CELPIP Test Booking, Results, and CLB Scores",
    slug: "complete-guide-celpip-test-booking-results-clb",
    excerpt:
      "Everything you need to book your CELPIP test, understand your results, and map scores to CLB levels for PR and citizenship.",
    contentHtml: `
      <p>Booking your CELPIP test is a major step toward Canadian permanent residency, citizenship, or professional licensing. This guide walks you through registration, test day logistics, score release timelines, and how CLB levels map to your immigration goals.</p>
      <h2>How to book your CELPIP test</h2>
      <p>Create an account on the official CELPIP portal, choose CELPIP-General or CELPIP-General LS based on your requirement, pick a test centre or online sitting, and pay the exam fee. Seats fill quickly in major cities — book several weeks ahead if possible.</p>
      <h2>When results arrive</h2>
      <p>Most CELPIP-General results are available within 4–5 calendar days. You will receive an email when scores are ready. Download your official PDF and confirm the CLB level shown for each skill.</p>
      <h2>CLB and immigration</h2>
      <p>Express Entry, PNP streams, and citizenship applications reference Canadian Language Benchmark (CLB) levels — not raw CELPIP points alone. Compare your per-skill scores to the CLB table for your program before you submit documents.</p>
      <h2>Prepare before you book</h2>
      <p>Use full-length mock exams with realistic timing so test day feels familiar. Focus extra practice on any skill where you are more than one CLB band below your target.</p>
    `.trim(),
    status: "published",
    authorName: "CELPIP Practice Test Team",
    categories: ["Exam guide"],
    tags: ["booking", "results", "clb", "express entry"],
    seo: {
      metaTitle: "CELPIP Booking, Results & CLB Guide | CELPIPguide",
      metaDescription:
        "Book your CELPIP test with confidence. Learn result timelines, CLB mapping, and how scores fit Express Entry and citizenship requirements.",
      keywords: ["celpip booking", "celpip results", "clb scores", "celpip guide"],
    },
  },
  {
    title: "7 CELPIP Reading Tips to Improve Your Score Fast",
    slug: "celpip-reading-tips-increase-score-fast",
    excerpt:
      "Practical reading strategies for CELPIP Part 1–4: skimming, keyword tracking, and avoiding common wrong-answer traps.",
    contentHtml: `
      <p>CELPIP Reading rewards accuracy under time pressure. These seven tactics help you locate answers faster without sacrificing comprehension.</p>
      <h2>1. Read the question first</h2>
      <p>Know what you are hunting for before you read the passage. Underline names, dates, and negative words like <em>except</em> or <em>not</em>.</p>
      <h2>2. Skim for structure</h2>
      <p>Scan headings, first sentences, and transition words to map the passage layout. You can return for detail once you know where information lives.</p>
      <h2>3. Match paraphrases, not exact words</h2>
      <p>Correct options often restate ideas with synonyms. Eliminate choices that copy passage wording but change the meaning.</p>
      <h2>4. Watch for distractors</h2>
      <p>Wrong answers frequently use words from the text in an unrelated context. Confirm the entire statement, not just a familiar phrase.</p>
      <h2>5. Manage your clock</h2>
      <p>Divide time across parts before you start. If a question stalls you beyond 90 seconds, mark your best guess and move on.</p>
      <h2>6. Practice with Canadian contexts</h2>
      <p>CELPIP passages reflect everyday Canadian life — workplace email, community news, service notices. Train with material that mirrors that tone.</p>
      <h2>7. Review every mistake</h2>
      <p>Log why you missed each item: vocabulary, inference, or rushing. Targeted review beats repeating full tests without analysis.</p>
    `.trim(),
    status: "published",
    authorName: "CELPIP Practice Test Team",
    categories: ["Reading"],
    tags: ["reading", "tips", "score improvement"],
    seo: {
      metaTitle: "CELPIP Reading Tips to Boost Your Score | CELPIPguide",
      metaDescription:
        "Seven proven CELPIP Reading strategies: question-first reading, paraphrase matching, time management, and mistake review.",
      keywords: ["celpip reading tips", "celpip reading score", "celpip reading practice"],
    },
  },
  {
    title: "CELPIP Writing Task 1 & 2: Templates That Still Sound Natural",
    slug: "celpip-writing-task-templates-natural-tone",
    excerpt:
      "Email and survey response frameworks that meet CELPIP rubric expectations without sounding robotic or memorized.",
    contentHtml: `
      <p>Strong CELPIP Writing scores come from clear organization, appropriate tone, and enough specific detail to satisfy the rubric — not from stuffing memorized paragraphs into every prompt.</p>
      <h2>Task 1: Email structure</h2>
      <p>Open with purpose, add two developed body points with examples, and close with a polite action or offer. Match formality to the recipient (manager vs neighbour).</p>
      <h2>Task 2: Survey responses</h2>
      <p>State your position immediately, support it with two reasons, acknowledge the other side briefly, then restate your view. Use connectors naturally: <em>However</em>, <em>For instance</em>, <em>As a result</em>.</p>
      <h2>Avoid template red flags</h2>
      <p>Examiners penalize repetitive openings and vague filler. Swap generic phrases for details tied to the prompt — dates, names, locations, and concrete outcomes.</p>
      <h2>Build speed with timed drills</h2>
      <p>Practice 27-minute sittings weekly. Leave three minutes to proofread subject-verb agreement, punctuation, and word count.</p>
    `.trim(),
    status: "published",
    authorName: "CELPIP Practice Test Team",
    categories: ["Writing"],
    tags: ["writing", "templates", "task 1", "task 2"],
    seo: {
      metaTitle: "CELPIP Writing Templates (Natural Tone) | CELPIPguide",
      metaDescription:
        "Email and survey response frameworks for CELPIP Writing Task 1 and Task 2 that score well without sounding memorized.",
      keywords: ["celpip writing tips", "celpip email template", "celpip writing task 2"],
    },
  },
];

function parseArgs(argv: string[]) {
  return { force: argv.includes("--force") };
}

async function main() {
  const { force } = parseArgs(process.argv.slice(2));
  const sql = getSql();
  const repo = new BlogRepository(documentsClient);

  try {
    const countRows = await sql<{ c: number }[]>`
      SELECT COUNT(*)::int AS c FROM public.blogs
    `;
    const existing = countRows[0]?.c ?? 0;

    if (existing > 0 && !force) {
      console.log(`public.blogs already has ${existing} row(s). Skipping seed (use --force to upsert starters).`);
      return;
    }

    let created = 0;
    let skipped = 0;

    for (const post of STARTER_POSTS) {
      const found = await repo.findBlogBySlug(post.slug);
      if (found && !force) {
        skipped++;
        continue;
      }
      if (found && force) {
        await repo.updateBlog(found.id, post);
        created++;
        continue;
      }
      await repo.createBlog({
        ...post,
        publishedAt: new Date(),
      });
      created++;
    }

    console.log(`Seed complete: upserted=${created} skipped=${skipped}`);
  } finally {
    await closeSql();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

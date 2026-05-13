import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server-auth";
import documentsClient from "@/lib/appDocumentsClient";
import { WikiRepository } from "@/repositories/wiki.repo";
import { wikiArticles } from "@/data/wiki";

/**
 * POST /api/admin/wiki/seed
 * One-time (or re-run) seed: upserts all hardcoded wiki articles into the wikiArticles collection.
 * Preserves order via sortOrder. Requires auth.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const repo = new WikiRepository(documentsClient);
    let upserted = 0;

    for (let i = 0; i < wikiArticles.length; i++) {
      const article = wikiArticles[i];
      await repo.upsertBySlug(article.slug, {
        title: article.title,
        slug: article.slug,
        description: article.description ?? "",
        category: article.category ?? "General",
        color: article.color ?? "#3ebbf3",
        summary: article.summary ?? "",
        content: article.content ?? "",
        sortOrder: i,
      });
      upserted++;
    }

    return NextResponse.json({
      message: `Seeded ${upserted} wiki articles.`,
      count: upserted,
    });
  } catch (error) {
    console.error("Wiki seed failed:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}

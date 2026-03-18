import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { UserWordsRepository } from "@/repositories/userWords.repo";

function normalizeForCompare(word: string) {
    let normalized = word.toLowerCase().trim();
    const quoteEdges = /^['"`\u2018\u2019\u201C\u201D]+|['"`\u2018\u2019\u201C\u201D]+$/g;
    while (quoteEdges.test(normalized)) {
        normalized = normalized.replace(quoteEdges, "").trim();
    }
    return normalized;
}

export async function GET(_req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const repo = new UserWordsRepository(mongoClient);
        const { items } = await repo.getAllWords(user.id, 1000, 0);
        const userWordSet = new Set(items.map((item) => normalizeForCompare(item.word)));
        const rankedWords = await repo.getTopReviewedWords(100);

        const recommendations = rankedWords
            .map((word) => normalizeForCompare(word))
            .filter((word) => word.length > 0 && !userWordSet.has(word))
            .slice(0, 3);

        return NextResponse.json({ recommendations });
    } catch (error) {
        console.error("Word recommendations API error:", error);
        return NextResponse.json({ recommendations: [] });
    }
}

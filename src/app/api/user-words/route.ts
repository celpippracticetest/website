import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { UserWordsRepository } from "@/repositories/userWords.repo";
import { getDb } from "@/lib/mongodb";

const COMPLEXITY_PROMPT = `Classify the English vocabulary word into one CELPIP learner level:
- beginner
- intermediate
- advanced

Return only a JSON object in this exact shape:
{"complexityLevel":"beginner|intermediate|advanced"}`;

type ComplexityLevel = "beginner" | "intermediate" | "advanced";

async function classifyWordComplexity(word: string): Promise<ComplexityLevel> {
    if (!process.env.OPENROUTER_API_KEY) return "intermediate";

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://celpippracticetest.com",
                "X-Title": "CELPIP Practice Test",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "meta-llama/llama-3.1-8b-instruct:free",
                messages: [
                    { role: "system", content: COMPLEXITY_PROMPT },
                    { role: "user", content: `Word: "${word}"` },
                ],
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) return "intermediate";

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        if (!content) return "intermediate";

        const parsed = JSON.parse(content);
        const level = parsed?.complexityLevel;
        if (level === "beginner" || level === "intermediate" || level === "advanced") {
            return level;
        }
        return "intermediate";
    } catch {
        return "intermediate";
    }
}

export async function GET(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const word = req.nextUrl.searchParams.get("word");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const skip = parseInt(req.nextUrl.searchParams.get("skip") || "0");
    const repo = new UserWordsRepository(mongoClient);

    try {
        if (word) {
            const existing = await repo.findWord(user.id, word);
            return NextResponse.json({ saved: !!existing });
        }

        const { items, total } = await repo.getAllWords(user.id, limit, skip);
        return NextResponse.json({ items, total });
    } catch (error) {
        console.error("Error fetching user words:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { word } = await req.json();
        if (!word) {
            return NextResponse.json({ message: "Word is required" }, { status: 400 });
        }

        const repo = new UserWordsRepository(mongoClient);
        const complexityLevel = await classifyWordComplexity(word);
        const saved = await repo.saveWord(user.id, word, complexityLevel);
        const now = new Date();
        const db = await getDb();
        await db.collection("userwordstudyactivities").updateOne(
            { userId: user.id },
            {
                $set: {
                    userId: user.id,
                    lastWordAddedAt: now,
                    lastEngagedAt: now,
                    updatedAt: now,
                },
                $unset: {
                    reminderFlow: "",
                    reminderStage: "",
                    reminderStageIndex: "",
                    reminderVariant: "",
                    reminderWindowStartedAt: "",
                    remindersInWindow: "",
                },
                $setOnInsert: {
                    createdAt: now,
                },
            },
            { upsert: true }
        );
        return NextResponse.json(saved);
    } catch (error) {
        console.error("Error saving user word:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const word = req.nextUrl.searchParams.get("word");
        if (!word) {
            return NextResponse.json({ message: "Word is required" }, { status: 400 });
        }

        const repo = new UserWordsRepository(mongoClient);
        await repo.deleteWord(user.id, word);
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting user word:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const user = await currentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const { word, isLearned, action } = await req.json();
        if (!word) {
            return NextResponse.json({ message: "Word is required" }, { status: 400 });
        }

        const repo = new UserWordsRepository(mongoClient);
        if (action === "review") {
            const reviewed = await repo.incrementReviewedTimes(user.id, word);
            const db = await getDb();
            const now = new Date();
            await db.collection("userwordstudyactivities").updateOne(
                { userId: user.id },
                {
                    $set: {
                        userId: user.id,
                        lastStudiedAt: now,
                        lastEngagedAt: now,
                        updatedAt: now,
                    },
                    $unset: {
                        reminderFlow: "",
                        reminderStage: "",
                        reminderStageIndex: "",
                        reminderVariant: "",
                        reminderWindowStartedAt: "",
                        remindersInWindow: "",
                    },
                    $setOnInsert: {
                        createdAt: now,
                    },
                },
                { upsert: true }
            );
            return NextResponse.json(reviewed);
        }

        const updated = await repo.toggleLearned(user.id, word, isLearned);
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating user word:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

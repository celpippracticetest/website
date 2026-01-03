import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { UserWordsRepository } from "@/repositories/userWords.repo";

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
        const saved = await repo.saveWord(user.id, word);
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
        const { word, isLearned } = await req.json();
        if (!word) {
            return NextResponse.json({ message: "Word is required" }, { status: 400 });
        }

        const repo = new UserWordsRepository(mongoClient);
        const updated = await repo.toggleLearned(user.id, word, isLearned);
        return NextResponse.json(updated);
    } catch (error) {
        console.error("Error updating user word:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

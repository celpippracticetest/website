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
    const repo = new UserWordsRepository(mongoClient);

    try {
        if (word) {
            const existing = await repo.findWord(user.id, word);
            return NextResponse.json({ saved: !!existing });
        }

        const words = await repo.getAllWords(user.id);
        return NextResponse.json(words);
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

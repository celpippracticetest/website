import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import mongoClient from "@/lib/mongodb";
import { UserWordsRepository } from "@/repositories/userWords.repo";

export async function POST(req: NextRequest) {
    const ctx = await getAuthenticatedRequestContext(req);
    if (!ctx?.user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const user = ctx.user;

    try {
        const { words } = await req.json();
        if (!words || !Array.isArray(words)) {
            return NextResponse.json({ message: "Words array is required" }, { status: 400 });
        }

        const repo = new UserWordsRepository(mongoClient);
        await repo.saveBulkWords(user.id, words);
        return NextResponse.json({ message: "Words saved successfully" });
    } catch (error) {
        console.error("Error bulk saving user words:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

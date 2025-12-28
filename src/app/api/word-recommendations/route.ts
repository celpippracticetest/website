import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import mongoClient from "@/lib/mongodb";
import { UserWordsRepository } from "@/repositories/userWords.repo";

const SYSTEM_PROMPT = `You are an expert English language tutor. 
Recommend 3 high-level vocabulary words (CEFR B2-C2) for CELPIP/IELTS prep.
The words must be unique and NOT in the provided "Existing Words" list.

OUTPUT FORMAT:
You MUST return a JSON object with this EXACT structure:
{"recommendations": ["word1", "word2", "word3"]}

Do not include any other text.`;

export async function GET(req: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const repo = new UserWordsRepository(mongoClient);
        // Fetch more words to ensure AI knows what the user has
        const { items } = await repo.getAllWords(user.id, 500, 0);
        const existingWords = items.map(i => i.word.toLowerCase().trim());
        const existingSet = new Set(existingWords);

        const aiResponse = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
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
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: `Existing Words: ${JSON.stringify(existingWords)}` },
                    ],
                    response_format: { type: "json_object" },
                }),
            }
        );

        let finalRecommendations: string[] = [];

        if (aiResponse.ok) {
            const data = await aiResponse.json();
            const content = data.choices[0].message.content;
            console.log("AI Content:", content);

            try {
                const parsed = JSON.parse(content);
                const rawRecommendations = parsed.recommendations || parsed.words || (Array.isArray(parsed) ? parsed : []);

                // Filter out any duplicates locally as a safety measure
                finalRecommendations = rawRecommendations
                    .map((w: string) => w.trim())
                    .filter((w: string) => w.length > 0 && !existingSet.has(w.toLowerCase()));
            } catch (e) {
                console.error("JSON Parse Error:", e);
                finalRecommendations = ["Diligent", "Perspective", "Evaluate"].filter(w => !existingSet.has(w.toLowerCase()));
            }
        } else {
            console.error("OpenRouter Error:", await aiResponse.text());
            finalRecommendations = ["Acumen", "Pragmatic", "Eloquent"].filter(w => !existingSet.has(w.toLowerCase()));
        }

        // If we still don't have enough words, provide some high-quality defaults that likely aren't added
        if (finalRecommendations.length < 3) {
            const backups = ["Ephemeral", "Paradigm", "Surmount", "Resilient", "Alleviate"];
            for (const b of backups) {
                if (!existingSet.has(b.toLowerCase()) && !finalRecommendations.includes(b)) {
                    finalRecommendations.push(b);
                }
                if (finalRecommendations.length >= 3) break;
            }
        }

        return NextResponse.json({ recommendations: finalRecommendations.slice(0, 3) });
    } catch (error) {
        console.error("Word recommendations API error:", error);
        return NextResponse.json({ recommendations: [] });
    }
}

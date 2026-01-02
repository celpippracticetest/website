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
        // Fetch words to ensure AI knows what the user has
        const { items } = await repo.getAllWords(user.id, 500, 0);
        const existingWords = items.map(i => i.word.toLowerCase().trim());
        const existingSet = new Set(existingWords);

        // Limit words in prompt to avoid token limits for power users, 
        // but keep full set for local filtering.
        const recentWordsForAi = existingWords.slice(0, 100);

        let finalRecommendations: string[] = [];

        try {
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
                            { role: "user", content: `Existing Words: ${JSON.stringify(recentWordsForAi)}` },
                        ],
                        response_format: { type: "json_object" },
                        timeout: 10000,
                    }),
                }
            );

            if (aiResponse.ok) {
                const data = await aiResponse.json();
                const content = data.choices?.[0]?.message?.content;

                if (content) {
                    const parsed = JSON.parse(content);
                    const rawRecommendations = parsed.recommendations || parsed.words || (Array.isArray(parsed) ? parsed : []);

                    if (Array.isArray(rawRecommendations)) {
                        finalRecommendations = rawRecommendations
                            .map((w: any) => String(w).trim())
                            .filter((w: string) => w.length > 0 && !existingSet.has(w.toLowerCase()));
                    }
                }
            } else {
                console.error("OpenRouter Error status:", aiResponse.status);
            }
        } catch (aiError) {
            console.error("AI Recommendation fetch/parse error:", aiError);
        }

        // Expanded Fallback Lists (CEFR B2-C2 compatible)
        const primaryBackups = [
            "Conspicuous", "Ambiguous", "Eloquent", "Pragmatic", "Diligent",
            "Evaluate", "Perspective", "Acumen", "Resilient", "Alleviate",
            "Meticulous", "Substantial", "Advocate", "Consistent", "Diminish",
            "Equivocal", "Fastidious", "Gregarious", "Inherent", "Mitigate"
        ];

        const secondaryBackups = [
            "Ephemeral", "Paradigm", "Surmount", "Exacerbate", "Benevolent",
            "Capricious", "Dichotomy", "Enervate", "Fortuitous", "Ineffable",
            "Juxtapose", "Loquacious", "Nefarious", "Obfuscate", "Pervasive",
            "Rhetoric", "Sycophant", "Tenuous", "Ubiquitous", "Zealous"
        ];

        // Fill recommendations if AI failed or results were filtered out
        if (finalRecommendations.length < 3) {
            const allBackups = [...primaryBackups, ...secondaryBackups];
            for (const b of allBackups) {
                if (!existingSet.has(b.toLowerCase()) && !finalRecommendations.some(r => r.toLowerCase() === b.toLowerCase())) {
                    finalRecommendations.push(b);
                }
                if (finalRecommendations.length >= 3) break;
            }
        }

        return NextResponse.json({ recommendations: finalRecommendations.slice(0, 3) });
    } catch (error) {
        console.error("Word recommendations critical API error:", error);
        // Last line of defense: return ultra-safe defaults even on total crash
        return NextResponse.json({
            recommendations: ["Resilient", "Alleviate", "Perspective"].slice(0, 3)
        });
    }
}

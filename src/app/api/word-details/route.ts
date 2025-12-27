import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";

const SYSTEM_PROMPT = `You are a professional dictionary assistant. 
For a given English word, provide its phonetic transcription (IPA), and detailed definitions categorized by parts of speech.
Include examples for each definition where possible.

OUTPUT FORMAT:
Return only a JSON object with the following structure:
{
  "word": "Target",
  "phonetics": "/'tɑ:rgɪt/",
  "partsOfSpeech": [
    {
      "part": "noun",
      "definitions": [
        {
          "definition": "A goal or result that a person, organization, or system aims to achieve.",
          "example": "a target score, a performance target"
        }
      ]
    }
  ]
}

Only return the JSON object, no other text.`;

export async function GET(request: NextRequest) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const word = searchParams.get("word");

        if (!word) {
            return NextResponse.json({ error: "Word is required" }, { status: 400 });
        }

        const openRouterResponse = await fetch(
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
                    model: "google/gemini-2.0-flash-exp:free", // Using a fast/free model if possible, or fallback to qwen
                    messages: [
                        {
                            role: "system",
                            content: SYSTEM_PROMPT,
                        },
                        {
                            role: "user",
                            content: `Provide dictionary details for the word: "${word}"`,
                        },
                    ],
                    response_format: { type: "json_object" },
                }),
            }
        );

        if (!openRouterResponse.ok) {
            // Fallback to qwen if gemini fails or not available
            const fallbackResponse = await fetch(
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
                        model: "qwen/qwen3-next-80b-a3b-instruct",
                        messages: [
                            { role: "system", content: SYSTEM_PROMPT },
                            { role: "user", content: `Provide dictionary details for the word: "${word}"` },
                        ],
                    }),
                }
            );

            if (!fallbackResponse.ok) {
                throw new Error("AI provider failed");
            }
            const data = await fallbackResponse.json();
            const content = data.choices[0].message.content;
            return NextResponse.json(JSON.parse(content));
        }

        const data = await openRouterResponse.json();
        const content = data.choices[0].message.content;

        return NextResponse.json(JSON.parse(content));
    } catch (error) {
        console.error("Word details API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch word details" },
            { status: 500 }
        );
    }
}

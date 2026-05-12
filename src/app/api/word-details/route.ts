import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedRequestContext } from "@/lib/auth/request-auth";
import mongoClient from "@/lib/mongodb";
import { ObjectId } from "bson";

const SYSTEM_PROMPT = `You are a professional dictionary assistant helping students prepare for the CELPIP English proficiency exam. 
For a given English word, provide its phonetic transcription (IPA), and detailed definitions categorized by parts of speech. Include practical, everyday Canadian English examples for each definition. 

To help users maximize their score, include synonyms, common collocations, and a complexity level. Additionally, provide a specific "CELPIP Tip" on how to use this word effectively in the exam (e.g., for tone, transitions, or avoiding repetition) and a "Bonus Exam Strategies" array with actionable advice for getting the best result.

OUTPUT FORMAT:
Return only a JSON object with the following structure:
{
  "word": "Target",
  "phonetics": "/ˈtɑːrɡɪt/",
  "complexity_level": "Intermediate",
  "partsOfSpeech": [
    {
      "part": "noun",
      "definitions": [
        {
          "definition": "A goal or result that a person, organization, or system aims to achieve.",
          "example": "Meeting the target score requires consistent daily practice.",
          "synonyms": ["goal", "objective", "aim"],
          "collocations": ["achieve a target", "set a target", "reach a target"]
        }
      ]
    }
  ],
  "celpip_tip": "Use 'target' as a synonym to avoid repeating the word 'goal' in Speaking Task 5, as examiners reward candidates who do not repeat the same words.",
  "bonus_exam_strategies": [
    "Focus on using precise and accurate word choices rather than just overly complex language.",
    "Ensure your vocabulary matches the tone of the prompt, especially in formal vs. informal email tasks."
  ]
}

Only return the JSON object, no other text.`;

type WordDefinition = {
  definition: string;
  example?: string;
  synonyms: string[];
  collocations: string[];
};

type PartOfSpeech = {
  part: string;
  definitions: WordDefinition[];
};

type WordDetails = {
  word: string;
  phonetics: string;
  complexity_level: string;
  partsOfSpeech: PartOfSpeech[];
  celpip_tip: string;
  bonus_exam_strategies: string[];
};

type CachedWordDetails = {
  _id: ObjectId;
  wordKey: string;
  details: WordDetails;
  createdAt: Date;
  updatedAt: Date;
};

function normalizeWordKey(word: string) {
  return word.toLowerCase().trim();
}

function getWordDetailsCollection() {
  return mongoClient.db().collection<CachedWordDetails>("worddetails");
}

function ensureRequiredFields(details: WordDetails): WordDetails {
  const fallbackTip = `Use "${details.word}" naturally in CELPIP Speaking and Writing to improve lexical range and avoid repeating simpler words.`;
  const fallbackStrategies = [
    "Use this word in one clear, context-appropriate sentence instead of forcing it repeatedly.",
    "Match tone to task type: formal wording for email tasks and conversational wording for speaking prompts.",
  ];

  return {
    ...details,
    celpip_tip: details.celpip_tip?.trim() ? details.celpip_tip : fallbackTip,
    bonus_exam_strategies:
      details.bonus_exam_strategies.length > 0
        ? details.bonus_exam_strategies
        : fallbackStrategies,
  };
}

function isCacheComplete(details: WordDetails) {
  return Boolean(
    details.celpip_tip?.trim() &&
    details.partsOfSpeech.length > 0 &&
    details.bonus_exam_strategies.length > 0,
  );
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseMaybeJson(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch {
        // Continue to object extraction fallback.
      }
    }

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const objectSlice = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(objectSlice);
    }
    throw new Error("Invalid AI JSON payload");
  }
}

function extractChatContent(data: any): unknown {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return parseMaybeJson(content);
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item.text === "string") return item.text;
        return "";
      })
      .join("")
      .trim();
    if (!text) throw new Error("Empty AI response");
    return parseMaybeJson(text);
  }

  if (content && typeof content === "object") {
    return content;
  }

  throw new Error("Unsupported AI response format");
}

function normalizeWordDetails(raw: unknown, requestedWord: string): WordDetails {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const rawParts = Array.isArray(obj.partsOfSpeech)
    ? obj.partsOfSpeech
    : Array.isArray(obj.parts_of_speech)
      ? obj.parts_of_speech
      : [];

  const partsOfSpeech: PartOfSpeech[] = rawParts
    .filter((partObj): partObj is Record<string, unknown> => !!partObj && typeof partObj === "object")
    .map((partObj) => {
      const rawDefinitions = Array.isArray(partObj.definitions) ? partObj.definitions : [];
      const definitions: WordDefinition[] = rawDefinitions
        .filter((defObj): defObj is Record<string, unknown> => !!defObj && typeof defObj === "object")
        .map((defObj) => ({
          definition: typeof defObj.definition === "string" ? defObj.definition : "",
          example: typeof defObj.example === "string" ? defObj.example : undefined,
          synonyms: toStringArray(defObj.synonyms),
          collocations: toStringArray(defObj.collocations),
        }))
        .filter((item) => item.definition);

      return {
        part: typeof partObj.part === "string" ? partObj.part : "unknown",
        definitions,
      };
    })
    .filter((part) => part.definitions.length > 0);

  return {
    word: typeof obj.word === "string" ? obj.word : requestedWord,
    phonetics: typeof obj.phonetics === "string" ? obj.phonetics : "",
    complexity_level:
      typeof obj.complexity_level === "string"
        ? obj.complexity_level
        : typeof obj.complexityLevel === "string"
          ? obj.complexityLevel
          : "Intermediate",
    partsOfSpeech,
    celpip_tip:
      typeof obj.celpip_tip === "string"
        ? obj.celpip_tip
        : typeof obj.celpipTip === "string"
          ? obj.celpipTip
          : "",
    bonus_exam_strategies: toStringArray(
      Array.isArray(obj.bonus_exam_strategies)
        ? obj.bonus_exam_strategies
        : obj.bonusExamStrategies,
    ),
  };
}

async function requestWordDetails(word: string, model: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://celpippracticetest.com",
      "X-Title": "CELPIP Practice Test",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Provide dictionary details for the word: "${word}"` },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`Model failed: ${model}`);
  }

  const data = await response.json();
  return ensureRequiredFields(normalizeWordDetails(extractChatContent(data), word));
}

export async function GET(request: NextRequest) {
  try {
    const ctx = await getAuthenticatedRequestContext(request);
    if (!ctx?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = ctx.user;

    const { searchParams } = new URL(request.url);
    const word = searchParams.get("word");

    if (!word) {
      return NextResponse.json({ error: "Word is required" }, { status: 400 });
    }

    const wordKey = normalizeWordKey(word);
    const collection = getWordDetailsCollection();
    const cached = await collection.findOne({ wordKey });
    if (cached?.details && isCacheComplete(cached.details)) {
      return NextResponse.json(cached.details);
    }

    let details: WordDetails;
    try {
      details = await requestWordDetails(word, "google/gemini-2.0-flash-exp:free");
    } catch {
      details = await requestWordDetails(word, "qwen/qwen3-next-80b-a3b-instruct");
    }

    await collection.updateOne(
      { wordKey },
      {
        $set: {
          details,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          _id: new ObjectId(),
          wordKey,
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    return NextResponse.json(details);
  } catch (error) {
    console.error("Word details API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch word details" },
      { status: 500 },
    );
  }
}

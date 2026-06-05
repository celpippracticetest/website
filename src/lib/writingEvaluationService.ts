import { TPracticeDto } from "@/models/practice.model";
import { TTaskSchemaDto } from "@/models/tasks.model";
import {
  OPENROUTER_EVAL_MAX_TOKENS,
  OPENROUTER_EVAL_PROVIDER,
  OPENROUTER_EVAL_TEMPERATURE,
  resolveOpenRouterEvalModel,
} from "@/lib/openrouterEvaluation";

export type WritingEvalResult = {
  overall: number;
  contentAndCoherence: number;
  vocabulary: number;
  readabilityAndGrammar: number;
  taskFulfillment: number;
  feedback: string;
  grammarMistakes: { original: string; improvement: string | null }[];
  betterVersion: string;
  betterVersionAudio?: string;
};

const REQUIRED_FIELDS: (keyof WritingEvalResult)[] = [
  "overall",
  "contentAndCoherence",
  "vocabulary",
  "readabilityAndGrammar",
  "taskFulfillment",
  "feedback",
  "grammarMistakes",
  "betterVersion",
];

const TOOL_PARAMETERS = {
  type: "object",
  properties: {
    overall: {
      type: "number",
      description:
        "Overall Score out of 12. BE STRICT: 12 = PERFECT (zero mistakes), 11 = one minor error, 10 = 2-3 small errors, 8-9 = several issues, 6-7 = noticeable problems. OFF-TOPIC = maximum 5/12. TOO SHORT (under 150 words) = maximum 8/12. AVERAGE responses get 7-9, NOT 10-12.",
    },
    feedback: {
      type: "string",
      description:
        "Provide structured feedback exactly in these five sections with the exact headings and format:\n1. Enhance Professional Vocabulary\n2. Add Specific Details\n3. Formal Tone\n4. Proper Structure\n5. Transitional Phrases\nFor each section, briefly describe mistakes and improvement areas, provide specific suggestions, and offer an improved version of the user's text incorporating these enhancements.",
    },
    vocabulary: { type: "number" },
    betterVersion: {
      type: "string",
      description:
        "ALWAYS provide a better version. If response is ON-TOPIC: Rewrite improving grammar, vocabulary, and structure. If response is OFF-TOPIC or IRRELEVANT: Write a complete NEW response that correctly addresses the prompt requirements (150-200 words, formal tone, all requirements covered). Never leave this field empty.",
    },
    grammarMistakes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          original: { type: "string" },
          improvement: { type: ["string", "null"] },
        },
      },
    },
    taskFulfillment: { type: "number" },
    contentAndCoherence: { type: "number" },
    readabilityAndGrammar: { type: "number" },
  },
  required: REQUIRED_FIELDS,
};

function validateResult(parsed: Record<string, unknown>): WritingEvalResult {
  const missing = REQUIRED_FIELDS.filter(
    (f) => parsed[f] === undefined || parsed[f] === null
  );
  if (missing.length > 0) {
    throw new Error(
      `Model returned incomplete data. Missing: ${missing.join(", ")}`
    );
  }
  const betterVersion = String(parsed.betterVersion ?? "");
  if (betterVersion.trim().length < 50) {
    throw new Error("Model did not provide a valid betterVersion");
  }
  return parsed as WritingEvalResult;
}

function parseModelContent(messageContent: string): WritingEvalResult {
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(messageContent);
  } catch {
    const jsonMatch = messageContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]) as Record<string, unknown>;
    }
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Could not parse writing evaluation response");
  }
  return validateResult(parsed);
}

export async function evaluateWritingSubmission(input: {
  task: TTaskSchemaDto;
  practice: TPracticeDto;
  text: string;
}): Promise<{ result: WritingEvalResult; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const { task, practice, text } = input;
  const commandTemplate = task.antropicCommand?.userPrompt ?? "";
  let command = commandTemplate;

  if (command.includes("{{USER_TEXT}}")) {
    command = command.replace("{{USER_TEXT}}", text);
  } else if (command.includes("{{USER_RESPONSE}}")) {
    command = command.replace("{{USER_RESPONSE}}", text);
  }
  if (command.includes("{{WRITING_PROMPT}}")) {
    command = command.replace(
      "{{WRITING_PROMPT}}",
      practice.passages?.[0]?.body ?? ""
    );
  }

  const modelToUse = resolveOpenRouterEvalModel();
  const isQwen = modelToUse?.includes("qwen");
  let enhancedSystemPrompt = task.antropicCommand?.systemPrompt ?? "";
  if (isQwen) {
    enhancedSystemPrompt += `

CRITICAL SCORING RULES:
- MUST call CELPIPWritingEvaluation function
- BE STRICT: 12/12 = PERFECT (zero mistakes). ONE error = max 11/12
- OFF-TOPIC = taskFulfillment 0-3/12, overall max 5/12
- TOO SHORT (under 150 words) = reduce all by 2-3 points
- Average responses = 7-9/12, NOT 10-12
- ALWAYS provide betterVersion (if off-topic, write NEW correct response)

Scale: 12=Perfect | 10-11=Excellent | 8-9=Good | 6-7=Adequate | 4-5=Weak | 1-3=Poor`;
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  const openRouterResponse = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        "HTTP-Referer": "https://celpippracticetest.com",
        "X-Title": "CELPIP Practice Test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelToUse,
        max_tokens: OPENROUTER_EVAL_MAX_TOKENS,
        temperature: OPENROUTER_EVAL_TEMPERATURE,
        provider: OPENROUTER_EVAL_PROVIDER,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: command },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "CELPIPWritingEvaluation",
              description:
                "evaluating and providing feedback on a writing sample and content analysis scores",
              parameters: TOOL_PARAMETERS,
            },
          },
        ],
        tool_choice: {
          type: "function",
          function: { name: "CELPIPWritingEvaluation" },
        },
      }),
    }
  );

  if (!openRouterResponse.ok) {
    const errorData = await openRouterResponse.json().catch(() => ({}));
    console.error("OpenRouter API error:", errorData);
    throw new Error(`OpenRouter API failed: ${openRouterResponse.status}`);
  }

  const data = await openRouterResponse.json();
  const usage = {
    prompt_tokens: data.usage?.prompt_tokens || 0,
    completion_tokens: data.usage?.completion_tokens || 0,
  };

  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    const parsed = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    return { result: validateResult(parsed), usage };
  }

  const messageContent = data.choices?.[0]?.message?.content || "";
  return { result: parseModelContent(messageContent), usage };
}

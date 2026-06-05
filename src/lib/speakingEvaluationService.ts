import { TPracticeDto } from "@/models/practice.model";
import { TTaskSchemaDto } from "@/models/tasks.model";
import {
  OPENROUTER_EVAL_MAX_TOKENS,
  OPENROUTER_EVAL_PROVIDER,
  OPENROUTER_EVAL_TEMPERATURE,
  resolveOpenRouterEvalModel,
} from "@/lib/openrouterEvaluation";

export type SpeakingEvalResult = {
  overall: number;
  contentAndCoherence: number;
  vocabulary: number;
  readabilityAndGrammar: number;
  taskFulfillment: number;
  feedback: string;
  grammarMistakes: { original: string; improvement: string | null }[];
  betterVersion: string;
};

const REQUIRED_FIELDS: (keyof SpeakingEvalResult)[] = [
  "overall",
  "contentAndCoherence",
  "vocabulary",
  "readabilityAndGrammar",
  "taskFulfillment",
  "feedback",
  "grammarMistakes",
  "betterVersion",
];

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqLower = (arr: string[]) => {
  const seen = new Set<string>();
  return arr.filter((t) => {
    const k = t.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

function validateResult(parsed: Record<string, unknown>): SpeakingEvalResult {
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
  return {
    overall: Number(parsed.overall),
    contentAndCoherence: Number(parsed.contentAndCoherence),
    vocabulary: Number(parsed.vocabulary),
    readabilityAndGrammar: Number(parsed.readabilityAndGrammar),
    taskFulfillment: Number(parsed.taskFulfillment),
    feedback: String(parsed.feedback ?? ""),
    betterVersion,
    grammarMistakes: Array.isArray(parsed.grammarMistakes)
      ? (
          parsed.grammarMistakes as {
            original?: string;
            improvement?: string | null;
          }[]
        ).map((m) => ({
          original: m.original ?? "",
          improvement: m.improvement ?? null,
        }))
      : [],
  };
}

function parseModelContent(messageContent: string): SpeakingEvalResult {
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
    throw new Error("Could not parse speaking evaluation response");
  }
  return validateResult(parsed);
}

function buildSpeakingPrompts(input: {
  task: TTaskSchemaDto;
  practice: TPracticeDto;
  transcript: string;
  durationSeconds: number;
}): { command: string; systemPrompt: string } {
  const { task, practice, transcript, durationSeconds } = input;
  const commandTemplate = task.antropicCommand?.userPrompt ?? "";
  if (!commandTemplate) {
    throw new Error("Missing userPrompt");
  }
  const speakingPrompt = practice.passages?.[0]?.body ?? "";
  if (!speakingPrompt) {
    throw new Error("Missing speaking prompt");
  }

  let command = commandTemplate;

  if (command.includes("{{USER_RESPONSE}}")) {
    command = command.replaceAll("{{USER_RESPONSE}}", transcript);
  } else if (command.includes("{{SPOKEN_RESPONSE}}")) {
    command = command.replaceAll("{{SPOKEN_RESPONSE}}", transcript);
  }

  if (command.includes("{{SPEAKING_PROMPT}}")) {
    command = command.replaceAll("{{SPEAKING_PROMPT}}", speakingPrompt);
  } else if (command.includes("{{PROMPT}}")) {
    command = command.replaceAll("{{PROMPT}}", speakingPrompt);
  } else if (command.includes("{{SCENE_DESCRIPTION}}")) {
    const scene = practice.passages?.[1]?.body ?? "";
    command = command.replaceAll("{{SCENE_DESCRIPTION}}", scene);
  }

  const durationStr = String(durationSeconds);
  if (command.includes("{{SPEAKING_DURATION}}")) {
    command = command.replaceAll("{{SPEAKING_DURATION}}", durationStr);
  }

  const topics = uniqLower(
    (practice.passages ?? [])
      .map((p) => stripHtml(String(p?.description ?? p?.body ?? "")))
      .filter(Boolean)
  );

  let finalSystemPrompt = (task.antropicCommand?.systemPrompt ?? "").trim();

  if (topics.length) {
    const inlineTopics = topics.join(" | ");
    const hasTD = command.includes("{{TASK_DESCRIPTION}}");
    const hasTOPIC = command.includes("{{TOPIC}}");

    if (hasTD || hasTOPIC) {
      command = command
        .replaceAll("{{TASK_DESCRIPTION}}", inlineTopics)
        .replaceAll("{{TOPIC}}", inlineTopics);
    } else {
      const marker = "\n---\nTASK_TOPICS:";
      if (!command.includes(marker)) {
        const bulletTopics = topics.map((t) => `- ${t}`).join("\n");
        command += `

---
TASK_TOPICS:
${bulletTopics}

SCORING_RULES_FOR_TASK_FULFILLMENT:
- Heavily penalize off-topic responses.
- The response must meaningfully address at least ONE of the TASK_TOPICS above.
- If it doesn't address any, set "taskFulfillment" very low (e.g., 0–3/12) and reflect this in "overall".
- Do NOT reward fluency or grammar with high "overall" if the response is off-topic.`;
      }
    }

    const bulletForSystem = topics.map((t) => `- ${t}`).join("\n");
    finalSystemPrompt += `

The user must address at least ONE of the following TASK_TOPICS:
${bulletForSystem}

If the response is off-topic (i.e., does not address any topic above), sharply reduce "taskFulfillment" and lower "overall" accordingly.`;
  }

  const modelToUse = resolveOpenRouterEvalModel();
  const isQwen = modelToUse?.includes("qwen");
  if (isQwen) {
    finalSystemPrompt += `

CRITICAL SCORING RULES:
- MUST call CELPIPWritingEvaluation function
- BE STRICT: 12/12 = PERFECT (zero mistakes). ONE error = max 11/12
- OFF-TOPIC = taskFulfillment 0-3/12, overall max 5/12
- TOO SHORT = reduce all by 2-3 points
- Average responses = 7-9/12, NOT 10-12
- ALWAYS provide betterVersion (if off-topic, write NEW correct response)

Scale: 12=Perfect | 10-11=Excellent | 8-9=Good | 6-7=Adequate | 4-5=Weak | 1-3=Poor`;
  }

  return { command, systemPrompt: finalSystemPrompt };
}

export async function evaluateSpeakingSubmission(input: {
  task: TTaskSchemaDto;
  practice: TPracticeDto;
  transcript: string;
  durationSeconds: number;
}): Promise<{
  result: SpeakingEvalResult;
  usage: { prompt_tokens: number; completion_tokens: number };
}> {
  const { task } = input;
  const { command, systemPrompt } = buildSpeakingPrompts(input);
  const modelToUse = resolveOpenRouterEvalModel();

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
          { role: "system", content: systemPrompt },
          { role: "user", content: command },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "CELPIPWritingEvaluation",
              description:
                "evaluating and providing feedback on a speaking sample and content analysis scores",
              parameters: {
                type: "object",
                properties: {
                  overall: { type: "number", description: "Overall Score: (out of 12)" },
                  contentAndCoherence: {
                    type: "number",
                    description: "Content & Coherence: (out of 12)",
                  },
                  vocabulary: { type: "number", description: "Vocabulary: (out of 12)" },
                  readabilityAndGrammar: {
                    type: "number",
                    description: "Readability & Grammar: (out of 12)",
                  },
                  taskFulfillment: {
                    type: "number",
                    description:
                      "Task Fulfillment: (out of 12). Strictly tied to TASK_TOPICS; off-topic => low score.",
                  },
                  feedback: {
                    type: "string",
                    description: task.antropicCommand?.systemPrompt ?? "",
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
                  betterVersion: {
                    type: "string",
                    description:
                      "write a better version of this answer with all suggestion and improvement",
                  },
                },
                required: REQUIRED_FIELDS,
              },
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

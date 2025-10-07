import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import mongoClient from "@/lib/mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@deepgram/sdk";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { currentUser } from "@clerk/nextjs/server";
import { ExamPartsRepository } from "@/repositories/examParts.repo";
import { USER_PROMPTS } from "./userPrompts";
import { SYSTEM_PROPMTS } from "./systemPrompts";

/**
 * Wraps a promise with a timeout.
 * @throws Error('Operation timed out') if the promise does not resolve in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Operation timed out")),
      ms
    );
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function uploadAudioBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string | null> {
  const client = new S3Client({
    region: "eu-north-1",
    credentials: {
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ?? "",
    },
  });

  const upload = new Upload({
    client,
    params: {
      Bucket: "celtest-audio",
      Key: `RecordedSpeaking/${Date.now()}_${fileName}`,
      Body: buffer,
    },
  });

  try {
    const result = await upload.done();
    return result.Location ?? "";
  } catch (error) {
    console.error(
      "Upload failed" +
        process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID +
        " " +
        process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY,
      error
    );
    return null;
  }
}

const transcribeUrl = async (fileUrl: string) => {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  const url = fileUrl;
  const deepgram = createClient(deepgramApiKey);

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url },
    { smart_format: true, model: "nova-3", language: "en-US" }
  );

  if (error) throw error;
  if (!error) console.dir(result, { depth: null });
  return result;
};

// ========= Off-topic helpers =========
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

export const POST = async function (req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const location = await uploadAudioBuffer(buffer, "recording.m4a");
    if (!location) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 400 }
      );
    }

    const transcribeResult: any = await withTimeout(
      transcribeUrl(location),
      30000
    );

    const examPartRepo = new ExamPartsRepository(mongoClient);
    const examId = formData.get("examId") as string;
    const partId = formData.get("partId") as string;

    const examPart = await examPartRepo.findExamPartByExamIdAndPartId(
      examId,
      parseInt(partId)
    );
    if (!examPart || examPart.examId === undefined) {
      return NextResponse.json({ message: "exam not found" }, { status: 404 });
    }

    const commandTemplate = USER_PROMPTS[parseInt(partId)];

    let command = commandTemplate;
    const userAnswer =
      transcribeResult.results.channels[0].alternatives[0].transcript;

    if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replace("{{USER_RESPONSE}}", userAnswer);
    }
    if (command.includes("{{SPEAKING_RESPONSE}}")) {
      command = command.replace("{{SPEAKING_RESPONSE}}", userAnswer);
    }
    if (command.includes("{{SPOKEN_RESPONSE}}")) {
      command = command.replace("{{SPOKEN_RESPONSE}}", userAnswer);
    }
    if (command.includes("{{SPEAKING_PROMPT}}")) {
      command = command.replace(
        "{{SPEAKING_PROMPT}}",
        examPart.passages[0]?.body ?? ""
      );
    }
    if (command.includes("{{PROMPT}}")) {
      command = command.replace("{{PROMPT}}", examPart.passages[0]?.body ?? "");
    }
    if (command.includes("{{SCENE_DESCRIPTION}}")) {
      command = command.replace(
        "{{SCENE_DESCRIPTION}}",
        examPart.passages[1]?.body ?? ""
      );
    }

    if (command.includes("{{SPEAKING_DURATION}}")) {
      command = command.replace(
        "{{SPEAKING_DURATION}}",
        transcribeResult.metadata.duration ?? "60"
      );
    }

    // ========= OFF-TOPIC: gather all topics from passages[].description =========
    const topics = uniqLower(
      (examPart.passages ?? [])
        .map((p: any) => stripHtml((p?.description ?? p?.body).toString()))
        .filter(Boolean)
    );

    // تقویت system prompt
    let finalSystemPrompt = SYSTEM_PROPMTS[parseInt(partId)];

    if (topics.length) {
      const inlineTopics = topics.join(" | ");
      const hasTD = command.includes("{{TASK_DESCRIPTION}}");
      const hasTOPIC = command.includes("{{TOPIC}}");

      if (hasTD || hasTOPIC) {
        // همه placeholderهای موجود را با رشته‌ی خطی پر کن
        command = command
          .replaceAll("{{TASK_DESCRIPTION}}", inlineTopics)
          .replaceAll("{{TOPIC}}", inlineTopics);
      } else {
        // اگر placeholder نیست، بلاک موضوع/قوانین را اضافه کن (یک بار)
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

    // Determine which model to use
    const modelToUse = process.env.OPENROUTER_MODEL ;
    console.log("Using model:", modelToUse);

    // Enhance system prompt for models that don't support tool calling well
    const isQwen = modelToUse?.includes('qwen');
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

    // Call OpenRouter API with tool calling
    const openRouterResponse: any = await withTimeout(
      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://celpippracticetest.com",
          "X-Title": "CELPIP Practice Test",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelToUse,
          max_tokens: 20000,
          temperature: 1,
          // Force specific providers that work well
          provider: {
            order: ["DeepInfra", "Together", "Fireworks"],
            ignore: ["Hyperbolic"],
          },
          messages: [
            {
              role: "system",
              content: finalSystemPrompt,
            },
            {
              role: "user",
              content: command,
            },
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
                    overall: {
                      type: "number",
                      description: "Overall Score: (out of 12)",
                    },
                    contentAndCoherence: {
                      type: "number",
                      description: "Content & Coherence: (out of 12)",
                    },
                    vocabulary: {
                      type: "number",
                      description: "Vocabulary: (out of 12)",
                    },
                    readabilityAndGrammar: {
                      type: "number",
                      description: "Vocabulary: (out of 12)",
                    },
                    taskFulfillment: {
                      type: "number",
                      description: "Task Fulfillment: (out of 12)",
                    },
                    feedback: {
                      type: "string",
                      description:
                        "Provide structured feedback exactly in these five sections with the exact headings and format:\n1. Enhance Professional Vocabulary\n2. Add Specific Details\n3. Formal Tone\n4. Proper Structure\n5. Transitional Phrases\nFor each section, briefly describe mistakes and improvement areas, provide specific suggestions, and offer an improved version of the user's text incorporating these enhancements.",
                    },
                    grammarMistakes: {
                      type: "array",
                      description:
                        "a list of grammar or vocabulary mistakes and the correct way for that mistake, build an array that consist all part of provided text, each part should consist original and improve part and if that part doesnt need improvement it should set null for improvement but original part should has value.",
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
                  required: [
                    "overall",
                    "contentAndCoherence",
                    "vocabulary",
                    "readabilityAndGrammar",
                    "taskFulfillment",
                    "feedback",
                    "grammarMistakes",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "CELPIPWritingEvaluation" } },
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const errorData = await res.json();
          console.error("OpenRouter API error:", errorData);
          throw new Error(`OpenRouter API failed: ${res.status}`);
        }
        return res.json();
      }),
      60000
    );

    // Extract tool call result and format like Anthropic response
    const toolCall = openRouterResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("No tool call! Full response:", JSON.stringify(openRouterResponse, null, 2));
      
      // Fallback: Try to parse structured content from message
      const messageContent = openRouterResponse.choices?.[0]?.message?.content || "";
      let parsedResult: any = null;
      
      // Strategy 1: Try direct JSON parse
      try {
        parsedResult = JSON.parse(messageContent);
      } catch {
        // Strategy 2: Try to find JSON in markdown code blocks
        const jsonMatch = messageContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            parsedResult = JSON.parse(jsonMatch[1]);
          } catch (e) {
            console.error("Failed to parse JSON from code block", e);
          }
        }
      }
      
      if (!parsedResult || typeof parsedResult !== 'object') {
        console.error("All parsing strategies failed!");
        throw new Error(
          `This model does not support tool calling properly. Please use a different model (e.g., Claude). Provider: ${openRouterResponse.provider}, Model: ${openRouterResponse.model}`
        );
      }
      
      // Validate that all required fields exist - NO DEFAULTS FOR SCORES!
      const requiredFields = [
        'overall', 'contentAndCoherence', 'vocabulary', 
        'readabilityAndGrammar', 'taskFulfillment', 'feedback', 'grammarMistakes'
      ];
      
      const missingFields = requiredFields.filter(field => 
        parsedResult[field] === undefined || parsedResult[field] === null
      );
      
      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields);
        throw new Error(
          `Model returned incomplete data. Missing fields: ${missingFields.join(', ')}. Please use Claude instead of ${openRouterResponse.model}`
        );
      }
      
      // betterVersion is optional but Zod requires it - provide empty string if missing
      if (!parsedResult.betterVersion) {
        parsedResult.betterVersion = "";
      }
      
      console.log("Successfully extracted complete data from content");
      const msg: any = {
        content: [
          { type: "text", text: messageContent },
          { type: "tool_use", input: parsedResult },
        ],
        usage: {
          input_tokens: openRouterResponse.usage?.prompt_tokens || 0,
          output_tokens: openRouterResponse.usage?.completion_tokens || 0,
        },
      };

      const answerRepo = new WritingAnswerRepository(mongoClient);
      const contentInput = msg.content.find(
        (item: any) => item.input && typeof item.input === "object"
      )?.input ?? null;

      if (!contentInput) {
        throw new Error("Failed to extract evaluation data from model response");
      }

      const answer = await answerRepo.createOrUpdateAnswer({
        audioUrl: location,
        userId: user?.id,
        examId: examPart.examId,
        partId: examPart.partId,
        overalScore: contentInput.overall,
        type: "SPEAKING",
        result: contentInput,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return NextResponse.json({
        ...answer,
        usage: {
          prompt_tokens: msg?.usage?.input_tokens || 0,
          completion_tokens: msg?.usage?.output_tokens || 0,
        },
      });
    }
    
    const msg: any = {
      content: [
        {
          type: "text",
          text: openRouterResponse.choices?.[0]?.message?.content || "",
        },
        {
          type: "tool_use",
          input: toolCall?.function?.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {},
        },
      ],
      usage: {
        input_tokens: openRouterResponse.usage?.prompt_tokens || 0,
        output_tokens: openRouterResponse.usage?.completion_tokens || 0,
      },
    };

    // Ensure betterVersion exists in tool call result
    const toolInput = msg.content[1]?.input;
    if (toolInput && !toolInput.betterVersion) {
      toolInput.betterVersion = "";
    }

    const answerRepo = new WritingAnswerRepository(mongoClient);

    const contentInput =
      msg.content.find(
        (item: any) => item.input && typeof item.input === "object"
      )?.input ?? null;

    const answer = await answerRepo.createOrUpdateAnswer({
      audioUrl: location,
      userId: user?.id,
      examId: examPart.examId,
      partId: examPart.partId,
      overalScore: contentInput?.overall ?? 0,
      type: "SPEAKING",
      result: contentInput ?? {
        overall: 0,
        contentAndCoherence: 0,
        vocabulary: 0,
        readabilityAndGrammar: 0,
        taskFulfillment: 0,
        feedback: "",
        betterVersion: "",
        grammarMistakes: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return NextResponse.json({
      ...answer,
      usage: {
        prompt_tokens: msg?.usage?.input_tokens || 0,
        completion_tokens: msg?.usage?.output_tokens || 0,
      },
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
};

export const GET = async function (req: NextRequest) {
  const examId = req.nextUrl.searchParams.get("examId");
  const partId = req.nextUrl.searchParams.get("partId");
  if (!examId) {
    return NextResponse.json(
      { message: "exam ID is required" },
      { status: 400 }
    );
  }
  if (!partId) {
    return NextResponse.json(
      { message: "part ID is required" },
      { status: 400 }
    );
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const answerRepo = new WritingAnswerRepository(mongoClient);
  const answers = await answerRepo.getAllWritingAnswers(
    { userId: user.id, examId, partId: parseInt(partId), type: "SPEAKING" },
    0,
    100
  );
  return NextResponse.json(answers);
};

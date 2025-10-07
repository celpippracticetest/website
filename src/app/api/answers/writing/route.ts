import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { WritingAnswerRequestSchema } from "@/models/answer";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { currentUser } from "@clerk/nextjs/server";

export const POST = async function (req: NextRequest) {
  const body = await req.json();
  const answersParser = WritingAnswerRequestSchema.safeParse(body);
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (answersParser.success) {
    const answerBody = answersParser.data;
    const answerRepo = new WritingAnswerRepository(mongoClient);
    if (!user.publicMetadata.plan || user.publicMetadata.plan !== "premium") {
      const prevAnswer = await answerRepo.getAllWritingAnswers(
        { userId: user.id, practiceId: answerBody.practiceId, type: "WRITING" },
        0,
        100
      );
      if (prevAnswer.items.length > 2) {
        return NextResponse.json(
          { message: "You havent any free credit." },
          { status: 400 }
        );
      }
    }
    if (!answerBody.practiceId) {
      return NextResponse.json(
        { message: "Practice id didnt provide." },
        { status: 400 }
      );
    }
    const practiceRepo = new PracticeRepository(mongoClient);
    const practice = await practiceRepo.findPractice(answerBody.practiceId);
    if (!practice || practice.taskId === undefined) {
      return NextResponse.json(
        { message: "Practice not found" },
        { status: 404 }
      );
    }
    const taskRepo = new TaskRepository(mongoClient);
    const task: TTaskSchemaDto | null = await taskRepo.findTaskById(
      practice?.taskId ?? ""
    );
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 });
    }

    const commandTemplate = task.antropicCommand?.userPrompt ?? "";

    let command = commandTemplate;

    if (command.includes("{{USER_TEXT}}")) {
      command = command.replace("{{USER_TEXT}}", answerBody.text);
    } else if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replace("{{USER_RESPONSE}}", answerBody.text);
    }

    if (command.includes("{{WRITING_PROMPT}}")) {
      const writingPrompt = practice.passages?.[0]?.body ?? "";
      command = command.replace("{{WRITING_PROMPT}}", writingPrompt);
    }

    // Determine which model to use
    // Set OPENROUTER_MODEL in your environment variables to override
    // Examples: "qwen/qwen3-next-80b-a3b-instruct" or "anthropic/claude-3-7-sonnet-20250219"
    const modelToUse = process.env.OPENROUTER_MODEL ;
    
    console.log("Using model:", modelToUse);

    // Enhance system prompt for models that don't support tool calling well
    const isQwen = modelToUse?.includes('qwen');
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

    // Call OpenRouter API with tool calling
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
          model: modelToUse,
          max_tokens: 20000,
          temperature: 1,
          // Force specific providers that work well with Qwen
          provider: {
            order: ["DeepInfra", "Together", "Fireworks"],
            ignore: ["Hyperbolic"], // This provider doesn't respond properly
          },
          messages: [
            {
              role: "system",
              content: enhancedSystemPrompt,
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
                  "evaluating and providing feedback on a writing sample and content analysis scores",
                parameters: {
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
                    vocabulary: {
                      type: "number",
                      description:
                        "Vocabulary score out of 12. BE HARSH: Each imprecise word = -1 point. Repetitive vocabulary = -2 points. Lack of advanced words = maximum 9/12. Basic vocabulary = 6-8/12. One mistake = maximum 11/12.",
                    },
                    betterVersion: {
                      type: "string",
                      description:
                        "ALWAYS provide a better version. If response is ON-TOPIC: Rewrite improving grammar, vocabulary, and structure. If response is OFF-TOPIC or IRRELEVANT: Write a complete NEW response that correctly addresses the prompt requirements (150-200 words, formal tone, all requirements covered). Never leave this field empty.",
                    },
                    grammarMistakes: {
                      type: "array",
                      description:
                        "You are an experienced CELPIP Examiner. Analyze the user's response for vocabulary or grammatical errors. Output an array of objects with exactly two properties: 'original' (exact segment from user's text) and 'improvement' (corrected segment or null if correct). Break down the entire response into consecutive segments, ensuring every word, punctuation, space, and newline is included, allowing the exact reconstruction of the original user response. Isolate only the incorrect word or punctuation mark in one object with the corrected form in 'improvement'. If no mistake is found, set 'improvement' to null. Never duplicate identical texts in 'original' and 'improvement'. Preserve all original formatting precisely.Don't take spaces or \":\" as mistake.set improvement null and only fill original if improvement and original are the same.If I put all original part together I should be able to build original user response.",
                      items: {
                        type: "object",
                        properties: {
                          original: { type: "string" },
                          improvement: { type: ["string", "null"] },
                        },
                      },
                    },
                    taskFulfillment: {
                      type: "number",
                      description:
                        "Task Fulfillment score out of 12. STRICT: Missing any prompt requirement = -3 points. Incomplete address = maximum 9/12. Vague or generic = 6-8/12. Perfect coverage = 12/12 (rare).",
                    },
                    contentAndCoherence: {
                      type: "number",
                      description:
                        "Content & Coherence score out of 12. CRITICAL: Weak transitions = -2 points. Poor structure = -3 points. Unclear ideas = -2 points. Missing paragraphing = -2 points. Good but not perfect = 8-9/12.",
                    },
                    readabilityAndGrammar: {
                      type: "number",
                      description:
                        "Readability & Grammar score out of 12. STRICT: Each grammar error = -1 point. Awkward phrasing = -1 point. Run-on sentences = -2 points. One error = maximum 11/12. Multiple errors = 7-9/12. TOO SHORT or SIMPLE responses = maximum 9/12 even if no errors.",
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
      }
    );

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.json();
      console.error("OpenRouter API error:", errorData);
      throw new Error(`OpenRouter API failed: ${openRouterResponse.status}`);
    }

    const data = await openRouterResponse.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    console.log("=== OPENROUTER DEBUG ===");
    console.log("Environment:", process.env.VERCEL_ENV || "local");
    console.log("Model requested:", data.model);
    console.log("Provider:", data.provider);
    console.log("Tool call found:", !!toolCall);
    console.log(
      "Message content:",
      data.choices?.[0]?.message?.content?.substring(0, 100)
    );

    if (!toolCall) {
      console.error(
        "No tool call! Full response:",
        JSON.stringify(data, null, 2)
      );
      
      // Fallback: Try to parse structured content from message
      const messageContent = data.choices?.[0]?.message?.content || "";
      
      // Try to extract JSON-like structure from content
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
          `This model does not support tool calling properly. Please use a different model (e.g., Claude). Provider: ${data.provider}, Model: ${data.model}`
        );
      }
      
      // Validate that all required fields exist - NO DEFAULTS!
      const requiredFields = [
        'overall', 'contentAndCoherence', 'vocabulary', 
        'readabilityAndGrammar', 'taskFulfillment', 'feedback', 
        'grammarMistakes', 'betterVersion'
      ];
      
      const missingFields = requiredFields.filter(field => 
        parsedResult[field] === undefined || parsedResult[field] === null
      );
      
      if (missingFields.length > 0) {
        console.error("Missing required fields:", missingFields);
        throw new Error(
          `Model returned incomplete data. Missing fields: ${missingFields.join(', ')}. Please use Claude instead of ${data.model}`
        );
      }
      
      // Validate betterVersion is not empty
      if (!parsedResult.betterVersion || parsedResult.betterVersion.trim().length < 50) {
        console.error("betterVersion is empty or too short:", parsedResult.betterVersion);
        throw new Error(
          `Model did not provide proper betterVersion (must be at least 50 characters). This model is not suitable for evaluation. Please use Claude instead of ${data.model}`
        );
      }
      
      // Use parsed result as tool call
      console.log("Successfully extracted complete data from content");
      const msg: any = {
        content: [
          { type: "text", text: messageContent },
          {
            type: "tool_use",
            input: parsedResult,
          },
        ],
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };

      const answer = await answerRepo.createAnswer({
        text: answerBody.text,
        userId: user?.id,
        practiceId: answerBody.practiceId,
        overalScore: parsedResult.overall,
        type: "WRITING",
        result: parsedResult,
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
        { type: "text", text: data.choices?.[0]?.message?.content || "" },
        {
          type: "tool_use",
          input: toolCall?.function?.arguments
            ? JSON.parse(toolCall.function.arguments)
            : null,
        },
      ],
      usage: {
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
      },
    };

    // Validate betterVersion in tool call result
    const toolInput = msg.content[1]?.input;
    if (toolInput) {
      if (!toolInput.betterVersion || toolInput.betterVersion.trim().length < 50) {
        console.error("betterVersion is missing or too short");
        throw new Error(
          `Model did not provide proper betterVersion. This model is not suitable. Please use Claude instead of ${data.model}`
        );
      }
    }

    const answer = await answerRepo.createAnswer({
      text: answerBody.text,
      userId: user?.id,
      practiceId: answerBody.practiceId,
      overalScore:
        msg &&
        msg.content.length > 1 &&
        msg.content[1].input &&
        msg.content[1].input.overall
          ? msg.content[1].input.overall
          : 0,
      type: "WRITING",
      result:
        msg && msg.content.length > 1 && msg.content[1].input
          ? msg.content[1].input
          : {
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
  } else {
    return NextResponse.json({ message: answersParser.error }, { status: 400 });
  }
};

export const GET = async function (req: NextRequest) {
  const practiceId = req.nextUrl.searchParams.get("practiceId");
  if (!practiceId) {
    return NextResponse.json(
      { message: "Practice ID is required" },
      { status: 400 }
    );
  }
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const answerRepo = new WritingAnswerRepository(mongoClient);
  const answers = await answerRepo.getAllWritingAnswers(
    { userId: user.id, practiceId, type: "WRITING" },
    0,
    100
  );
  return NextResponse.json(answers);
};

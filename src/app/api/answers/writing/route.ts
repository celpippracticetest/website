import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { WritingAnswerRequestSchema } from "@/models/answer";
import Anthropic from "@anthropic-ai/sdk";
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
    const anthropic = new Anthropic({
      // defaults to process.env["ANTHROPIC_API_KEY"]
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    const commandTemplate = task.antropicCommand?.userPrompt ?? "";

    let command = commandTemplate;

    if (command.includes("{{USER_TEXT}}")) {
      command = command.replace("{{USER_TEXT}}", answerBody.text);
    } else if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replace("{{USER_RESPONSE}}", answerBody.text);
    }

    if (command.includes("{{WRITING_PROMPT}}")) {
      command = command.replace(
        "{{WRITING_PROMPT}}",
        practice.passages[0].body
      );
    }
    const msg = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 20000,
      temperature: 1,
      system: task.antropicCommand?.systemPrompt ?? "",
      tools: [
        {
          name: "CELPIPWritingEvaluation",
          description:
            "evaluating and providing feedback on a writing sample and content analysis scores",
          input_schema: {
            type: "object",
            properties: {
              overall: {
                type: "number",
                description:
                  "You are an experienced CELPIP Examiner. Read the whole user response carefully and provide an Overall Score out of 12. If there is only one minor vocabulary or grammatical mistake, the score should reflect exactly one point deduction (score = 11). Multiple mistakes should be accurately reflected in the overall score.",
              },
              feedback: {
                type: "string",
                description:
                  "Provide structured feedback exactly in these five sections with the exact headings and format:\n1. Enhance Professional Vocabulary\n2. Add Specific Details\n3. Formal Tone\n4. Proper Structure\n5. Transitional Phrases\nFor each section, briefly describe mistakes and improvement areas, provide specific suggestions, and offer an improved version of the user's text incorporating these enhancements.",
              },
              vocabulary: {
                type: "number",
                description:
                  "As an experienced CELPIP Examiner, assess the user's response and assign an accurate Vocabulary score out of 12. One vocabulary mistake equals a one-point deduction.",
              },
              betterVersion: {
                type: "string",
                description:
                  "Rewrite the entire user's email as a polished, formal business email. Highlight the most professional vocabulary choices using bold (e.g., grave concerns, numerous critical errors, translation inadequacies). Maintain the original paragraph structure (opening, body, conclusion, sign-off).",
              },
              grammarMistakes: {
                type: "array",
                description:
                  "You are an experienced CELPIP Examiner. Analyze the user's response for vocabulary or grammatical errors. Output an array of objects with exactly two properties: 'original' (exact segment from user's text) and 'improvement' (corrected segment or null if correct). Break down the entire response into consecutive segments, ensuring every word, punctuation, space, and newline is included, allowing the exact reconstruction of the original user response. Isolate only the incorrect word or punctuation mark in one object with the corrected form in 'improvement'. If no mistake is found, set 'improvement' to null. Never duplicate identical texts in 'original' and 'improvement'. Preserve all original formatting precisely.Don't take spaces or \":\" as mistake.set improvement null and only fill original if improvement and original are the same.If I put all original part together I should be able to build original user response.",
              },
              taskFulfillment: {
                type: "number",
                description:
                  "Evaluate the user's response for Task Fulfillment, providing an accurate and fair score out of 12.",
              },
              contentAndCoherence: {
                type: "number",
                description:
                  "Evaluate the user's response for Content & Coherence, assigning an accurate and fair score out of 12.",
              },
              readabilityAndGrammar: {
                type: "number",
                description:
                  "Evaluate the user's response for Readability & Grammar, assigning an accurate and fair score out of 12. One grammatical mistake equals a one-point deduction.",
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
        // {
        //     name: "CELPIPWritingEvaluation",
        //     description: "evaluating and providing feedback on a writing sample",
        //     input_schema: {
        //       type: "object",
        //       properties: {
        //         feedback: {
        //           type: "string",
        //           description: "the full feedback on writng sample",
        //         },
        //       },

        //     },
        //   },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: command,
            },
          ],
        },
      ],
    });

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
    return NextResponse.json(answer);
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

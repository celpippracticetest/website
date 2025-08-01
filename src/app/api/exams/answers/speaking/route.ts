import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import mongoClient from "@/lib/mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
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
      accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID ?? "", // Replace with your AWS Access Key ID
      secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRETE_ACCESS_KEY ?? "", // Replace with your AWS Secret Access Key
    },
  });

  const upload = new Upload({
    client,
    params: {
      Bucket: "celtest-audio", // Your bucket name
      Key: `RecordedSpeaking/${Date.now()}_${fileName}`, // Unique key for the file
      Body: buffer,
    },
  });

  try {
    const result = await upload.done();
    return result.Location ?? ""; // Replace with your bucket's URL format
  } catch (error) {
    console.error("Upload failed", error);
    return null;
  }
}
const transcribeUrl = async (fileUrl: string) => {
  // The API key we created in step 3
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  // Hosted sample file
  const url = fileUrl;

  // Initializes the Deepgram SDK
  const deepgram = createClient(deepgramApiKey);

  const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
    { url },
    { smart_format: true, model: "nova-3", language: "en-US" }
  );

  if (error) throw error;
  if (!error) console.dir(result, { depth: null });
  return result;
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

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
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

    const msg: any = await withTimeout(
      anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 20000,
        temperature: 1,
        system: SYSTEM_PROPMTS[parseInt(partId)],
        tools: [
          {
            name: "CELPIPWritingEvaluation",
            description:
              "evaluating and providing feedback on a speaking sample and content analysis scores",
            input_schema: {
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
          // {
          //     name: "CELPIPWritingEvaluation",
          //     description: "evaluating and providing feedback on a speaking sample",
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
      }),
      60000
    );

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
    return NextResponse.json(answer);
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

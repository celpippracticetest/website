import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createClient } from "@deepgram/sdk";
import Anthropic from "@anthropic-ai/sdk";
import { PracticeRepository } from "@/repositories/practice.repo";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { TPracticeDto } from "@/models/practice.model";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { currentUser } from "@clerk/nextjs/server";
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
    return result.Location ?? "";
  } catch (error) {
    console.error("Upload failed", error);
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

    const transcribeResult = await transcribeUrl(location);

    const practiceRepo = new PracticeRepository(mongoClient);
    const practiceId = formData.get("practiceId") as string;
    const practice: TPracticeDto | null = await practiceRepo.findPractice(
      practiceId
    );
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
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const commandTemplate = task.antropicCommand?.userPrompt;
    let command: any = commandTemplate;

    const userAnswer =
      transcribeResult.results.channels[0].alternatives[0].transcript;

    // Inject user answer
    if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replace("{{USER_RESPONSE}}", userAnswer);
    } else if (command.includes("{{SPOKEN_RESPONSE}}")) {
      command = command.replace("{{SPOKEN_RESPONSE}}", userAnswer);
    } else if (command.includes("{{SPOKEN_RESPONSE}}")) {
      command = command.replace("{{SPOKEN_RESPONSE}}", userAnswer);
    }

    // Inject speaking prompt / scene
    if (command.includes("{{SPEAKING_PROMPT}}")) {
      command = command.replace(
        "{{SPEAKING_PROMPT}}",
        practice.passages[0].body
      );
    } else if (command.includes("{{PROMPT}}")) {
      command = command.replace("{{PROMPT}}", practice.passages[0].body);
    } else if (command.includes("{{SCENE_DESCRIPTION}}")) {
      command = command.replace(
        "{{SCENE_DESCRIPTION}}",
        practice.passages[1].body
      );
    }

    // Inject duration
    if (command.includes("{{SPEAKING_DURATION}}")) {
      command = command.replace(
        "{{SPEAKING_DURATION}}",
        transcribeResult.metadata.duration
      );
    }

    const taskTopic = task.description ?? "";
    if (taskTopic) {
      if (command.includes("{{TASK_DESCRIPTION}}")) {
        command = command.replace("{{TASK_DESCRIPTION}}", taskTopic);
      } else if (command.includes("{{TOPIC}}")) {
        command = command.replace("{{TOPIC}}", taskTopic);
      } else {
        command += `

---
TASK_TOPIC:
${taskTopic}

SCORING_RULES_FOR_TASK_FULFILLMENT:
- Heavily penalize off-topic responses.
- If the response does not meaningfully address TASK_TOPIC, set "taskFulfillment" very low (e.g., 0–3/12) and reflect this in "overall".
- Do NOT reward fluency or grammar with high "overall" if the response is off-topic.`;
      }
    }

    const msg: any = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 20000,
      temperature: 1,
      system:
        (task.antropicCommand?.systemPrompt ?? "") +
        (taskTopic
          ? `

The user must address the following topic:
"${taskTopic}"

If the response is off-topic, sharply reduce "taskFulfillment" and lower "overall" accordingly.`
          : ""),
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
                description:
                  "Task Fulfillment: (out of 12). Strictly tied to TASK_TOPIC; off-topic => low score.",
              },
              feedback: {
                type: "string",
                description: task.antropicCommand?.systemPrompt ?? "",
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

    const answerRepo = new WritingAnswerRepository(mongoClient);
    const answer = await answerRepo.createOrUpdateAnswer({
      audioUrl: location,
      userId: user?.id,
      practiceId: practiceId,
      overalScore:
        msg &&
        msg.content.length > 1 &&
        msg.content[1].input &&
        msg.content[1].input.overall
          ? msg.content[1].input.overall
          : 0,
      type: "SPEAKING",
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
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
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
    { userId: user.id, practiceId, type: "SPEAKING" },
    0,
    100
  );
  return NextResponse.json(answers);
};

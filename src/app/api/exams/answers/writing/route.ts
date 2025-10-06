import { PracticeRepository } from "@/repositories/practice.repo";
import { NextRequest, NextResponse } from "next/server";
import mongoClient from "@/lib/mongodb";
import { WritingAnswerRequestSchema } from "@/models/answer";
import { WritingAnswerRepository } from "@/repositories/writingAnswers";
import { TaskRepository } from "@/repositories/tasks.repo";
import { TTaskSchemaDto } from "@/models/tasks.model";
import { currentUser } from "@clerk/nextjs/server";
import { ExamPartsRepository } from "@/repositories/examParts.repo";

export const POST = async function (req: NextRequest) {
  const body = await req.json();
  const answersParser = WritingAnswerRequestSchema.safeParse(body);
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (answersParser.success) {
    const answerBody = answersParser.data;

    if (!user.publicMetadata.plan || user.publicMetadata.plan !== "premium") {
      return NextResponse.json(
        { message: "You havent any free credit." },
        { status: 400 }
      );
    }
    if (!answerBody.examId || !answerBody.partId) {
      return NextResponse.json(
        { message: "Exam id and part id not provided" },
        { status: 400 }
      );
    }
    const examPartRepo = new ExamPartsRepository(mongoClient);
    const examPart = await examPartRepo.findExamPartByExamIdAndPartId(
      answerBody.examId,
      answerBody.partId
    );
    if (!examPart) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    const commandTemplate =
      "You are an experienced CELPIP English examiner tasked with providing constructive feedback to help " +
      "users improve their English language skills. Your goal is to analyze the text provided by the user " +
      "and offer helpful suggestions for improvement.<writing_prompt>\n" +
      "{{WRITING_PROMPT}}\n" +
      "</writing_prompt>\n\n" +
      "Now, carefully read the user's response:\n\n" +
      "<user_response>\n" +
      "{{USER_RESPONSE}}\n" +
      "</user_response>\n\n" +
      "Carefully read and analyze the response above, paying attention to grammar, vocabulary, sentence structure, " +
      "coherence, and overall language use. Consider the following aspects:\n" +
      "1. Grammar and sentence structure\n" +
      "2. Vocabulary usage and variety\n" +
      "3. Coherence and organization of ideas\n" +
      "4. Clarity and effectiveness of communication\n\n" +
      "Provide feedback that is neither too detailed nor too brief. Focus on the most important areas for improvement " +
      "that will have the greatest impact on the user's English language skills. Aim to give 3-5 main points of feedback.\n\n" +
      "When crafting your feedback:\n" +
      "* Be constructive and encouraging\n" +
      "* Provide specific examples from the text to illustrate your points\n" +
      "* Offer practical suggestions for improvement\n" +
      "* Maintain a professional and supportive tone\n\n" +
      "Additionally, focus on key points for Writing Part 1 (Email Writing) based on the guidelines for the CELPIP exam:\n" +
      "* Logical Organization: Introduction, main body with well-supported points, and conclusion.\n" +
      "* Solid Support: Specific examples that address every part of the prompt.\n" +
      "* Precise Vocabulary: Appropriate vocabulary variety; paraphrase the prompt.\n" +
      "* Accurate Grammar & Clear Formatting: Grammatical accuracy, sentence variety, proper paragraphing.\n" +
      "* Suitable Tone: Polite and professional.\n\n" +
      "Output Structure\n" +
      "1. Overall Assessment – A brief overall assessment of the text.\n" +
      "2. Feedback – Wrapped in <feedback>…</feedback> tags, beginning each main point with •. Include:\n" +
      "   * Main points for improvement (3-5 bullets)\n" +
      "   * A positive note on what the user did well\n" +
      "   * A concise conclusion with encouragement\n" +
      "3. Feedback Output – A fully-modeled example, broken into sections:\n" +
      '   * Introduction: "Dear [Hotel Manager], I am writing to express my dissatisfaction with the service I received during my recent stay at your hotel."\n' +
      "   * Main Body:\n" +
      '     * Issue 1: "Firstly, the room was not cleaned properly. I found dust on the furniture and the bathroom was not stocked with essentials."\n' +
      '     * Issue 2: "Additionally, the staff at the front desk was unhelpful and rude when I requested assistance."\n' +
      '   * Conclusion: "I hope that you will address these issues promptly to improve the experience for future guests. I look forward to hearing from you."\n' +
      '   * Sign-off: "Sincerely, [Your Name]"';
    const system =
      "You are an experienced CELPIP English examiner tasked with providing constructive feedback to help " +
      "users improve their English language skills. Your goal is to analyze the text provided by the user " +
      "and offer helpful suggestions for improvement. Carefully read and analyze the text above, paying " +
      "attention to grammar, vocabulary, sentence structure, coherence, and overall language use. Consider " +
      "the following aspects:\n" +
      "1. Grammar and sentence structure\n" +
      "2. Vocabulary usage and variety\n" +
      "3. Coherence and organization of ideas\n" +
      "4. Clarity and effectiveness of communication\n\n" +
      "Provide feedback that is neither too detailed nor too brief. Focus on the most important areas for " +
      "improvement that will have the greatest impact on the user's English language skills. Aim to give 3-5 " +
      "main points of feedback.\n\n" +
      "When crafting your feedback:\n" +
      "* Be constructive and encouraging\n" +
      "* Provide specific examples from the text to illustrate your points\n" +
      "* Offer practical suggestions for improvement\n" +
      "* Maintain a professional and supportive tone\n\n" +
      "Additionally, focus on key points for Writing Part 1 (Email Writing) based on the guidelines for the " +
      "CELPIP exam:\n" +
      "* Logical Organization: Introduction, main body with well-supported points, and conclusion.\n" +
      "* Solid Support: Specific examples that address every part of the prompt.\n" +
      "* Precise Vocabulary: Appropriate vocabulary variety; paraphrase the prompt.\n" +
      "* Accurate Grammar & Clear Formatting: Grammatical accuracy, sentence variety, proper paragraphing.\n" +
      "* Suitable Tone: Polite and professional.\n\n" +
      "Output Structure\n\n" +
      "1. Overall Assessment - A brief overall assessment of the text.\n\n" +
      "2. Feedback - Wrapped in <feedback>...</feedback> tags, beginning each main point with •. Include:\n" +
      "* Main points for improvement (3-5 bullets)\n" +
      "* A positive note on what the user did well\n" +
      "* A concise conclusion with encouragement\n\n" +
      "3. Feedback Output - A fully-modeled example, broken into sections:\n" +
      '* Introduction: "Dear [Hotel Manager], I am writing to express my dissatisfaction with the service ' +
      'I received during my recent stay at your hotel."\n' +
      "* Main Body:\n" +
      '* Issue 1: "Firstly, the room was not cleaned properly. I found dust on the furniture and the bathroom ' +
      'was not stocked with essentials."\n' +
      '* Issue 2: "Additionally, the staff at the front desk was unhelpful and rude when I requested assistance."\n' +
      '* Conclusion: "I hope that you will address these issues promptly to improve the experience for future ' +
      'guests. I look forward to hearing from you."\n' +
      '* Sign-off: "Sincerely, [Your Name]"';

    let command = commandTemplate;

    if (command.includes("{{USER_TEXT}}")) {
      command = command.replace("{{USER_TEXT}}", answerBody.text);
    } else if (command.includes("{{USER_RESPONSE}}")) {
      command = command.replace("{{USER_RESPONSE}}", answerBody.text);
    }

    if (command.includes("{{WRITING_PROMPT}}")) {
      command = command.replace(
        "{{WRITING_PROMPT}}",
        examPart.passages[0].body ?? ""
      );
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
          model: "qwen/qwen3-next-80b-a3b-instruct",
          provider: {
            order: ["DeepInfra"],
          },
          max_tokens: 20000,
          temperature: 1,
          messages: [
            {
              role: "system",
              content: system,
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
            },
          ],
          tool_choice: "auto",
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

    const answerRepo = new WritingAnswerRepository(mongoClient);
    const answer = await answerRepo.createOrUpdateAnswer({
      text: answerBody.text,
      userId: user?.id,
      examId: answerBody.examId,
      partId: answerBody.partId,
      overalScore:
        msg &&
        msg.content.length > 1 &&
        (msg.content[1] as any).input &&
        (msg.content[1] as any).input.overall
          ? (msg.content[1] as any).input.overall
          : 0,
      type: "WRITING",
      result:
        msg && msg.content.length > 1 && (msg.content[1] as any).input
          ? (msg.content[1] as any).input
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
    { userId: user.id, examId, partId: parseInt(partId), type: "WRITING" },
    0,
    100
  );
  return NextResponse.json(answers);
};

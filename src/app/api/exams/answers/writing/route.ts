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
      "You are an experienced CELPIP examiner providing constructive, balanced feedback to help users improve their English writing skills.\n\n" +
      "<writing_prompt>\n{{WRITING_PROMPT}}\n</writing_prompt>\n\n" +
      "<user_response>\n{{USER_RESPONSE}}\n</user_response>\n\n" +
      "CRITICAL: First verify that the user's response addresses the given prompt. If the response is off-topic or addresses a different question entirely, note this clearly in your assessment.\n\n" +
      "Analyze the response across these key dimensions:\n" +
      "• **Coherence**: Logical flow, organization, paragraph structure, transitions, clarity of ideas\n" +
      "• **Vocabulary**: Word choice variety, precision, appropriateness, natural phrasing\n" +
      "• **Readability**: Sentence structure variety, grammar accuracy, natural flow, professional tone\n" +
      "• **Fulfillment**: How completely and appropriately the response addresses ALL parts of the prompt\n\n" +
      "FEEDBACK PHILOSOPHY:\n" +
      "• Be FAIR and ACCURATE: Match your feedback intensity to the actual quality of the writing\n" +
      "• Strong writing needs acknowledgment and minor refinement suggestions\n" +
      "• Weak writing needs focused, high-impact guidance on critical issues\n" +
      "• Don't over-correct or nitpick writing that already communicates effectively\n" +
      "• For off-topic responses, clearly identify the mismatch with the prompt\n\n" +
      "OUTPUT STRUCTURE:\n\n" +
      "1. Overall Assessment – A brief overall assessment of the text. Be honest and balanced:\n" +
      "   - For strong writing: acknowledge what works well, note areas for minor refinement\n" +
      "   - For weak writing: be constructive but clear about main issues\n" +
      "   - Always mention if the response doesn't address the prompt correctly\n\n" +
      "2. Feedback – Wrapped in <feedback>...</feedback> tags, beginning each main point with •. Include:\n" +
      "   • Main points for improvement (3-5 bullets)\n" +
      "   • Each bullet should identify a concrete issue and suggest how to improve it\n" +
      "   • Use actual examples from the user's text to illustrate your points\n" +
      "   • For strong responses, focus on subtle refinements rather than inventing problems\n" +
      "   • A positive note on what the user did well\n" +
      "   • A concise conclusion with encouragement\n\n" +
      "3. Feedback Output – A fully-modeled example showing the improved version, broken into sections:\n" +
      "   • Reproduce the user's complete response with inline corrections where needed\n" +
      "   • Use strikethrough formatting: ~~incorrect~~ followed by: correct\n" +
      "   • Example: \"I ~~choose~~ would choose Option B because it ~~is~~ offers greater flexibility\"\n" +
      "   • Mark only actual errors (grammar, word choice, spelling), not stylistic preferences\n" +
      "   • If the writing is already excellent, show only minor polishing changes\n" +
      "   • Then provide a \"Better Version\" that demonstrates the enhanced response:\n" +
      "     - Fix all grammatical and vocabulary issues\n" +
      "     - Keep the user's core ideas and structure\n" +
      "     - Use more sophisticated vocabulary and varied sentence structures\n" +
      "     - Maintain appropriate tone for the task\n" +
      "     - Ensure the response fully addresses all parts of the prompt\n\n" +
      "TASK-SPECIFIC EXPECTATIONS:\n\n" +
      "**For Email Writing:**\n" +
      "Expect: Appropriate greeting and closing, clear purpose in opening, organized paragraphs for each requirement, professional and polite tone (even when complaining), specific details and examples, clear requests or action items, 150-200 words\n\n" +
      "**For Survey/Opinion Responses:**\n" +
      "Expect: Clear statement of chosen option, multiple supporting reasons with explanations, specific examples or scenarios, logical organization, appropriate tone (can be slightly less formal than emails), 150-200 words\n\n" +
      "IMPORTANT REMINDERS:\n" +
      "• Always check if the response addresses the correct prompt first\n" +
      "• Be honest about quality - acknowledge excellent writing when you see it\n" +
      "• Don't create unnecessary corrections for writing that already works\n" +
      "• Focus on high-impact improvements, not minor nitpicks\n" +
      "• Be specific: cite examples, show corrections, demonstrate improvements\n" +
      "• Maintain an encouraging but honest tone throughout\n" +
      "• Note if responses are significantly under the 150-200 word target";

    const system =
      "You are an experienced CELPIP examiner providing accurate, balanced feedback on English writing. Your role is to help learners improve while being fair and honest about their current ability level.\n\n" +
      "CORE PRINCIPLES:\n" +
      "1. **Verify prompt alignment first**: Always check if the response actually addresses the question asked\n" +
      "2. **Assess quality honestly**: Don't artificially inflate or deflate the quality of writing\n" +
      "3. **Provide proportional feedback**: Excellent writing needs minimal correction; weak writing needs focused guidance on critical issues\n" +
      "4. **Be specific and actionable**: Point to exact problems with concrete examples and clear solutions\n" +
      "5. **Maintain appropriate tone**: Professional but encouraging; honest but constructive; never patronizing\n\n" +
      "WHAT TO EVALUATE:\n\n" +
      "**COHERENCE** - Organization and logical flow:\n" +
      "Does the response have clear structure? Are ideas presented in logical order? Are paragraphs well-organized? Do transitions connect ideas smoothly? Is it easy to follow?\n\n" +
      "**VOCABULARY** - Word choice and variety:\n" +
      "Is vocabulary appropriate and precise? Is there good variety in word choice? Are phrases natural and idiomatic? Are words used correctly? Is there unnecessary repetition?\n\n" +
      "**READABILITY** - Grammar, syntax, and flow:\n" +
      "Is grammar accurate? Is there sentence variety? Do sentences flow naturally? Is the tone appropriate for the task? Are there errors that impede understanding?\n\n" +
      "**FULFILLMENT** - Addressing the prompt:\n" +
      "Does the response address ALL parts of the prompt? Are requirements answered with sufficient detail? Is the content relevant? Is the response complete?\n\n" +
      "CELPIP TASK REQUIREMENTS:\n\n" +
      "**Email Writing (Task 1):**\n" +
      "• Appropriate greeting (Dear [Name/Title],) and sign-off (Sincerely/Best regards,)\n" +
      "• Clear statement of purpose in the opening paragraph\n" +
      "• Organized body paragraphs, each addressing a specific prompt requirement\n" +
      "• Professional, polite tone throughout (even in complaint letters)\n" +
      "• Specific details, examples, and explanations (not vague generalizations)\n" +
      "• Clear requests, suggestions, or action items\n" +
      "• Appropriate length: 150-200 words (note if significantly shorter)\n\n" +
      "**Survey/Opinion Responses:**\n" +
      "• Clear statement of which option is chosen and why\n" +
      "• Multiple supporting reasons (typically 2-3 main points)\n" +
      "• Each reason explained with specific examples or scenarios\n" +
      "• Logical organization with smooth flow between ideas\n" +
      "• Clear, direct tone (more conversational than formal emails)\n" +
      "• Appropriate length: 150-200 words\n\n" +
      "FEEDBACK STRUCTURE GUIDELINES:\n\n" +
      "1. Overall Assessment - A brief overall assessment of the text (2-3 sentences):\n" +
      "   • Start by checking: Does this response answer the actual prompt given?\n" +
      "   • Be honest about the overall quality level\n" +
      "   • For strong writing: acknowledge what works, note minor refinement areas\n" +
      "   • For weak writing: be constructive but clear about the main problems\n" +
      "   • Mention prompt alignment issues prominently if they exist\n\n" +
      "2. Feedback - Wrapped in <feedback>...</feedback> tags, beginning each main point with •. Include:\n" +
      "   • IMPORTANT: All bullet points must be wrapped in <feedback>...</feedback> tags\n" +
      "   • Main points for improvement (3-5 bullets)\n" +
      "   • Prioritize the most important improvements (not every tiny issue)\n" +
      "   • Cite specific examples directly from the user's text\n" +
      "   • Offer concrete, actionable suggestions (not vague advice like \"use better words\")\n" +
      "   • For strong writing, suggest subtle refinements; for weak writing, focus on critical fixes\n" +
      "   • Balance constructive criticism with recognition of strengths\n" +
      "   • A positive note on what the user did well\n" +
      "   • A concise conclusion with encouragement\n\n" +
      "3. Feedback Output - A fully-modeled example, broken into sections:\n" +
      "   • Use inline corrections: ~~incorrect text~~ correct text\n" +
      "   • Show exactly what to change, where to change it\n" +
      "   • Mark actual errors (grammar, word choice, missing words, spelling)\n" +
      "   • Don't mark stylistic preferences or minor variations\n" +
      "   • For excellent writing with few errors, acknowledge this: \"Your writing is very strong. Here are minor refinements:\"\n" +
      "   • If there are genuinely no significant errors, you may skip this section or note \"No major corrections needed\"\n\n" +
      "4. **Better Version**:\n" +
      "   • Preserve the user's core ideas, main arguments, and overall structure\n" +
      "   • Fix all identified language problems (grammar, vocabulary, tone)\n" +
      "   • Demonstrate more sophisticated vocabulary where appropriate\n" +
      "   • Use varied sentence structures to improve flow\n" +
      "   • Ensure the tone matches the task type (formal for emails, clear for surveys)\n" +
      "   • Make sure ALL prompt requirements are addressed\n" +
      "   • For already-strong writing: make only subtle improvements (don't over-rewrite)\n" +
      "   • For weak writing: show significant enhancement while keeping the user's intent\n\n" +
      "CRITICAL GUIDELINES:\n\n" +
      "**Always check prompt alignment first**\n" +
      "Even beautifully written responses fail if they answer the wrong question. Check this immediately and mention it prominently if there's a mismatch.\n\n" +
      "**Match feedback to actual quality**\n" +
      "• Excellent writing (sophisticated vocabulary, varied structures, clear organization, no significant errors):\n" +
      "  → Acknowledge the high quality\n" +
      "  → Suggest only minor refinements or advanced techniques\n" +
      "  → Don't invent problems that aren't there\n" +
      "\n" +
      "• Good writing (clear communication, mostly correct, some room for improvement):\n" +
      "  → Note what works well\n" +
      "  → Focus on 3-4 meaningful improvements\n" +
      "  → Balance criticism with encouragement\n" +
      "\n" +
      "• Weak writing (frequent errors, unclear organization, limited vocabulary):\n" +
      "  → Be constructive but honest about issues\n" +
      "  → Prioritize high-impact fixes (don't overwhelm with every error)\n" +
      "  → Show clear path to improvement\n" +
      "  → Still find something positive to encourage\n\n" +
      "**Be specific and concrete**\n" +
      "Poor: \"Your vocabulary needs improvement\"\n" +
      "Good: \"You repeat 'good' four times. Try alternatives like 'beneficial,' 'advantageous,' or 'valuable' depending on context.\"\n\n" +
      "**Maintain professional examiner tone**\n" +
      "• Helpful and constructive, never harsh or dismissive\n" +
      "• Honest about quality, never patronizing or falsely praising\n" +
      "• Encouraging about potential, realistic about current level\n" +
      "• Respectful of the user's effort and ideas\n\n" +
      "**Remember task context**\n" +
      "• Emails should be formal, professional, polite (even complaints)\n" +
      "• Surveys can be more conversational but should still be clear and organized\n" +
      "• Both require specific details and examples, not vague statements\n" +
      "• Word count matters: note if responses are significantly under 120 words";

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

    // Determine which model to use
    const modelToUse = process.env.OPENROUTER_MODEL;
    console.log("Using model:", modelToUse);

    // Enhance system prompt for models that don't support tool calling well
    const isQwen = modelToUse?.includes('qwen');
    let enhancedSystemPrompt = system;

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
            ignore: ["Hyperbolic"],
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
                    "betterVersion",
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
    const answerRepo = new WritingAnswerRepository(mongoClient);

    if (!toolCall) {
      console.error("No tool call! Full response:", JSON.stringify(data, null, 2));

      // Fallback: Try to parse structured content from message
      const messageContent = data.choices?.[0]?.message?.content || "";
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
        console.error("betterVersion is empty or too short");
        throw new Error(
          `Model did not provide proper betterVersion (must be at least 50 characters). Please use Claude instead of ${data.model}`
        );
      }

      console.log("Successfully extracted complete data from content");
      const msg: any = {
        content: [
          { type: "text", text: messageContent },
          { type: "tool_use", input: parsedResult },
        ],
        usage: {
          input_tokens: data.usage?.prompt_tokens || 0,
          output_tokens: data.usage?.completion_tokens || 0,
        },
      };

      const answer = await answerRepo.createOrUpdateAnswer({
        text: answerBody.text,
        userId: user?.id,
        examId: answerBody.examId,
        partId: answerBody.partId,
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
          `Model did not provide proper betterVersion. Please use Claude instead of ${data.model}`
        );
      }
    }

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

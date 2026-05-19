/** Cap generation length so scoring finishes within Vercel's function timeout. */
export const OPENROUTER_EVAL_MAX_TOKENS = 8192;

export const OPENROUTER_EVAL_TEMPERATURE = 0.4;

export const OPENROUTER_EVAL_PROVIDER = {
  order: ["DeepInfra", "Together", "Fireworks"],
  ignore: ["Hyperbolic"],
} as const;

export function resolveOpenRouterEvalModel(): string | undefined {
  return process.env.OPENROUTER_MODEL?.trim() || undefined;
}

export function openRouterEvalBody(
  model: string | undefined,
  systemPrompt: string,
  userContent: string,
  toolParameters: Record<string, unknown>
) {
  return {
    model,
    max_tokens: OPENROUTER_EVAL_MAX_TOKENS,
    temperature: OPENROUTER_EVAL_TEMPERATURE,
    provider: OPENROUTER_EVAL_PROVIDER,
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userContent },
    ],
    tools: [
      {
        type: "function" as const,
        function: {
          name: "CELPIPWritingEvaluation",
          description:
            "evaluating and providing feedback on a writing or speaking sample and content analysis scores",
          parameters: toolParameters,
        },
      },
    ],
    tool_choice: {
      type: "function" as const,
      function: { name: "CELPIPWritingEvaluation" },
    },
  };
}

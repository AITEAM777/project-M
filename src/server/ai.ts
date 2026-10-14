import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type * as z4 from "zod/v4";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { limitsFor } from "@/lib/plans";
import { limitError } from "./quota";
import { logger } from "@/lib/logger";

/** AI is optional: without ANTHROPIC_API_KEY every AI endpoint returns 503 and the UI hides AI. */
export function aiAvailable() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  if (!aiAvailable()) throw new HttpError(503, "AI assistant is not configured on this server");
  client ??= new Anthropic();
  return client;
}

const MODEL = () => process.env.AI_MODEL || "claude-opus-5-5";

export const BASE_SYSTEM = `You are the planning assistant inside Nodera, a personal knowledge and goal-planning app.
Rules you must always follow:
- Work only with the data provided in the request. Never invent progress, completed activities, dates or facts about the user.
- Your output is a SUGGESTION. The user reviews it and nothing is saved unless they accept it.
- Be concrete, realistic and kind. Prefer small, actionable steps. Keep titles short (under 70 characters).
- Do not assume every activity is compatible with every goal; only propose connections you can justify.
- Reply in the same language the user wrote in.`;

/** Enforces opt-in and the per-plan daily AI request quota. */
export async function assertAiAllowed(user: { id: string; plan: string; aiEnabled: boolean }) {
  if (!aiAvailable()) throw new HttpError(503, "AI assistant is not configured on this server");
  if (!user.aiEnabled) throw new HttpError(403, "AI features are turned off in your settings");
  const since = new Date(Date.now() - 86400_000);
  const used = await prisma.aiSuggestion.count({ where: { userId: user.id, createdAt: { gte: since } } });
  const max = limitsFor(user.plan).aiRequestsPerDay;
  if (used >= max) throw limitError("ai", max, "Daily AI limit reached for your plan");
}

/** Single structured call. The response is validated against the Zod schema. */
export async function generate<T extends z4.ZodType>(schema: T, prompt: string, opts: { system?: string; effort?: "low" | "medium" | "high" } = {}): Promise<z4.infer<T>> {
  const anthropic = getClient();
  try {
    const response = await anthropic.messages.parse({
      model: MODEL(),
      max_tokens: 16000,
      system: opts.system ?? BASE_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: zodOutputFormat(schema), effort: opts.effort ?? "medium" },
    });
    if (response.stop_reason === "refusal") throw new HttpError(422, "The assistant declined this request. Try rephrasing it.");
    if (response.stop_reason === "max_tokens") throw new HttpError(502, "The assistant's answer was too long. Try a narrower request.");
    if (!response.parsed_output) throw new HttpError(502, "The assistant returned an unexpected answer. Please try again.");
    return response.parsed_output as z4.infer<T>;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, "The AI service is busy. Please try again in a minute.");
    if (err instanceof Anthropic.AuthenticationError) {
      logger.error("ai.auth", { err: String(err) });
      throw new HttpError(503, "AI assistant is misconfigured (invalid API key)");
    }
    if (err instanceof Anthropic.APIError) {
      logger.error("ai.api", { status: err.status, err: err.message });
      throw new HttpError(502, "The AI service returned an error. Please try again.");
    }
    throw err;
  }
}

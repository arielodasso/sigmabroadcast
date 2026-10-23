import { app, type HttpRequest } from "@azure/functions";
import { readEnv } from "./env";
import {
  ProviderError,
  complete,
  resolveProvider,
  type ChatMessage,
  type CompletionInput,
} from "./providers";

const MAX_MESSAGES = 6;
const MAX_CONTENT = 12_000;
const MAX_TOTAL = 32_000;

interface Body {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  json: boolean;
}

function parseBody(raw: unknown): Body | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const messages = record["messages"];
  if (!Array.isArray(messages) || messages.length === 0) return null;
  if (messages.length > MAX_MESSAGES) return null;

  let total = 0;
  const parsed: ChatMessage[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) return null;
    const entry = message as Record<string, unknown>;
    const role = entry["role"];
    const content = entry["content"];
    if (role !== "system" && role !== "user") return null;
    if (typeof content !== "string") return null;
    if (content.length === 0 || content.length > MAX_CONTENT) return null;
    total += content.length;
    if (total > MAX_TOTAL) return null;
    parsed.push({ role, content });
  }

  const temperature =
    typeof record["temperature"] === "number" ? record["temperature"] : 0.2;
  const maxTokens =
    typeof record["maxTokens"] === "number" ? record["maxTokens"] : 320;

  return {
    messages: parsed,
    temperature: Math.min(1, Math.max(0, temperature)),
    maxTokens: Math.min(500, Math.max(1, Math.round(maxTokens))),
    json: record["responseFormat"] === "json",
  };
}

app.http("ai", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "ai",
  handler: async (request: HttpRequest, context) => {
    const provider = resolveProvider(readEnv());
    if (!provider) {
      return {
        status: 503,
        jsonBody: {
          error:
            "No LLM provider configured. Set AZURE_OPENAI_* or GITHUB_MODELS_TOKEN.",
        },
      };
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body." } };
    }

    const body = parseBody(raw);
    if (!body) {
      return { status: 400, jsonBody: { error: "Invalid AI request." } };
    }

    const input: CompletionInput = {
      messages: body.messages,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      json: body.json,
    };

    try {
      const result = await complete(provider, input);
      return { status: 200, jsonBody: result };
    } catch (error) {
      if (error instanceof ProviderError) {
        context.warn(`AI provider error: ${error.message}`);
        return {
          status: error.status,
          jsonBody: { error: "AI provider request failed." },
        };
      }
      context.error("Unexpected AI proxy error", error);
      return { status: 500, jsonBody: { error: "Unexpected AI error." } };
    }
  },
});

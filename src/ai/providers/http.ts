import { AiProviderError } from "./types";

export async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  timeoutMs = 20_000,
): Promise<unknown> {
  if (typeof fetch !== "function") {
    throw new AiProviderError("fetch is not available in this runtime");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new AiProviderError(
        `provider responded ${response.status}: ${text.slice(0, 240)}`,
      );
    }
    if (!text) return {};
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new AiProviderError("provider returned non-JSON content");
    }
  } catch (error) {
    if (error instanceof AiProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AiProviderError(`provider timed out after ${timeoutMs}ms`);
    }
    throw new AiProviderError(
      error instanceof Error ? error.message : "provider request failed",
    );
  } finally {
    clearTimeout(timer);
  }
}

export function readChatCompletion(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new AiProviderError("provider payload is not an object");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AiProviderError("provider payload has no choices");
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  if (typeof message?.content !== "string" || message.content.trim() === "") {
    throw new AiProviderError("provider payload has no message content");
  }
  return message.content;
}

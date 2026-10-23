import type { ApiEnv } from "./env";

export type ProviderName = "azure-openai" | "github-models";

export interface ProviderConfig {
  name: ProviderName;
  url: string;
  headers: Record<string, string>;
  model: string;
  azure: boolean;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CompletionInput {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  json: boolean;
}

export interface CompletionOutput {
  text: string;
  model: string;
  provider: ProviderName;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status = 502,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export function resolveProvider(env: ApiEnv): ProviderConfig | null {
  if (env.azureEndpoint && env.azureKey && env.azureDeployment) {
    const base = env.azureEndpoint.replace(/\/$/, "");
    return {
      name: "azure-openai",
      url: `${base}/openai/deployments/${env.azureDeployment}/chat/completions?api-version=${env.azureApiVersion}`,
      headers: { "api-key": env.azureKey },
      model: env.azureDeployment,
      azure: true,
    };
  }
  if (env.githubToken) {
    return {
      name: "github-models",
      url: "https://models.github.ai/inference/chat/completions",
      headers: { Authorization: `Bearer ${env.githubToken}` },
      model: env.githubModel,
      azure: false,
    };
  }
  return null;
}

function readContent(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    throw new ProviderError("provider payload is not an object");
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new ProviderError("provider payload has no choices");
  }
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  if (typeof message?.content !== "string" || message.content.trim() === "") {
    throw new ProviderError("provider payload has no content");
  }
  return message.content;
}

export async function complete(
  provider: ProviderConfig,
  input: CompletionInput,
  timeoutMs = 20_000,
): Promise<CompletionOutput> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const body = provider.azure
      ? {
          messages: input.messages,
          temperature: input.temperature,
          max_tokens: input.maxTokens,
          ...(input.json ? { response_format: { type: "json_object" } } : {}),
        }
      : {
          model: provider.model,
          messages: input.messages,
          temperature: input.temperature,
          max_tokens: input.maxTokens,
          ...(input.json ? { response_format: { type: "json_object" } } : {}),
        };

    const response = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...provider.headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new ProviderError(
        `provider responded ${response.status}`,
        response.status === 429 ? 429 : 502,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      throw new ProviderError("provider returned non-JSON content");
    }
    return {
      text: readContent(payload),
      model: provider.model,
      provider: provider.name,
    };
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ProviderError(`provider timed out after ${timeoutMs}ms`, 504);
    }
    throw new ProviderError(
      error instanceof Error ? error.message : "provider request failed",
    );
  } finally {
    clearTimeout(timer);
  }
}

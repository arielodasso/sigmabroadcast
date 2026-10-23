import { postJson } from "./http";
import {
  AiProviderError,
  type AiProvider,
  type CompletionRequest,
  type CompletionResult,
} from "./types";

interface ProxyResponse {
  text?: unknown;
  model?: unknown;
  provider?: unknown;
  error?: unknown;
}

export class ProxyAiProvider implements AiProvider {
  readonly name = "proxy" as const;

  constructor(
    private readonly url: string,
    readonly model = "sigma-ai-proxy",
  ) {}

  isConfigured(): boolean {
    return Boolean(this.url);
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new AiProviderError("AI proxy URL is not configured");
    }
    const startedAt = performance.now();
    const payload = (await postJson(this.url, {
      messages: request.messages,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
      responseFormat: request.json ? "json" : "text",
    })) as ProxyResponse;

    if (typeof payload.error === "string") {
      throw new AiProviderError(`proxy error: ${payload.error}`);
    }
    if (typeof payload.text !== "string" || payload.text.trim() === "") {
      throw new AiProviderError("proxy returned no text");
    }
    return {
      text: payload.text,
      model:
        typeof payload.model === "string" ? payload.model : this.model,
      provider: this.name,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

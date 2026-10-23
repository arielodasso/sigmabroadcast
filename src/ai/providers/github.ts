import type { GitHubModelsConfig } from "../config";
import { postJson, readChatCompletion } from "./http";
import {
  AiProviderError,
  type AiProvider,
  type CompletionRequest,
  type CompletionResult,
} from "./types";

export class GitHubModelsProvider implements AiProvider {
  readonly name = "github-models" as const;

  constructor(private readonly config: GitHubModelsConfig) {}

  get model(): string {
    return this.config.model;
  }

  isConfigured(): boolean {
    return Boolean(this.config.token && this.config.model);
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new AiProviderError("GitHub Models is not configured");
    }
    const startedAt = performance.now();
    const payload = await postJson(
      this.config.endpoint,
      {
        model: this.config.model,
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
      },
      { Authorization: `Bearer ${this.config.token}` },
    );
    return {
      text: readChatCompletion(payload),
      model: this.config.model,
      provider: this.name,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

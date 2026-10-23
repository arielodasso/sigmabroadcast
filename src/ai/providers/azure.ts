import type { AzureOpenAiConfig } from "../config";
import { postJson, readChatCompletion } from "./http";
import {
  AiProviderError,
  type AiProvider,
  type CompletionRequest,
  type CompletionResult,
} from "./types";

export class AzureOpenAiProvider implements AiProvider {
  readonly name = "azure-openai" as const;

  constructor(private readonly config: AzureOpenAiConfig) {}

  get model(): string {
    return this.config.deployment;
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.endpoint && this.config.apiKey && this.config.deployment,
    );
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    if (!this.isConfigured()) {
      throw new AiProviderError("Azure OpenAI is not configured");
    }
    const startedAt = performance.now();
    const url = `${this.config.endpoint.replace(/\/$/, "")}/openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`;
    const payload = await postJson(
      url,
      {
        messages: request.messages,
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        ...(request.json ? { response_format: { type: "json_object" } } : {}),
      },
      { "api-key": this.config.apiKey },
    );
    return {
      text: readChatCompletion(payload),
      model: this.config.deployment,
      provider: this.name,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  }
}

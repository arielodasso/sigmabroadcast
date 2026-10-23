export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface CompletionRequest {
  messages: readonly ChatMessage[];
  temperature: number;
  maxTokens: number;
  json: boolean;
}

export interface CompletionResult {
  text: string;
  model: string;
  provider: "azure-openai" | "github-models" | "proxy";
  latencyMs: number;
}

export interface AiProvider {
  readonly name: "azure-openai" | "github-models" | "proxy";
  readonly model: string;
  isConfigured(): boolean;
  complete(request: CompletionRequest): Promise<CompletionResult>;
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

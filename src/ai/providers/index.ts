import type { AiConfig } from "../config";
import { AzureOpenAiProvider } from "./azure";
import { GitHubModelsProvider } from "./github";
import { ProxyAiProvider } from "./proxy";
import type { AiProvider } from "./types";

export function createProvider(config: AiConfig): AiProvider | null {
  if (config.providerMode === "proxy" && config.proxyUrl) {
    return new ProxyAiProvider(config.proxyUrl, config.modelLabel);
  }
  if (config.providerMode === "azure-openai" && config.azure) {
    return new AzureOpenAiProvider(config.azure);
  }
  if (config.providerMode === "github-models" && config.github) {
    return new GitHubModelsProvider(config.github);
  }
  return null;
}

export * from "./types";

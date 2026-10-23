export type AiProviderMode =
  | "local"
  | "proxy"
  | "azure-openai"
  | "github-models";

export interface AzureOpenAiConfig {
  endpoint: string;
  apiKey: string;
  deployment: string;
  apiVersion: string;
}

export interface GitHubModelsConfig {
  endpoint: string;
  token: string;
  model: string;
}

export interface AiConfig {
  providerMode: AiProviderMode;
  proxyUrl?: string;
  modelLabel: string;
  azure?: AzureOpenAiConfig;
  github?: GitHubModelsConfig;
}

function env(): ImportMetaEnv {
  if (typeof import.meta === "undefined" || !import.meta.env) {
    return {} as ImportMetaEnv;
  }
  return import.meta.env;
}

function isProviderMode(value: string | undefined): value is AiProviderMode {
  return (
    value === "local" ||
    value === "proxy" ||
    value === "azure-openai" ||
    value === "github-models"
  );
}

export function readAiConfig(): AiConfig {
  const values = env();
  const azureEndpoint = values.VITE_AZURE_OPENAI_ENDPOINT?.trim();
  const azureKey = values.VITE_AZURE_OPENAI_KEY?.trim();
  const azureDeployment = values.VITE_AZURE_OPENAI_DEPLOYMENT?.trim();
  const proxyUrl = values.VITE_AI_PROXY_URL?.trim();
  const githubToken = values.VITE_GITHUB_MODELS_TOKEN?.trim();

  const azure =
    azureEndpoint && azureKey && azureDeployment
      ? {
          endpoint: azureEndpoint,
          apiKey: azureKey,
          deployment: azureDeployment,
          apiVersion:
            values.VITE_AZURE_OPENAI_API_VERSION?.trim() ?? "2024-10-21",
        }
      : undefined;

  const github = githubToken
    ? {
        endpoint: "https://models.github.ai/inference/chat/completions",
        token: githubToken,
        model: values.VITE_GITHUB_MODELS_MODEL?.trim() ?? "openai/gpt-4o-mini",
      }
    : undefined;

  const configured = values.VITE_AI_PROVIDER?.trim();
  const providerMode: AiProviderMode = isProviderMode(configured)
    ? configured
    : proxyUrl
      ? "proxy"
      : azure
        ? "azure-openai"
        : github
          ? "github-models"
          : "local";

  return {
    providerMode,
    ...(proxyUrl ? { proxyUrl } : {}),
    modelLabel:
      values.VITE_AI_MODEL_LABEL?.trim() ??
      (providerMode === "local"
        ? "on-device-priority-mlp-v1"
        : providerMode === "azure-openai"
          ? azure?.deployment ?? "azure-openai"
          : providerMode === "github-models"
            ? github?.model ?? "github-models"
            : "sigma-ai-proxy"),
    ...(azure ? { azure } : {}),
    ...(github ? { github } : {}),
  };
}

export function hasLlmProvider(config: AiConfig): boolean {
  if (config.providerMode === "proxy") return Boolean(config.proxyUrl);
  if (config.providerMode === "azure-openai") return Boolean(config.azure);
  if (config.providerMode === "github-models") return Boolean(config.github);
  return false;
}

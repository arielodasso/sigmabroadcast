export interface ApiEnv {
  azureEndpoint?: string;
  azureKey?: string;
  azureDeployment?: string;
  azureApiVersion: string;
  githubToken?: string;
  githubModel: string;
}

function value(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  return raw ? raw : undefined;
}

export function readEnv(): ApiEnv {
  return {
    azureEndpoint: value("AZURE_OPENAI_ENDPOINT"),
    azureKey: value("AZURE_OPENAI_KEY"),
    azureDeployment: value("AZURE_OPENAI_DEPLOYMENT"),
    azureApiVersion: value("AZURE_OPENAI_API_VERSION") ?? "2024-10-21",
    githubToken: value("GITHUB_MODELS_TOKEN"),
    githubModel: value("GITHUB_MODELS_MODEL") ?? "openai/gpt-4o-mini",
  };
}

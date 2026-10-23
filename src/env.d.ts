interface ImportMetaEnv {
  readonly VITE_AI_PROVIDER?: string;
  readonly VITE_AI_PROXY_URL?: string;
  readonly VITE_AI_MODEL_LABEL?: string;
  readonly VITE_AZURE_OPENAI_ENDPOINT?: string;
  readonly VITE_AZURE_OPENAI_KEY?: string;
  readonly VITE_AZURE_OPENAI_DEPLOYMENT?: string;
  readonly VITE_AZURE_OPENAI_API_VERSION?: string;
  readonly VITE_GITHUB_MODELS_TOKEN?: string;
  readonly VITE_GITHUB_MODELS_MODEL?: string;
  readonly VITE_APPINSIGHTS_CONNECTION_STRING?: string;
  readonly VITE_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

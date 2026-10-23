# Azure deployment

Sigma Broadcast runs with zero cloud dependencies. This document describes the optional Microsoft/Azure deployment used for the public demo.

## Target architecture

```text
Browser
  -> Azure Static Web Apps (React/Vite build)
  -> /api/ai (Azure Functions, Node.js v4)
       -> Azure OpenAI  or  GitHub Models
  -> Application Insights (product events only)
```

The frontend never receives the LLM key when the proxy is used.

## Prerequisites

- Azure subscription with permission to create a Static Web App and a Function App (the managed Functions API is created with the SWA).
- GitHub repository with Actions enabled.
- Optional: an Azure OpenAI resource with a chat model deployment.
- Optional: Application Insights resource.

## 1. Create the Static Web App

### Portal

1. **Create a resource** → **Static Web App**.
2. Source: **GitHub**, repository `arielodasso/sigmabroadcast`, branch `main`.
3. Build presets: **React**.
4. App location: `/`.
5. API location: `api`.
6. Output location: `dist`.
7. Finish. Azure adds `AZURE_STATIC_WEB_APPS_API_TOKEN` to the repository secrets.

### CLI

```bash
az staticwebapp create \
  --name sigma-broadcast \
  --resource-group sigma-broadcast-rg \
  --source https://github.com/arielodasso/sigmabroadcast \
  --location "West Europe" \
  --branch main \
  --app-location "/" \
  --api-location "api" \
  --output-location "dist" \
  --login-with-github
```

The workflow `.github/workflows/azure-static-web-apps.yml` builds the app, then deploys the existing `dist/` and lets the platform build the API.

## 2. Configure server-side AI

In **Static Web App → Configuration**, add:

| Name | Value |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_KEY` | Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | chat model deployment name |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` (or the supported version) |

Or, for GitHub Models:

| Name | Value |
|---|---|
| `GITHUB_MODELS_TOKEN` | fine-grained token with Models access |
| `GITHUB_MODELS_MODEL` | `openai/gpt-4o-mini` |

The Functions proxy reads only server-side variables. Do not add these as `VITE_*`.

## 3. Configure the frontend build

Add repository **variables** (Settings → Secrets and variables → Actions → Variables):

| Name | Value |
|---|---|
| `VITE_AI_PROVIDER` | `proxy` |
| `VITE_AI_PROXY_URL` | `/api/ai` |
| `VITE_AI_MODEL_LABEL` | `sigma-ai-proxy` |

Optional secret:

| Name | Value |
|---|---|
| `VITE_APPINSIGHTS_CONNECTION_STRING` | Application Insights connection string |

The workflow passes these values to `npm run build`. If they are absent, the demo still builds and runs on-device.

## 4. Application Insights

1. Create an **Application Insights** resource.
2. Copy the connection string.
3. Add it as the `VITE_APPINSIGHTS_CONNECTION_STRING` GitHub secret.
4. Redeploy.

Tracked events: `page_view`, `agent_mode`, `ai_explain`, `ai_recap`, `export_json`. Prompts, evidence payloads and narrative text are never sent.

## 5. Verify the deployment

```text
GET  https://<app>.azurestaticapps.net/api/health
POST https://<app>.azurestaticapps.net/api/ai
GET  https://<app>.azurestaticapps.net/
GET  https://<app>.azurestaticapps.net/output
```

Expected health response:

```json
{
  "ok": true,
  "runtime": "v20.x",
  "providers": { "azureOpenAi": true, "githubModels": false },
  "active": "azure-openai"
}
```

In the UI, open the control panel and confirm:

- Provider shows **Azure proxy**.
- LLM shows **Configured**.
- **Explain with AI** returns a grounded narrative.
- The decision log remains populated.

## 6. Local API

```bash
cd api
cp local.settings.json.example local.settings.json
npm install
npm run build
func start --cors http://localhost:5173
```

Set `VITE_AI_PROVIDER=proxy` and `VITE_AI_PROXY_URL=http://localhost:7071/api/ai` in the root `.env.local`, then `npm run dev`.

`local.settings.json` is ignored by Git.

## 7. GitHub Pages alternative

The workflow `.github/workflows/pages.yml` publishes a static demo at:

```text
https://arielodasso.github.io/sigmabroadcast/
```

Enable **Settings → Pages → Build and deployment → GitHub Actions**. Pages has no Functions API, so the demo uses the on-device model and deterministic fallback. This is intentional: the public demo never depends on a secret or a paid API.

## 8. Security notes

- Use the proxy for any public deployment.
- Direct `VITE_AZURE_OPENAI_KEY` or `VITE_GITHUB_MODELS_TOKEN` values are embedded in the client bundle. Use them only for local experiments.
- The proxy validates payload size, roles and limits (`maxTokens <= 500`).
- The proxy does not log prompts or completions.
- Rotate keys if a direct browser key was ever deployed.
- Keep `local.settings.json`, `.env` and `.env.local` out of Git.

## 9. Cost notes

- Static Web Apps has a free tier.
- The managed Functions API is included with the SWA tier.
- Azure OpenAI is pay-as-you-go; a demo session uses a handful of short chat completions.
- GitHub Models offers a free tier for development.
- Application Insights has a monthly ingestion allowance; sampling is enabled.

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `/api/health` returns 404 | API not built or `api_location` missing | Check build logs and `api_location: "api"` |
| Health returns `active: null` | No server-side provider variables | Add Azure OpenAI or GitHub Models settings |
| UI shows **Fallback** | LLM rejected, timed out or unconfigured | Check `/api/health`, quota and grounding validity |
| Blank page after deploy | Wrong `VITE_BASE` or SPA fallback | Keep `base: "/"` for SWA; keep `staticwebapp.config.json` |
| Pages demo has no AI proxy | Expected on GitHub Pages | Use the SWA deployment for LLM features |

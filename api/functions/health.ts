import { app } from "@azure/functions";
import { readEnv } from "./env";
import { resolveProvider } from "./providers";

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async () => {
    const env = readEnv();
    const provider = resolveProvider(env);
    return {
      status: 200,
      jsonBody: {
        ok: true,
        runtime: process.version,
        providers: {
          azureOpenAi: Boolean(
            env.azureEndpoint && env.azureKey && env.azureDeployment,
          ),
          githubModels: Boolean(env.githubToken),
        },
        active: provider?.name ?? null,
      },
    };
  },
});

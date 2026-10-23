import { ApplicationInsights } from "@microsoft/applicationinsights-web";

let client: ApplicationInsights | null = null;

function connectionString(): string | undefined {
  if (typeof import.meta === "undefined" || !import.meta.env) return undefined;
  const value = import.meta.env.VITE_APPINSIGHTS_CONNECTION_STRING?.trim();
  return value ? value : undefined;
}

export function initTelemetry(): void {
  const value = connectionString();
  if (!value || typeof window === "undefined") return;
  if (client) return;
  client = new ApplicationInsights({
    config: {
      connectionString: value,
      enableAutoRouteTracking: false,
      autoTrackPageVisitTime: true,
      disableFetchTracking: false,
      disableAjaxTracking: false,
    },
  });
  client.loadAppInsights();
}

export function isTelemetryEnabled(): boolean {
  return client !== null;
}

export function trackPageView(name: string): void {
  client?.trackPageView({ name });
}

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  client?.trackEvent({ name }, properties);
}

export function trackException(error: unknown): void {
  if (!client) return;
  const exception =
    error instanceof Error ? error : new Error(String(error));
  client.trackException({ exception });
}

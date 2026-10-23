import { afterEach, describe, expect, it, vi } from "vitest";
import { AiNarrator } from "../../src/ai/narrator";
import { buildBroadcastExport } from "../../src/export";
import { BroadcastController } from "../../src/state/broadcast-controller";

function runToEnd(controller: BroadcastController): void {
  controller.engine.play();
  for (let i = 0; i < 200_000; i += 1) {
    controller.advanceBy(50);
    if (controller.engine.getStatus() === "finished") break;
  }
}

function proxyResponse(payload: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        text: JSON.stringify(payload),
        model: "gpt-test",
        provider: "proxy",
      }),
  } as unknown as Response;
}

describe("broadcast AI agent", () => {
  it("annotates every insight with grounded, auditable metadata", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();

    expect(snapshot.agentDecisions.length).toBeGreaterThan(0);
    expect(snapshot.aiStatus.provider).toBe("on-device");
    expect(snapshot.aiStatus.status).toBe("ready");
    expect(snapshot.aiStatus.mode).toBe("advisory");

    const insights = new Map(
      snapshot.insights.map((insight) => [insight.id, insight]),
    );
    for (const decision of snapshot.agentDecisions) {
      const insight = insights.get(decision.insightId);
      expect(insight).toBeDefined();
      expect(insight?.ai).toBeDefined();
      expect(decision.score).toBeGreaterThanOrEqual(0);
      expect(decision.score).toBeLessThanOrEqual(1);
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
      expect(decision.topFeature.length).toBeGreaterThan(0);
      expect(decision.mode).toBe("advisory");
      expect(decision.applied).toBe(false);
      expect(decision.evidenceEventIds).toEqual(insight?.evidenceEventIds);
    }
  });

  it("runs in autonomous mode and applies its priorities", () => {
    const controller = new BroadcastController();
    controller.setAgentMode("autonomous");
    runToEnd(controller);
    const snapshot = controller.snapshot();

    expect(snapshot.aiStatus.mode).toBe("autonomous");
    expect(snapshot.agentDecisions.length).toBeGreaterThan(0);
    expect(
      snapshot.agentDecisions.every(
        (decision) => decision.mode === "autonomous" && decision.applied,
      ),
    ).toBe(true);
    expect(
      snapshot.insights.every(
        (insight) =>
          insight.ai === undefined || insight.priority === insight.ai.priority,
      ),
    ).toBe(true);
  });

  it("boosts insights that involve a followed club", () => {
    const controller = new BroadcastController();
    controller.setPersonalization({ followedTeamId: "team-northbridge" });
    runToEnd(controller);
    const snapshot = controller.snapshot();

    expect(snapshot.personalization.followedTeamId).toBe("team-northbridge");
    expect(
      snapshot.agentDecisions.some((decision) => decision.action === "boost"),
    ).toBe(true);
  });

  it("exports the AI audit trail with the broadcast document", () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const document = buildBroadcastExport(controller.snapshot());

    expect(document.ai.status.enabled).toBe(true);
    expect(document.ai.decisions.length).toBeGreaterThan(0);
    expect(document.ai.decisions[0]?.at.timecode).toMatch(/H /);
    expect(document.personalization).toEqual({});
  });
});

describe("AI narrator", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("explains an insight locally from the agent metadata", async () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const insight = snapshot.insights.find((candidate) => candidate.ai);
    expect(insight).toBeDefined();

    const narrator = new AiNarrator({
      providerMode: "local",
      modelLabel: "on-device-priority-mlp-v1",
    });
    const narrative = await narrator.explain(insight!, snapshot.events, "en");

    expect(narrative.task).toBe("explain");
    expect(narrative.provider).toBe("on-device");
    expect(narrative.fallback).toBe(false);
    expect(narrative.evidenceEventIds).toEqual(insight!.evidenceEventIds);
    expect(narrative.text).toContain(insight!.explanation);
  });

  it("uses the deterministic recap when no LLM is configured", async () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const narrative = await controller.generateAiRecap();

    expect(narrative).not.toBeNull();
    expect(narrative?.task).toBe("recap");
    expect(narrative?.provider).toBe("deterministic-fallback");
    expect(narrative?.fallback).toBe(true);
    expect(narrative?.text.length).toBeGreaterThan(0);
    expect(controller.snapshot().aiNarratives).toHaveLength(1);
  });

  it("accepts only grounded LLM responses", async () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const insight = snapshot.insights.find((candidate) => candidate.ai);
    expect(insight).toBeDefined();

    const valid = {
      text: "The insight is supported by the listed evidence.",
      evidenceEventIds: insight!.evidenceEventIds,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => proxyResponse(valid)),
    );
    const narrator = new AiNarrator({
      providerMode: "proxy",
      proxyUrl: "https://example.invalid/ai",
      modelLabel: "gpt-test",
    });
    const narrative = await narrator.explain(insight!, snapshot.events, "en");
    expect(narrative.fallback).toBe(false);
    expect(narrative.provider).toBe("proxy");
    expect(narrative.model).toBe("gpt-test");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        proxyResponse({
          text: "A fabricated 123456789.5 expected-goals figure.",
          evidenceEventIds: insight!.evidenceEventIds,
        }),
      ),
    );
    const grounded = new AiNarrator({
      providerMode: "proxy",
      proxyUrl: "https://example.invalid/ai",
      modelLabel: "gpt-test",
    });
    const rejected = await grounded.explain(insight!, snapshot.events, "es");
    expect(rejected.fallback).toBe(true);
    expect(rejected.text).not.toContain("123456789.5");
  });

  it("rejects invented evidence identifiers", async () => {
    const controller = new BroadcastController();
    runToEnd(controller);
    const snapshot = controller.snapshot();
    const insight = snapshot.insights.find((candidate) => candidate.ai);
    expect(insight).toBeDefined();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        proxyResponse({
          text: "This claim is supported.",
          evidenceEventIds: ["evt-fabricated"],
        }),
      ),
    );
    const narrator = new AiNarrator({
      providerMode: "proxy",
      proxyUrl: "https://example.invalid/ai",
      modelLabel: "gpt-test",
    });
    const narrative = await narrator.explain(insight!, snapshot.events, "en");
    expect(narrative.fallback).toBe(true);
  });
});

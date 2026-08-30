// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { IntelligenceEvaluationResponse } from "../../packages/types/src/index.js";
import { IntelligenceEvaluationPanel } from "../../apps/web/src/App.js";

let root: Root | null = null;
let container: HTMLDivElement | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = null;
  container?.remove();
  container = null;
});

async function renderEvaluation(intelligence: IntelligenceEvaluationResponse | undefined): Promise<string> {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(createElement(IntelligenceEvaluationPanel, { intelligence })));
  return container.textContent ?? "";
}

describe("versioned intelligence browser states", () => {
  it("shows a truthful abstention when the engine is not configured", async () => {
    const text = await renderEvaluation({
      state: "not_configured",
      message: "The internal intelligence service is disabled.",
    });

    expect(text).toContain("Not configured");
    expect(text).toContain("No engine result is available");
  });

  it("shows service failure without substituting a prior result", async () => {
    const text = await renderEvaluation({
      state: "failed",
      failureCode: "service_unavailable",
      message: "The internal intelligence service could not be reached.",
    });

    expect(text).toContain("Unavailable");
    expect(text).toContain("service_unavailable");
    expect(text).toContain("No prior engine result was substituted");
  });

  it("shows versions and missing evidence for a completed engine result", async () => {
    const text = await renderEvaluation({
      state: "completed",
      message: "Versioned intelligence requires additional evidence.",
      result: {
        contractVersion: "1.1.0",
        evidenceSchemaVersion: "1.1.0",
        requestId: "request-ui-001",
        candidateId: "candidate-ui-001",
        generatedAt: "2026-08-29T12:05:00.000Z",
        status: "insufficient_evidence",
        versions: {
          engineVersion: "jurisdiction-rules-1.1.0",
          rulePackVersion: "2026-08-29.2",
          evidenceVersion: "ui-evidence-v1",
        },
        applicability: {
          status: "applicable",
          jurisdiction: "US/AZ/Maricopa",
          reason: "The verified Maricopa rule pack applies.",
          sourceRefs: ["upload-1"],
          rulePackId: "us-az-maricopa-tax-lien-v1",
        },
        evidenceDigest: "a".repeat(64),
        signals: [
          {
            key: "redemption_probability",
            status: "unavailable",
            method: "not_computed",
            unit: "probability",
            evidenceRefs: [],
            explanation: "No validated outcome model is installed.",
            missingEvidence: ["verified historical redemption outcomes"],
          },
        ],
        findings: [],
        missingEvidence: ["verified historical redemption outcomes"],
        limitations: ["No probability was computed."],
      },
    });

    expect(text).toContain("Insufficient evidence");
    expect(text).toContain("jurisdiction-rules-1.1.0");
    expect(text).toContain("2026-08-29.2");
    expect(text).toContain("verified historical redemption outcomes");
    expect(text).toContain("unavailable, not_computed");
  });
});

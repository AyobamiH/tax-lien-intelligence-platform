import type { CandidateEvidenceV1, EngineResultV1 } from "@tax-lien/engine-contract";
import { validateEngineResultV1 } from "@tax-lien/engine-contract";
import { digestCandidateEvidence } from "@tax-lien/jurisdiction-rules";
import type { IntelligenceEvaluationResponse } from "@tax-lien/types";

export interface IntelligenceClientConfig {
  enabled: boolean;
  baseUrl: string;
  serviceToken?: string;
  timeoutMs: number;
}

export interface IntelligenceEvaluator {
  evaluate(evidence: CandidateEvidenceV1): Promise<IntelligenceEvaluationResponse>;
}

export class IntelligenceServiceClient implements IntelligenceEvaluator {
  private readonly config: IntelligenceClientConfig;

  public constructor(config: IntelligenceClientConfig) {
    this.config = config;
  }

  public async evaluate(evidence: CandidateEvidenceV1): Promise<IntelligenceEvaluationResponse> {
    if (!this.config.enabled) {
      return {
        state: "not_configured",
        message: "Versioned intelligence was not requested because the internal service is disabled.",
      };
    }

    const attemptedAt = new Date().toISOString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/v1/evaluate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.serviceToken ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(evidence),
        signal: controller.signal,
      });
    } catch {
      return {
        state: "failed",
        failureCode: "service_unavailable",
        message: "Versioned intelligence could not be reached for this scoring run.",
        attemptedAt,
      };
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return {
        state: "failed",
        failureCode: "service_rejected",
        message: "Versioned intelligence rejected this evaluation request.",
        attemptedAt,
      };
    }

    let result: unknown;
    try {
      result = await response.json();
    } catch {
      return invalidResponse(attemptedAt);
    }

    if (!isEngineResultForEvidence(result, evidence)) {
      return invalidResponse(attemptedAt);
    }

    return {
      state: "completed",
      message: engineStatusMessage((result as EngineResultV1).status),
      attemptedAt,
      result: result as EngineResultV1,
    };
  }
}

export function isEngineResultForEvidence(
  result: unknown,
  evidence: CandidateEvidenceV1,
): result is EngineResultV1 {
  if (!validateEngineResultV1(result).valid) {
    return false;
  }
  const validated = result as EngineResultV1;
  return (
    validated.requestId === evidence.requestId &&
    validated.candidateId === evidence.candidateId &&
    validated.versions.evidenceVersion === evidence.evidenceVersion &&
    validated.evidenceDigest === digestCandidateEvidence(evidence)
  );
}

function invalidResponse(attemptedAt: string): IntelligenceEvaluationResponse {
  return {
    state: "failed",
    failureCode: "invalid_service_response",
    message: "Versioned intelligence returned a response that failed contract or evidence checks.",
    attemptedAt,
  };
}

function engineStatusMessage(status: EngineResultV1["status"]): string {
  switch (status) {
    case "assessed":
      return "Versioned deterministic intelligence is available.";
    case "insufficient_evidence":
      return "Versioned intelligence requires additional evidence.";
    case "out_of_scope":
      return "This jurisdiction is outside the verified rule-pack scope.";
  }
}

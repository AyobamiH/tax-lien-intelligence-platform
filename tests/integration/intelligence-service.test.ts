import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CANDIDATE_EVIDENCE_SCHEMA_VERSION,
  type CandidateEvidenceV1,
  type EngineResultV1,
  validateEngineResultV1,
} from "../../packages/engine-contract/src/index.js";
import { evaluateJurisdictionRules } from "../../packages/jurisdiction-rules/src/index.js";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const serviceToken = "intelligence-service-contract-test-token-0001";
const timestamp = "2026-08-29T10:00:00.000Z";

function unknownField() {
  return { state: "unknown" as const, sourceRefs: [] };
}

function evidenceVector(): CandidateEvidenceV1 {
  return {
    schemaVersion: CANDIDATE_EVIDENCE_SCHEMA_VERSION,
    evidenceVersion: "service-process-vector-v1",
    requestId: "request-service-process-001",
    candidateId: "candidate-service-process-001",
    asOf: timestamp,
    jurisdiction: { country: "US", state: "AZ", county: "Maricopa" },
    provenance: [
      {
        sourceId: "service-vector:county",
        sourceType: "county_record",
        authority: "Deterministic process contract vector",
        uri: "urn:tax-lien:service-test:county",
        retrievedAt: timestamp,
      },
      {
        sourceId: "service-vector:assessor",
        sourceType: "assessor_record",
        authority: "Deterministic process contract vector",
        uri: "urn:tax-lien:service-test:assessor",
        retrievedAt: timestamp,
      },
    ],
    fields: {
      parcelId: {
        state: "observed",
        value: "TEST-SERVICE-PARCEL",
        sourceRefs: ["service-vector:county"],
        observedAt: timestamp,
      },
      lienAmount: {
        state: "observed",
        value: { amount: 1_000.25, currency: "USD" },
        sourceRefs: ["service-vector:county"],
        observedAt: timestamp,
      },
      estimatedValue: {
        state: "observed",
        value: { amount: 12_000.75, currency: "USD" },
        sourceRefs: ["service-vector:assessor"],
        observedAt: timestamp,
      },
      propertyType: unknownField(),
      roadAccess: unknownField(),
      buildable: unknownField(),
      utilitiesAvailable: unknownField(),
      locationQuality: unknownField(),
    },
    limitations: ["Deterministic process contract vector; not production intelligence."],
  };
}

async function startService(): Promise<{
  baseUrl: string;
  process: ChildProcessWithoutNullStreams;
  stderr: () => string;
}> {
  const child = spawn(
    "python3",
    ["-m", "tax_lien_intelligence.server", "--host", "127.0.0.1", "--port", "0"],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        PYTHONPATH: `${repositoryRoot}services/intelligence/src`,
        INTELLIGENCE_SERVICE_TOKEN: serviceToken,
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stdoutBuffer = "";
  let stderrBuffer = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString("utf8");
  });

  const listening = new Promise<number>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for intelligence service. ${stderrBuffer}`));
    }, 10_000);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Intelligence service exited with ${String(code)}. ${stderrBuffer}`));
    });
    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split("\n");
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        try {
          const event = JSON.parse(line) as { event?: string; port?: number };
          if (event.event === "listening" && typeof event.port === "number") {
            clearTimeout(timeout);
            resolve(event.port);
          }
        } catch {
          // Non-JSON startup output is ignored and retained by process stderr logs.
        }
      }
    });
  });

  const port = await listening;
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    process: child,
    stderr: () => stderrBuffer,
  };
}

async function stopService(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    once(child, "exit"),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Intelligence service did not stop after SIGTERM.")), 5_000),
    ),
  ]);
}

describe("intelligence service process contract", () => {
  let running: Awaited<ReturnType<typeof startService>>;

  beforeAll(async () => {
    running = await startService();
  });

  afterAll(async () => {
    await stopService(running.process);
  });

  it("reports health and version truth without advertising model artifacts", async () => {
    const [healthResponse, versionResponse] = await Promise.all([
      fetch(`${running.baseUrl}/health`),
      fetch(`${running.baseUrl}/version`),
    ]);
    expect(healthResponse.status).toBe(200);
    expect(versionResponse.status).toBe(200);
    const health = (await healthResponse.json()) as Record<string, unknown>;
    const version = (await versionResponse.json()) as Record<string, unknown>;
    expect(health).toMatchObject({
      service: "tax-lien-intelligence",
      status: "ok",
      contractVersion: "1.0.0",
      engineVersion: "jurisdiction-rules-1.1.0",
    });
    expect(version.modelArtifacts).toEqual([]);
  });

  it("requires internal bearer authentication for evaluation", async () => {
    const response = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(evidenceVector()),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "service_auth_required",
        message: "A valid internal service bearer token is required.",
      },
    });
  });

  it("rejects non-JSON and oversized request bodies before evaluation", async () => {
    const unsupported = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "text/plain",
      },
      body: "not-json",
    });
    expect(unsupported.status).toBe(415);

    const oversized = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: "x".repeat(1_048_577),
    });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({
      error: {
        code: "request_too_large",
        message: "The request body exceeds the configured limit.",
      },
    });
  });

  it("returns a safe error for malformed JSON", async () => {
    const response = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "json_invalid",
        message: "The request body must be valid UTF-8 JSON.",
      },
    });
  });

  it("matches the TypeScript rule engine and contract over real loopback HTTP", async () => {
    const evidence = evidenceVector();
    const response = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evidence),
    });
    expect(response.status, running.stderr()).toBe(200);
    const serviceResult = (await response.json()) as EngineResultV1;
    expect(validateEngineResultV1(serviceResult)).toEqual({ valid: true, errors: [] });
    const TypeScriptOutcome = evaluateJurisdictionRules(evidence, {
      generatedAt: serviceResult.generatedAt,
    });
    expect(TypeScriptOutcome.ok).toBe(true);
    if (!TypeScriptOutcome.ok) return;
    expect(serviceResult).toEqual(TypeScriptOutcome.result);
  });

  it("returns contract errors without evaluating malformed evidence", async () => {
    const evidence = evidenceVector() as unknown as Record<string, unknown>;
    const fields = evidence.fields as Record<string, unknown>;
    fields.parcelId = { state: "observed", value: "TEST", sourceRefs: [] };
    const response = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evidence),
    });
    expect(response.status).toBe(400);
    const payload = (await response.json()) as {
      error: { code: string; details?: { errors: string[] } };
    };
    expect(payload.error.code).toBe("evidence_invalid");
    expect(payload.error.details?.errors).toContain(
      "fields.parcelId.sourceRefs must identify provenance when state is observed.",
    );
  });

  it("returns out_of_scope without values for an unsupported jurisdiction", async () => {
    const evidence = evidenceVector();
    evidence.jurisdiction.county = "Pima";
    const response = await fetch(`${running.baseUrl}/v1/evaluate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(evidence),
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as EngineResultV1;
    expect(result.status).toBe("out_of_scope");
    expect(result.signals[0]).not.toHaveProperty("value");
  });
});

import { getMongoConnectionState } from "@tax-lien/db";
import { apiConfig } from "../config/env.js";

export interface ReadinessResponse {
  service: "tax-lien-api";
  status: "ready" | "not_ready";
  timestamp: string;
  environment: string;
  dependencies: {
    mongodb: "connected" | "unavailable";
    intelligence: "disabled" | "ready" | "unavailable";
  };
}

export type ReadinessProbe = () => Promise<ReadinessResponse>;

export async function probeReadiness(): Promise<ReadinessResponse> {
  const mongodb = getMongoConnectionState() === "connected" ? "connected" : "unavailable";
  const intelligence = await probeIntelligence();
  const status = mongodb === "connected" && intelligence !== "unavailable" ? "ready" : "not_ready";

  return {
    service: "tax-lien-api",
    status,
    timestamp: new Date().toISOString(),
    environment: apiConfig.nodeEnv,
    dependencies: { mongodb, intelligence },
  };
}

async function probeIntelligence(): Promise<ReadinessResponse["dependencies"]["intelligence"]> {
  if (!apiConfig.intelligence.enabled) return "disabled";

  try {
    const response = await fetch(`${apiConfig.intelligence.baseUrl.replace(/\/$/, "")}/health`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(Math.min(apiConfig.intelligence.timeoutMs, 3_000)),
    });
    if (!response.ok) return "unavailable";
    const payload = (await response.json()) as { status?: unknown };
    return payload.status === "ok" ? "ready" : "unavailable";
  } catch {
    return "unavailable";
  }
}

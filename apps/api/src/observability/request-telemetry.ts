import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

const MAX_REPORTED_RESPONSE_BYTES = 1_048_576;
const INTERFACE_VERSION = "1.0.0";

export interface OperationalTelemetryEvent {
  event: "http_request_completed";
  requestId: string;
  route: OperationalRoute;
  method: string;
  status: number;
  errorClass: "none" | "client_error" | "rate_limited" | "server_error";
  durationMs: number;
  responseBytes: number;
  interfaceVersion: string;
  redactionOutcome: "payload_not_logged";
}

export type OperationalRoute =
  | "health"
  | "readiness"
  | "oauth_discovery"
  | "oauth_authorize"
  | "oauth_token"
  | "oauth_revoke"
  | "mcp"
  | "other";

export type OperationalTelemetrySink = (event: OperationalTelemetryEvent) => void;

export interface OperationalTelemetryOptions {
  enabled: boolean;
  sink?: OperationalTelemetrySink;
  now?: () => number;
  createRequestId?: () => string;
}

export function createOperationalTelemetry(
  options: OperationalTelemetryOptions,
): RequestHandler {
  if (!options.enabled) {
    return (_request, _response, next) => next();
  }

  const sink = options.sink ?? ((event) => console.log(JSON.stringify(event)));
  const now = options.now ?? Date.now;
  const createRequestId = options.createRequestId ?? randomUUID;

  return (request, response, next) => {
    const startedAt = now();
    const requestId = createRequestId();
    response.setHeader("X-Request-Id", requestId);

    response.once("finish", () => {
      sink({
        event: "http_request_completed",
        requestId,
        route: classifyOperationalRoute(request.path),
        method: request.method.toUpperCase(),
        status: response.statusCode,
        errorClass: classifyError(response.statusCode),
        durationMs: Math.max(0, Math.round(now() - startedAt)),
        responseBytes: boundedResponseBytes(response.getHeader("content-length")),
        interfaceVersion: INTERFACE_VERSION,
        redactionOutcome: "payload_not_logged",
      });
    });

    next();
  };
}

export function classifyOperationalRoute(path: string): OperationalRoute {
  if (path === "/healthz") return "health";
  if (path === "/readyz") return "readiness";
  if (
    path === "/.well-known/oauth-protected-resource" ||
    path === "/.well-known/oauth-protected-resource/mcp" ||
    path === "/.well-known/oauth-authorization-server"
  ) {
    return "oauth_discovery";
  }
  if (path === "/oauth/authorize") return "oauth_authorize";
  if (path === "/oauth/token") return "oauth_token";
  if (path === "/oauth/revoke") return "oauth_revoke";
  if (path === "/mcp" || path === "/mcp/") return "mcp";
  return "other";
}

function classifyError(status: number): OperationalTelemetryEvent["errorClass"] {
  if (status === 429) return "rate_limited";
  if (status >= 500) return "server_error";
  if (status >= 400) return "client_error";
  return "none";
}

function boundedResponseBytes(value: number | string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = typeof raw === "number" ? raw : Number.parseInt(raw ?? "0", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.round(parsed), MAX_REPORTED_RESPONSE_BYTES);
}

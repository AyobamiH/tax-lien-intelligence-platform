import { Container } from "@cloudflare/containers";
import { env } from "cloudflare:workers";
import {
  buildForwardedHeaders,
  classifyGatewayRequest,
  exceedsIngressBodyLimit,
  isCanonicalOrigin,
  readBoundedRequestBody,
  type GatewayRoute,
} from "./gateway-policy.js";

interface StagingEnv {
  API_CONTAINER: DurableObjectNamespace<TaxLienStagingContainer>;
  OAUTH_GATEWAY_LIMITER: RateLimit;
  MCP_GATEWAY_LIMITER: RateLimit;
  STAGING_ORIGIN: string;
  SOURCE_REVISION: string;
  MONGODB_URI: string;
  JWT_SECRET: string;
  INTELLIGENCE_SERVICE_TOKEN: string;
  MCP_OAUTH_SIGNING_SECRET: string;
}

declare global {
  namespace Cloudflare {
    interface Env extends StagingEnv {}
  }
}

export class TaxLienStagingContainer extends Container<StagingEnv> {
  defaultPort = 4000;
  requiredPorts = [4000, 8081];
  sleepAfter = "1h";
  envVars = {
    NODE_ENV: "production",
    SOURCE_REVISION: env.SOURCE_REVISION,
    API_PORT: "4000",
    TRUST_PROXY_HOPS: "1",
    OPERATIONAL_LOGGING_ENABLED: "true",
    MONGODB_URI: env.MONGODB_URI,
    MONGODB_DB_NAME: "tax_lien_chatgpt_staging",
    JWT_SECRET: env.JWT_SECRET,
    CORS_ALLOWED_ORIGINS: "",
    CENSUS_GEOCODER_ENABLED: "false",
    MAINTENANCE_AUTO_REFRESH_ENABLED: "false",
    INTELLIGENCE_SERVICE_ENABLED: "true",
    INTELLIGENCE_SERVICE_BASE_URL: "http://127.0.0.1:8081",
    INTELLIGENCE_SERVICE_TOKEN: env.INTELLIGENCE_SERVICE_TOKEN,
    MCP_APP_BASE_URL: env.STAGING_ORIGIN,
    MCP_OAUTH_ENABLED: "true",
    MCP_OAUTH_ISSUER_URL: env.STAGING_ORIGIN,
    MCP_OAUTH_RESOURCE_URL: `${env.STAGING_ORIGIN}/mcp`,
    MCP_OAUTH_ALLOWED_CLIENT_IDS: "https://chatgpt.com/oauth/client.json",
    MCP_OAUTH_ALLOWED_REDIRECT_URIS: "https://chatgpt.com/connector_platform_oauth_redirect",
    MCP_OAUTH_SCOPE: "tax_lien:read",
    MCP_OAUTH_SIGNING_SECRET: env.MCP_OAUTH_SIGNING_SECRET,
    MCP_OAUTH_AUTHORIZATION_CODE_TTL_SECONDS: "300",
    MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS: "900",
    MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS: "604800",
    MCP_OAUTH_RATE_LIMIT_WINDOW_MS: "60000",
    MCP_OAUTH_RATE_LIMIT_MAX: "30",
    EMAIL_DELIVERY_ENABLED: "false",
  };

  override onStart(): void {
    console.log(JSON.stringify({ event: "staging_container_started" }));
  }

  override onStop(params: { exitCode: number; reason: string }): void {
    console.log(
      JSON.stringify({
        event: "staging_container_stopped",
        exitCode: params.exitCode,
        reason: params.reason,
      }),
    );
  }

  override onError(_error: unknown): void {
    console.error(JSON.stringify({ event: "staging_container_error", errorClass: "container_runtime" }));
  }
}

export default {
  async fetch(request: Request, workerEnv: StagingEnv): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    const route = classifyGatewayRequest(request.method, url.pathname);

    if (!isCanonicalOrigin(url.origin, workerEnv.STAGING_ORIGIN)) {
      const response = gatewayResponse(421, "origin_misdirected");
      logGatewayRequest(route ?? "rejected", response.status, startedAt);
      return response;
    }
    if (!route) {
      const response = gatewayResponse(404, "route_not_found");
      logGatewayRequest("rejected", response.status, startedAt);
      return response;
    }
    if (exceedsIngressBodyLimit(request.headers.get("content-length"))) {
      const response = gatewayResponse(413, "request_too_large");
      logGatewayRequest(route, response.status, startedAt);
      return response;
    }

    const limit = await applyGatewayLimit(route, workerEnv);
    if (!limit) {
      const response = gatewayResponse(429, "rate_limit_exceeded", { "Retry-After": "60" });
      logGatewayRequest(route, response.status, startedAt);
      return response;
    }

    let boundedBody: Awaited<ReturnType<typeof readBoundedRequestBody>>;
    try {
      boundedBody = await readBoundedRequestBody(request);
    } catch {
      const response = gatewayResponse(400, "request_body_unreadable");
      logGatewayRequest(route, response.status, startedAt);
      return response;
    }
    if (!boundedBody.accepted) {
      const response = gatewayResponse(413, "request_too_large");
      logGatewayRequest(route, response.status, startedAt);
      return response;
    }

    try {
      const container = workerEnv.API_CONTAINER.getByName("private-staging");
      const forwardedHeaders = buildForwardedHeaders(request.headers, url);
      forwardedHeaders.delete("content-length");
      const forwardedRequest = new Request(request, {
        headers: forwardedHeaders,
        body: boundedBody.body,
      });
      const response = await container.fetch(forwardedRequest);
      const hardened = new Response(response.body, response);
      hardened.headers.set("Cache-Control", "no-store");
      hardened.headers.set("X-Content-Type-Options", "nosniff");
      logGatewayRequest(route, hardened.status, startedAt);
      return hardened;
    } catch {
      const response = gatewayResponse(503, "staging_service_unavailable");
      logGatewayRequest(route, response.status, startedAt);
      return response;
    }
  },
} satisfies ExportedHandler<StagingEnv>;

async function applyGatewayLimit(route: GatewayRoute, workerEnv: StagingEnv): Promise<boolean> {
  if (route === "oauth") {
    return (await workerEnv.OAUTH_GATEWAY_LIMITER.limit({ key: "oauth" })).success;
  }
  if (route === "mcp") {
    return (await workerEnv.MCP_GATEWAY_LIMITER.limit({ key: "mcp" })).success;
  }
  return true;
}

function gatewayResponse(status: number, code: string, headers: HeadersInit = {}): Response {
  return Response.json(
    { error: { code, message: "The staging gateway could not serve this request." } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

function logGatewayRequest(route: GatewayRoute | "rejected", status: number, startedAt: number): void {
  console.log(
    JSON.stringify({
      event: "staging_gateway_request",
      route,
      status,
      errorClass: status === 429 ? "rate_limited" : status >= 500 ? "server_error" : status >= 400 ? "client_error" : "none",
      durationMs: Math.max(0, Date.now() - startedAt),
      redactionOutcome: "payload_not_logged",
    }),
  );
}

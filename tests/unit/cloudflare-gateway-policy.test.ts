import { describe, expect, it } from "vitest";
import {
  MAX_INGRESS_BODY_BYTES,
  buildForwardedHeaders,
  classifyGatewayRequest,
  exceedsIngressBodyLimit,
  isCanonicalOrigin,
  readBoundedRequestBody,
} from "../../infra/cloudflare/src/gateway-policy.js";

describe("Cloudflare private-staging gateway policy", () => {
  it("admits only health, OAuth discovery/lifecycle, and the read-only MCP endpoint", () => {
    expect(classifyGatewayRequest("GET", "/healthz")).toBe("health");
    expect(classifyGatewayRequest("GET", "/readyz")).toBe("readiness");
    expect(classifyGatewayRequest("GET", "/.well-known/oauth-authorization-server")).toBe(
      "oauth_discovery",
    );
    expect(classifyGatewayRequest("POST", "/oauth/token")).toBe("oauth");
    expect(classifyGatewayRequest("POST", "/mcp")).toBe("mcp");

    expect(classifyGatewayRequest("GET", "/mcp")).toBeNull();
    expect(classifyGatewayRequest("POST", "/auth/register")).toBeNull();
    expect(classifyGatewayRequest("POST", "/datasets")).toBeNull();
    expect(classifyGatewayRequest("POST", "/scores/mutate")).toBeNull();
    expect(classifyGatewayRequest("POST", "/bid")).toBeNull();
    expect(classifyGatewayRequest("POST", "/purchase")).toBeNull();
  });

  it("rejects declared oversized or invalid request lengths", () => {
    expect(exceedsIngressBodyLimit(null)).toBe(false);
    expect(exceedsIngressBodyLimit(String(MAX_INGRESS_BODY_BYTES))).toBe(false);
    expect(exceedsIngressBodyLimit(String(MAX_INGRESS_BODY_BYTES + 1))).toBe(true);
    expect(exceedsIngressBodyLimit("not-a-number")).toBe(true);
    expect(exceedsIngressBodyLimit("-1")).toBe(true);
  });

  it("rejects an oversized streamed body without a content-length header", async () => {
    const request = new Request("https://staging.example.test/mcp", {
      method: "POST",
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("123"));
          controller.enqueue(new TextEncoder().encode("456"));
          controller.close();
        },
      }),
      duplex: "half",
    } as RequestInit);

    await expect(readBoundedRequestBody(request, 5)).resolves.toEqual({
      accepted: false,
      body: null,
    });
  });

  it("requires the exact configured HTTPS origin", () => {
    expect(
      isCanonicalOrigin(
        "https://tax-lien-chatgpt-staging.example.workers.dev",
        "https://tax-lien-chatgpt-staging.example.workers.dev",
      ),
    ).toBe(true);
    expect(
      isCanonicalOrigin(
        "https://preview.example.workers.dev",
        "https://tax-lien-chatgpt-staging.example.workers.dev",
      ),
    ).toBe(false);
    expect(isCanonicalOrigin("http://localhost:8787", "http://localhost:8787")).toBe(false);
    expect(isCanonicalOrigin("https://example.com", "https://example.com/path")).toBe(false);
  });

  it("replaces caller-supplied proxy hops with the Cloudflare edge identity", () => {
    const headers = new Headers({
      "cf-connecting-ip": "192.0.2.44",
      "x-forwarded-for": "198.51.100.9",
      "x-forwarded-host": "attacker.example",
      "x-forwarded-proto": "http",
    });
    const forwarded = buildForwardedHeaders(
      headers,
      new URL("https://tax-lien-chatgpt-staging.example.workers.dev/mcp"),
    );

    expect(forwarded.get("x-forwarded-for")).toBe("192.0.2.44");
    expect(forwarded.get("x-forwarded-host")).toBe(
      "tax-lien-chatgpt-staging.example.workers.dev",
    );
    expect(forwarded.get("x-forwarded-proto")).toBe("https");
  });
});

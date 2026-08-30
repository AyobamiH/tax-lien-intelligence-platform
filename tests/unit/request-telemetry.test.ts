import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import {
  classifyOperationalRoute,
  type OperationalTelemetryEvent,
} from "../../apps/api/src/observability/request-telemetry.js";

describe("payload-safe operational telemetry", () => {
  it("logs a bounded route event without credentials, arguments, query values, or bodies", async () => {
    const events: OperationalTelemetryEvent[] = [];
    const times = [100, 107];
    const response = await request(
      createApp({
        operationalTelemetry: {
          enabled: true,
          sink: (event) => events.push(event),
          now: () => times.shift() ?? 107,
          createRequestId: () => "request-00000000-0000-4000-8000-000000000001",
        },
      }),
    )
      .post("/mcp?access_token=query-secret")
      .set("Authorization", "Bearer header-secret")
      .send({ method: "tools/call", params: { password: "body-secret" } });

    expect(response.headers["x-request-id"]).toBe(
      "request-00000000-0000-4000-8000-000000000001",
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      event: "http_request_completed",
      requestId: "request-00000000-0000-4000-8000-000000000001",
      route: "mcp",
      method: "POST",
      status: 401,
      errorClass: "client_error",
      durationMs: 7,
      responseBytes: expect.any(Number),
      interfaceVersion: "1.0.0",
      redactionOutcome: "payload_not_logged",
    });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain("query-secret");
    expect(serialized).not.toContain("header-secret");
    expect(serialized).not.toContain("body-secret");
    expect(serialized).not.toContain("password");
  });

  it("classifies only low-cardinality release routes", () => {
    expect(classifyOperationalRoute("/oauth/token")).toBe("oauth_token");
    expect(classifyOperationalRoute("/.well-known/oauth-protected-resource/mcp")).toBe(
      "oauth_discovery",
    );
    expect(classifyOperationalRoute("/datasets/private-id")).toBe("other");
  });
});

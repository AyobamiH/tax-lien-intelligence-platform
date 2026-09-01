import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildCorsOptions, createApp } from "../../apps/api/src/app.js";

describe("API health endpoint", () => {
  const sourceRevision = "a".repeat(40);

  it("returns a typed health payload", async () => {
    const response = await request(createApp()).get("/healthz").expect(200);

    expect(response.body).toMatchObject({
      service: "tax-lien-api",
      status: "ok",
      environment: expect.any(String),
    });
    expect(Date.parse(response.body.timestamp)).not.toBeNaN();
  });

  it("returns a clean JSON 404 for unknown routes", async () => {
    const response = await request(createApp()).get("/missing").expect(404);

    expect(response.body).toEqual({
      error: {
        code: "route_not_found",
        message: "The requested API route does not exist.",
      },
    });
  });

  it("reports dependency readiness without exposing connection details", async () => {
    const response = await request(
      createApp({
        readinessProbe: async () => ({
          service: "tax-lien-api",
          status: "ready",
          timestamp: "2026-08-30T20:30:00.000Z",
          environment: "test",
          dependencies: {
            mongodb: "connected",
            intelligence: "ready",
          },
        }),
      }),
    )
      .get("/readyz")
      .expect(200);

    expect(response.body).toEqual({
      service: "tax-lien-api",
      status: "ready",
      timestamp: "2026-08-30T20:30:00.000Z",
      environment: "test",
      dependencies: {
        mongodb: "connected",
        intelligence: "ready",
      },
    });
  });

  it("exposes exact deployment provenance on health and readiness", async () => {
    const app = createApp({
      sourceRevision,
      readinessProbe: async () => ({
        service: "tax-lien-api",
        status: "ready",
        timestamp: "2026-09-01T08:30:00.000Z",
        environment: "test",
        dependencies: { mongodb: "connected", intelligence: "ready" },
      }),
    });

    const [health, readiness] = await Promise.all([
      request(app).get("/healthz").expect(200),
      request(app).get("/readyz").expect(200),
    ]);

    expect(health.headers["x-tax-lien-source-revision"]).toBe(sourceRevision);
    expect(readiness.headers["x-tax-lien-source-revision"]).toBe(sourceRevision);
  });

  it("fails readiness closed when a dependency is unavailable", async () => {
    const response = await request(
      createApp({
        readinessProbe: async () => ({
          service: "tax-lien-api",
          status: "not_ready",
          timestamp: "2026-08-30T20:30:00.000Z",
          environment: "test",
          dependencies: {
            mongodb: "unavailable",
            intelligence: "ready",
          },
        }),
      }),
    )
      .get("/readyz")
      .expect(503);

    expect(response.body.dependencies).toEqual({
      mongodb: "unavailable",
      intelligence: "ready",
    });
  });

  it("keeps reflected credentialed CORS out of production when no origins are configured", () => {
    const options = buildCorsOptions({
      nodeEnv: "production",
      cors: { allowedOrigins: [] },
    } as Parameters<typeof buildCorsOptions>[0]);

    expect(options.origin).toBe(false);
    expect(options.credentials).toBe(true);
  });

  it("allows only configured browser origins when an allowlist is configured", async () => {
    const options = buildCorsOptions({
      nodeEnv: "production",
      cors: { allowedOrigins: ["https://app.example.test"] },
    } as Parameters<typeof buildCorsOptions>[0]);

    expect(typeof options.origin).toBe("function");

    const origin = options.origin;
    if (typeof origin !== "function") {
      throw new Error("Expected function origin policy.");
    }

    const allowed = await resolveCorsOrigin(origin, "https://app.example.test");
    const denied = await resolveCorsOrigin(origin, "https://evil.example.test");
    const noOrigin = await resolveCorsOrigin(origin, undefined);

    expect(allowed).toBe(true);
    expect(denied).toBe(false);
    expect(noOrigin).toBe(true);
    expect(options.credentials).toBe(true);
  });
});

function resolveCorsOrigin(
  originPolicy: Exclude<
    ReturnType<typeof buildCorsOptions>["origin"],
    boolean | string | RegExp | Array<string | RegExp> | undefined
  >,
  origin: string | undefined,
): Promise<boolean | string> {
  return new Promise((resolve, reject) => {
    originPolicy(origin, (error, allowed) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(allowed);
    });
  });
}

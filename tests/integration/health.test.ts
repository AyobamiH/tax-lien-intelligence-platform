import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildCorsOptions, createApp } from "../../apps/api/src/app.js";

describe("API health endpoint", () => {
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

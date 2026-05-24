import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";

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
});

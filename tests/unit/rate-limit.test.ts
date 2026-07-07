import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../../apps/api/src/errors/error-handler.js";
import { createFixedWindowRateLimit } from "../../apps/api/src/middleware/rate-limit.js";

describe("fixed-window rate limit middleware", () => {
  it("returns 429 after the configured limit and allows requests after the window resets", async () => {
    let now = 1_000;
    const app = express();
    app.get(
      "/expensive",
      createFixedWindowRateLimit({
        windowMs: 1_000,
        maxRequests: 1,
        now: () => now,
      }),
      (_request, response) => response.status(200).json({ ok: true }),
    );
    app.use(errorHandler);

    await request(app).get("/expensive").expect(200);

    const limited = await request(app).get("/expensive").expect(429);
    expect(limited.body).toMatchObject({
      error: {
        code: "rate_limit_exceeded",
        message: "Too many requests. Please wait before trying again.",
        details: {
          retryAfterMs: 1_000,
        },
      },
    });

    now = 2_001;
    await request(app).get("/expensive").expect(200);
  });

  it("invokes the limit hook once for each blocked request with the retry window", async () => {
    let hookCalls: Array<{ retryAfterMs: number; path: string }> = [];
    const app = express();
    app.post(
      "/expensive",
      createFixedWindowRateLimit({
        windowMs: 10_000,
        maxRequests: 1,
        now: () => 5_000,
        onLimit: (request, context) => {
          hookCalls = [...hookCalls, { retryAfterMs: context.retryAfterMs, path: request.path }];
        },
      }),
      (_request, response) => response.status(202).json({ queued: true }),
    );
    app.use(errorHandler);

    await request(app).post("/expensive").expect(202);
    await request(app).post("/expensive").expect(429);

    expect(hookCalls).toEqual([{ retryAfterMs: 10_000, path: "/expensive" }]);
  });
});

import type { Request, RequestHandler } from "express";
import { ApiError } from "../errors/api-error.js";

export interface FixedWindowRateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
  now?: () => number;
  onLimit?: (request: Request, context: { retryAfterMs: number }) => void | Promise<void>;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export function createFixedWindowRateLimit(options: FixedWindowRateLimitOptions): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  const now = options.now ?? Date.now;

  return async (request, _response, next) => {
    try {
      const timestamp = now();
      const key = rateLimitKey(request, options.keyPrefix ?? "request");
      const current = buckets.get(key);
      const bucket =
        current && current.resetAt > timestamp
          ? current
          : {
              count: 0,
              resetAt: timestamp + options.windowMs,
            };

      bucket.count += 1;
      buckets.set(key, bucket);

      if (bucket.count > options.maxRequests) {
        const retryAfterMs = Math.max(0, bucket.resetAt - timestamp);
        await options.onLimit?.(request, { retryAfterMs });
        throw new ApiError(
          429,
          "rate_limit_exceeded",
          "Too many requests. Please wait before trying again.",
          {
            retryAfterMs,
          },
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

function rateLimitKey(request: Request, prefix: string): string {
  const actor = request.auth?.userId ?? "anonymous";
  const workspace = request.workspace?.workspaceId ?? "no-workspace";
  const route = request.route?.path ?? request.path;

  return [prefix, actor, workspace, request.method, request.baseUrl, route].join(":");
}

import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Request, RequestHandler } from "express";
import { env } from "../env.js";
import { ApiError } from "./errors.js";

const redis =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN })
    : null;

if (!redis) {
  console.warn("Rate limiting is off: set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to turn it on.");
}

export function clientIp(req: Request): string {
  return req.get("x-real-ip") ?? req.ip ?? "unknown";
}

export function rateLimit(name: string, requests: number, window: Duration): RequestHandler {
  const limiter = redis
    ? new Ratelimit({ redis, prefix: `ratelimit:${name}`, limiter: Ratelimit.slidingWindow(requests, window) })
    : null;

  return async (req, res, next) => {
    if (!limiter) return next();
    const { success, reset } = await limiter.limit(clientIp(req));
    if (!success) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))));
      throw new ApiError(429, "RATE_LIMITED", "That's a lot of requests in a short time. Please wait a moment and try again.");
    }
    next();
  };
}

import type { ApiErrorBody, ApiErrorCode } from "@rktd/domain";
import type { ErrorRequestHandler } from "express";
import type { z } from "zod";
import { isBusy } from "../db.js";

type ErrorExtras = Omit<ApiErrorBody["error"], "code" | "message">;

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly extras: ErrorExtras;

  constructor(status: number, code: ApiErrorCode, message: string, extras: ErrorExtras = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extras = extras;
  }
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError(400, "INVALID_REQUEST", "Some details are missing or in the wrong format.", {
      fieldErrors: result.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
  }
  return result.data;
}

function isBadJson(error: unknown): boolean {
  return typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed";
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = { error: { code: error.code, message: error.message, ...error.extras } };
    res.status(error.status).json(body);
    return;
  }
  if (isBadJson(error)) {
    res.status(400).json({ error: { code: "INVALID_REQUEST", message: "The request body isn't valid JSON." } });
    return;
  }
  if (isBusy(error)) {
    res.status(503).json({ error: { code: "BUSY", message: "Lots of people are booking right now. Please try again in a few seconds." } });
    return;
  }
  console.error(error);
  res.status(500).json({ error: { code: "SERVER_ERROR", message: "Something went wrong on our side. Please try again." } });
};

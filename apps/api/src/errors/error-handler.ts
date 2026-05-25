import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import type { ApiErrorResponse } from "@tax-lien/types";
import { apiConfig } from "../config/env.js";
import { ApiError, isApiError } from "./api-error.js";

function isJsonSyntaxError(error: unknown): error is SyntaxError {
  return error instanceof SyntaxError && "body" in error;
}

function validationErrorResponse(): ApiErrorResponse {
  return {
    error: {
      code: "validation_failed",
      message: "Request payload is invalid.",
    },
  };
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: "route_not_found",
      message: "The requested API route does not exist.",
    },
  } satisfies ApiErrorResponse);
};

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (isApiError(error)) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
      },
    } satisfies ApiErrorResponse);
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json(validationErrorResponse());
    return;
  }

  if (isJsonSyntaxError(error)) {
    response.status(400).json({
      error: {
        code: "invalid_json",
        message: "Request body must be valid JSON.",
      },
    } satisfies ApiErrorResponse);
    return;
  }

  const message =
    apiConfig.nodeEnv === "production" ? "An unexpected error occurred." : "Unexpected server error.";

  response.status(500).json({
    error: {
      code: "internal_server_error",
      message,
    },
  } satisfies ApiErrorResponse);
};

export function toValidationError(): ApiError {
  return new ApiError(400, "validation_failed", "Request payload is invalid.");
}

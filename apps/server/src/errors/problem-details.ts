import type { ServerResponse } from "node:http";

/**
 * RFC 9457 Problem Details implementation for Sonder API.
 * Content-Type: application/problem+json
 */
export interface ProblemDetailsPayload {
  type: string;
  title: string;
  status: number;
  detail: string;
  code?: string;
  instance?: string;
  invalidParams?: Array<{ name: string; reason: string }>;
}

export class HttpProblemError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly code: string;
  readonly detail: string;
  readonly invalidParams?: Array<{ name: string; reason: string }>;

  constructor(params: {
    status: number;
    type?: string;
    title: string;
    code: string;
    detail: string;
    invalidParams?: Array<{ name: string; reason: string }>;
  }) {
    super(params.detail);
    this.name = "HttpProblemError";
    this.status = params.status;
    this.type = params.type ?? `https://api.sonder.local/errors/${params.code.toLowerCase()}`;
    this.title = params.title;
    this.code = params.code;
    this.detail = params.detail;
    this.invalidParams = params.invalidParams;
  }

  toPayload(instance?: string): ProblemDetailsPayload {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      code: this.code,
      instance,
      invalidParams: this.invalidParams,
    };
  }
}

export function createBadRequestError(detail: string, code = "BAD_REQUEST"): HttpProblemError {
  return new HttpProblemError({
    status: 400,
    title: "Bad Request",
    code,
    detail,
  });
}

export function createUnauthorizedError(detail = "Authentication required.", code = "AUTHENTICATION_REQUIRED"): HttpProblemError {
  return new HttpProblemError({
    status: 401,
    title: "Unauthorized",
    code,
    detail,
  });
}

export function createForbiddenError(detail: string, code = "FORBIDDEN"): HttpProblemError {
  return new HttpProblemError({
    status: 403,
    title: "Forbidden",
    code,
    detail,
  });
}

export function createNotFoundError(detail: string, code = "RESOURCE_NOT_FOUND"): HttpProblemError {
  return new HttpProblemError({
    status: 404,
    title: "Not Found",
    code,
    detail,
  });
}

export function createConflictError(detail: string, code = "CONFLICT"): HttpProblemError {
  return new HttpProblemError({
    status: 409,
    title: "Conflict",
    code,
    detail,
  });
}

export function createUnprocessableError(
  detail: string,
  invalidParams?: Array<{ name: string; reason: string }>,
  code = "UNPROCESSABLE_ENTITY"
): HttpProblemError {
  return new HttpProblemError({
    status: 422,
    title: "Unprocessable Content",
    code,
    detail,
    invalidParams,
  });
}

export function createServiceUnavailableError(
  detail = "Service readiness dependencies are currently unavailable.",
  code = "SERVICE_UNAVAILABLE"
): HttpProblemError {
  return new HttpProblemError({
    status: 503,
    title: "Service Unavailable",
    code,
    detail,
  });
}

/**
 * Sends an RFC 9457 Problem Details HTTP response.
 */
export function sendProblemResponse(
  res: ServerResponse,
  error: HttpProblemError | Error | unknown,
  instance?: string,
  extraHeaders?: Record<string, string>
): void {
  let problem: HttpProblemError;

  if (error instanceof HttpProblemError) {
    problem = error;
  } else if (error instanceof Error) {
    problem = new HttpProblemError({
      status: 500,
      title: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
      detail: process.env.NODE_ENV === "production" ? "An internal server error occurred." : error.message,
    });
  } else {
    problem = new HttpProblemError({
      status: 500,
      title: "Internal Server Error",
      code: "INTERNAL_SERVER_ERROR",
      detail: "An unexpected error occurred.",
    });
  }

  const payload = problem.toPayload(instance);
  const jsonBody = JSON.stringify(payload);

  const headers: Record<string, string | number> = {
    "Content-Type": "application/problem+json",
    "Content-Length": Buffer.byteLength(jsonBody),
    "Cache-Control": "no-store",
    ...extraHeaders,
  };

  res.writeHead(problem.status, headers);
  res.end(jsonBody);
}

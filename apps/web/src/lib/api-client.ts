import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "./uuid.js";

export class ApiProblemError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly detail?: string;
  readonly problem: ApiSchema<"Problem">;

  constructor(status: number, problem: ApiSchema<"Problem">) {
    super(problem.detail ?? problem.title ?? `HTTP Error ${status}`);
    this.name = "ApiProblemError";
    this.status = status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.problem = problem;
  }
}

export interface RequestOptions extends RequestInit {
  csrfToken?: string | null;
  mutationId?: string;
  previewRoleId?: string | null;
}

const API_BASE = "/api/v1";

/**
 * Type-safe API client enforcing Sonder contract invariants:
 * - Credentials included on all requests (for __Host-session and __Host-auth-csrf); callers cannot override this
 * - Required X-Mutation-Id (UUIDv7) on mutating methods (POST, PUT, PATCH, DELETE)
 * - Required X-CSRF-Token on mutating methods; fails closed if omitted or empty
 * - application/problem+json error decoding
 * - Role-Preview Simulation Safeguard (FEAT-G03): blocks mutating requests when X-Preview-Role-Id is active
 */
/**
 * Canonical allowlist of contract-defined POST endpoints that are read-only / non-mutating
 * (queries, export streams, and calculation previews). All other POST operations mutate state.
 */
export const NON_MUTATING_POST_ALLOWLIST: readonly RegExp[] = [
  /^\/communities\/[^/]+\/workspaces\/[^/]+\/tasks\/query$/,
  /^\/communities\/[^/]+\/my-work\/query$/,
  /^\/communities\/[^/]+\/workspaces\/[^/]+\/audit-events\/export$/,
  /^\/communities\/[^/]+\/admin\/audit-events\/export$/,
  /^\/communities\/[^/]+\/workspaces\/[^/]+\/tasks\/[^/]+\/move-preview$/,
  /^\/communities\/[^/]+\/workspaces\/[^/]+\/role-preview$/,
] as const;

/**
 * Checks whether an endpoint matches the contract-defined allowlist of non-mutating POST operations.
 */
export function isNonMutatingPostEndpoint(endpoint: string): boolean {
  const pathname = endpoint.split("?")[0]!;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return NON_MUTATING_POST_ALLOWLIST.some((pattern) => pattern.test(normalized));
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    csrfToken,
    mutationId,
    previewRoleId,
    headers: customHeaders,
    method = "GET",
    credentials: _ignoredCredentials,
    ...rest
  } = options;
  const isStateMutation =
    ["PUT", "PATCH", "DELETE"].includes(method.toUpperCase()) ||
    (method.toUpperCase() === "POST" && !isNonMutatingPostEndpoint(endpoint));
  const isMutatingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());

  const headers = new Headers(customHeaders);

  if (previewRoleId) {
    headers.set("X-Preview-Role-Id", previewRoleId);
  }

  // Role preview safeguard: prevent accidental state mutations while simulating another role.
  // Distinguishes state mutations from POST-based read/export operations (e.g. /export, /query).
  if (isStateMutation && headers.get("X-Preview-Role-Id")) {
    throw new ApiProblemError(403, {
      type: "https://errors.sonder.platform/preview-mode-read-only",
      title: "Preview Mode Read Only",
      status: 403,
      detail: "Exit Role Preview mode before making changes to workspace data.",
      code: "PREVIEW_MODE_READ_ONLY",
    });
  }

  if (isMutatingMethod) {
    if (!csrfToken || !csrfToken.trim()) {
      throw new ApiProblemError(400, {
        type: "https://errors.sonder.platform/csrf-error",
        title: "CSRF Token Required",
        status: 400,
        detail: "A valid CSRF synchronizer token is required for mutating requests.",
        code: "CSRF_TOKEN_REQUIRED",
      });
    }

    headers.set("Content-Type", "application/json");
    headers.set("X-Mutation-Id", mutationId ?? generateUuidV7());
    headers.set("X-CSRF-Token", csrfToken.trim());
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  // Enforce credentials: "include" after ...rest so caller cannot override
  const response = await fetch(url, {
    ...rest,
    method,
    headers,
    credentials: "include",
  });

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json") || contentType.includes("application/problem+json");

  if (!response.ok) {
    let problemData: ApiSchema<"Problem">;
    if (isJson) {
      try {
        problemData = (await response.json()) as ApiSchema<"Problem">;
      } catch {
        problemData = {
          type: "https://errors.sonder.platform/network-error",
          title: response.statusText || "Request Failed",
          status: response.status,
          detail: "Unable to parse server problem details.",
        };
      }
    } else {
      problemData = {
        type: "https://errors.sonder.platform/http-error",
        title: response.statusText || "Request Failed",
        status: response.status,
        detail: await response.text(),
      };
    }
    throw new ApiProblemError(response.status, problemData);
  }

  if (isJson) {
    return (await response.json()) as T;
  }

  return (await response.text()) as unknown as T;
}

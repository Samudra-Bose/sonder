import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { type ServerConfig, loadConfig } from "./config.js";
import { handleHealthRoutes } from "./modules/health/health.router.js";
import { handleRoleRoutes } from "./modules/roles/roles.router.js";
import {
  createNotFoundError,
  createForbiddenError,
  sendProblemResponse,
} from "./errors/problem-details.js";

export function createApp(config: ServerConfig = loadConfig()): http.Server {
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const startTime = Date.now();
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    const pathname = url.pathname;

    // CORS Handling
    const origin = req.headers.origin;
    if (origin && (origin === config.corsOrigin || config.nodeEnv !== "production")) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-CSRF-Token, X-Mutation-Id, X-Preview-Role-Id"
      );
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      // Security Invariant: Role preview mode is strictly read-only.
      // Any state-changing operation (POST/PUT/PATCH/DELETE) bearing X-Preview-Role-Id
      // is immediately rejected unless it is an explicitly contract-allowed non-mutating operation.
      const previewRoleId = req.headers["x-preview-role-id"];
      if (previewRoleId && req.method && !["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        // Only contract-defined read-only POST operations are permitted during preview
        // Note: role-preview endpoint itself rejects nested preview requests
        throw createForbiddenError(
          "Mutating requests are forbidden while role preview simulation is active.",
          "PREVIEW_MODE_READ_ONLY"
        );
      }

      // 1. Health routes (/health/live, /health/ready)
      if (await handleHealthRoutes(req, res, pathname)) {
        logRequest(req.method, pathname, res.statusCode, startTime);
        return;
      }

      // 2. Roles and Role-Preview routes
      if (await handleRoleRoutes(req, res, pathname)) {
        logRequest(req.method, pathname, res.statusCode, startTime);
        return;
      }

      // 3. Fallthrough 404 Not Found
      const notFoundError = createNotFoundError(
        `Route ${req.method} ${pathname} not found.`,
        "RESOURCE_NOT_FOUND"
      );
      sendProblemResponse(res, notFoundError, pathname);
      logRequest(req.method, pathname, res.statusCode, startTime);
    } catch (err) {
      sendProblemResponse(res, err, pathname);
      logRequest(req.method, pathname, res.statusCode, startTime);
    }
  });

  return server;
}

function logRequest(
  method: string | undefined,
  pathname: string,
  statusCode: number,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  // Redact any query params or secrets from console logs
  console.log(`[HTTP] ${method ?? "UNKNOWN"} ${pathname} -> ${statusCode} (${duration}ms)`);
}

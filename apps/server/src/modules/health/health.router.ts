import type { IncomingMessage, ServerResponse } from "node:http";
import { checkDatabaseReadiness } from "../../db/pool.js";
import { createServiceUnavailableError, sendProblemResponse } from "../../errors/problem-details.js";

export async function handleHealthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  if (req.method !== "GET") {
    return false;
  }

  // 1. Process Liveness Probe
  // Unauthenticated, tenant-neutral. Return 200 {status: "UP"} when process event loop is responsive.
  // Never query PostgreSQL or external dependencies here.
  if (pathname === "/health/live") {
    const body = JSON.stringify({ status: "UP" });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
      "Cache-Control": "no-store",
    });
    res.end(body);
    return true;
  }

  // 2. Service Readiness Probe
  // Unauthenticated, tenant-neutral. Execute SELECT 1 against PostgreSQL with 2-second timeout.
  // Returns 200 {status: "UP"} only when DB is responsive; otherwise returns generic 503 Problem Details with Retry-After.
  // Deliberately omits dependency names, connection details, and internal diagnostics.
  if (pathname === "/health/ready") {
    const isReady = await checkDatabaseReadiness();
    if (isReady) {
      const body = JSON.stringify({ status: "UP" });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "no-store",
      });
      res.end(body);
    } else {
      const error = createServiceUnavailableError(
        "Service readiness dependencies are currently unavailable."
      );
      sendProblemResponse(res, error, pathname, {
        "Retry-After": "5",
      });
    }
    return true;
  }

  return false;
}

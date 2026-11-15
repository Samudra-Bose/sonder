import type { IncomingMessage, ServerResponse } from "node:http";
import {
  resolveSecurityContext,
  assertWorkspaceCapability,
} from "../../auth/security-context.js";
import { rolesService } from "./roles.service.js";
import {
  createBadRequestError,
  createUnprocessableError,
  createForbiddenError,
  sendProblemResponse,
} from "../../errors/problem-details.js";

function parseJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        // 1MB limit
        reject(createBadRequestError("Payload too large."));
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(createBadRequestError("Malformed JSON request body."));
      }
    });
    req.on("error", (err) => reject(err));
  });
}

export async function handleRoleRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<boolean> {
  // Pattern 1: GET /api/v1/communities/:communityId/workspaces/:workspaceId/roles
  const rolesMatch = pathname.match(
    /^\/api\/v1\/communities\/([^/]+)\/workspaces\/([^/]+)\/roles\/?$/
  );
  if (rolesMatch && req.method === "GET") {
    const communityId = rolesMatch[1]!;
    const workspaceId = rolesMatch[2]!;

    try {
      const securityContext = await resolveSecurityContext(req, communityId, workspaceId);
      assertWorkspaceCapability(securityContext, "workspace:read_metadata");

      const items = await rolesService.listRoles(communityId, workspaceId);
      const responsePayload = { items };
      const body = JSON.stringify(responsePayload);

      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Cache-Control": "private, no-store",
      });
      res.end(body);
      return true;
    } catch (err) {
      sendProblemResponse(res, err, pathname);
      return true;
    }
  }

  // Pattern 2: POST /api/v1/communities/:communityId/workspaces/:workspaceId/role-preview
  const previewMatch = pathname.match(
    /^\/api\/v1\/communities\/([^/]+)\/workspaces\/([^/]+)\/role-preview\/?$/
  );
  if (previewMatch && req.method === "POST") {
    const communityId = previewMatch[1]!;
    const workspaceId = previewMatch[2]!;

    try {
      // 1. Invariant: Preview mode requests cannot themselves be executed inside preview mode
      const activePreviewHeader = req.headers["x-preview-role-id"];
      if (activePreviewHeader) {
        throw createForbiddenError(
          "Role preview simulation cannot be invoked while another preview simulation is active.",
          "PREVIEW_MODE_READ_ONLY"
        );
      }

      // 2. CSRF Token verification for POST requests
      const csrfToken = req.headers["x-csrf-token"];
      if (!csrfToken || typeof csrfToken !== "string" || !csrfToken.trim()) {
        throw createBadRequestError(
          "Missing or invalid X-CSRF-Token header.",
          "CSRF_TOKEN_INVALID"
        );
      }

      // 3. Authenticate and verify caller holds workspace:administer_roles
      const securityContext = await resolveSecurityContext(req, communityId, workspaceId);
      assertWorkspaceCapability(securityContext, "workspace:administer_roles");

      // 4. Parse request body: { roleId: Uuid }
      const body = await parseJsonBody<{ roleId?: string }>(req);
      if (!body.roleId || typeof body.roleId !== "string" || !body.roleId.trim()) {
        throw createUnprocessableError(
          "Invalid request payload: 'roleId' is required.",
          [{ name: "roleId", reason: "roleId must be a valid non-empty string" }]
        );
      }

      // 5. Compute downward-only intersection
      const callerCapabilities = securityContext.workspaceMembership?.capabilities ?? [];
      const previewResult = await rolesService.previewRole(
        callerCapabilities,
        body.roleId.trim(),
        communityId,
        workspaceId
      );

      const responseBody = JSON.stringify(previewResult);
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(responseBody),
        "Cache-Control": "private, no-store",
      });
      res.end(responseBody);
      return true;
    } catch (err) {
      sendProblemResponse(res, err, pathname);
      return true;
    }
  }

  return false;
}

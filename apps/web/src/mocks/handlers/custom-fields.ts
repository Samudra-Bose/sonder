import { http, HttpResponse, delay } from "msw";
import type { ApiSchema } from "@sonder/contracts";
import { generateUuidV7 } from "@/lib/uuid";
import {
  getMockCustomFields,
  resetCustomFieldsMockState,
  type CustomFieldDefinitionDto,
  type CustomFieldOptionDto,
} from "../data/custom-fields.js";
import { mockWorkspacesByCommunityId, mockWorkspacesCommunity1 } from "../data/workspaces.js";

let customFieldsDelayMs = 0;
let customFieldsErrorOverride: {
  status: number;
  problem: ApiSchema<"Problem">;
  method?: string;
} | null = null;

export function setMockCustomFieldsDelay(ms: number): void {
  customFieldsDelayMs = ms;
}

export function setMockCustomFieldsError(
  error: { status: number; problem: ApiSchema<"Problem">; method?: string } | null
): void {
  customFieldsErrorOverride = error;
}

export { resetCustomFieldsMockState };

function isWorkspaceOwner(communityId: string, workspaceId: string): boolean {
  const workspaces = mockWorkspacesByCommunityId[communityId] || mockWorkspacesCommunity1;
  const ws = workspaces.find((w) => w.id === workspaceId);
  return ws?.myRole === "OWNER";
}

export const customFieldHandlers = [
  // 1. GET /api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields
  http.get(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields",
    async ({ params }) => {
      if (customFieldsDelayMs > 0) {
        await delay(customFieldsDelayMs);
      }

      if (customFieldsErrorOverride && (!customFieldsErrorOverride.method || customFieldsErrorOverride.method === "GET")) {
        return HttpResponse.json(customFieldsErrorOverride.problem, {
          status: customFieldsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { workspaceId } = params as { workspaceId: string; communityId: string };
      const fields = getMockCustomFields(workspaceId);

      return HttpResponse.json(
        { items: fields },
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "private, no-store",
          },
        }
      );
    }
  ),

  // 2. POST /api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields",
    async ({ params, request }) => {
      if (customFieldsDelayMs > 0) {
        await delay(customFieldsDelayMs);
      }

      if (customFieldsErrorOverride && (!customFieldsErrorOverride.method || customFieldsErrorOverride.method === "POST")) {
        return HttpResponse.json(customFieldsErrorOverride.problem, {
          status: customFieldsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { communityId, workspaceId } = params as {
        communityId: string;
        workspaceId: string;
      };

      const csrfToken = request.headers.get("X-CSRF-Token");
      if (!csrfToken || !csrfToken.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/csrf-error",
            title: "CSRF Token Required",
            status: 400,
            detail: "A valid CSRF synchronizer token is required for custom field creation.",
            code: "CSRF_TOKEN_REQUIRED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Capability Check: workspace:manage_custom_fields
      if (!isWorkspaceOwner(communityId, workspaceId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks workspace:manage_custom_fields capability.",
            code: "INSUFFICIENT_CAPABILITY",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/bad-request",
            title: "Bad Request",
            status: 400,
            detail: "Malformed JSON payload.",
            code: "INVALID_JSON",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const { name, fieldType, isRequired, options, description, displayOrder } = body;

      if (!name || typeof name !== "string" || !name.trim() || name.length > 100) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Custom field name is required and must be between 1 and 100 characters.",
            code: "CUSTOM_FIELD_VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const validTypes = ["TEXT", "NUMBER", "DATE", "BOOLEAN", "SINGLE_SELECT"];
      if (!validTypes.includes(fieldType)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: `Invalid fieldType. Supported types: ${validTypes.join(", ")}.`,
            code: "CUSTOM_FIELD_VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (fieldType === "SINGLE_SELECT") {
        if (!options || !Array.isArray(options) || options.length === 0) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/validation-error",
              title: "Validation Error",
              status: 422,
              detail: "SINGLE_SELECT field requires at least 1 option.",
              code: "CUSTOM_FIELD_VALIDATION_FAILED",
            },
            { status: 422, headers: { "Content-Type": "application/problem+json" } }
          );
        }
      } else if (options && options.length > 0) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 422,
            detail: "Options are only allowed for SINGLE_SELECT fieldType.",
            code: "CUSTOM_FIELD_OPTIONS_NOT_ALLOWED",
          },
          { status: 422, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const fields = getMockCustomFields(workspaceId);

      // Check name uniqueness in workspace case-insensitively
      const nameConflict = fields.some(
        (f) => !f.isArchived && f.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (nameConflict) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/conflict",
            title: "Conflict",
            status: 409,
            detail: `A custom field named '${name.trim()}' already exists in this workspace.`,
            code: "CUSTOM_FIELD_NAME_CONFLICT",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const generatedFieldKey = `cf_${name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 40)}`;

      const formattedOptions: CustomFieldOptionDto[] =
        fieldType === "SINGLE_SELECT"
          ? options.map((opt: { label: string }, idx: number) => ({
              id: generateUuidV7(),
              label: opt.label.trim(),
              displayOrder: idx + 1,
              isArchived: false,
            }))
          : [];

      const newField: CustomFieldDefinitionDto = {
        id: generateUuidV7(),
        name: name.trim(),
        fieldType,
        isRequired: Boolean(isRequired),
        isArchived: false,
        options: formattedOptions,
        fieldKey: generatedFieldKey,
        version: 1,
        displayOrder: displayOrder ?? fields.length + 1,
        description: description?.trim() || null,
      };

      fields.push(newField);

      return HttpResponse.json(newField, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": "1",
        },
      });
    }
  ),

  // 3. PATCH /api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId
  http.patch(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId",
    async ({ params, request }) => {
      if (customFieldsDelayMs > 0) {
        await delay(customFieldsDelayMs);
      }

      if (customFieldsErrorOverride && (!customFieldsErrorOverride.method || customFieldsErrorOverride.method === "PATCH")) {
        return HttpResponse.json(customFieldsErrorOverride.problem, {
          status: customFieldsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { communityId, workspaceId, fieldId } = params as {
        communityId: string;
        workspaceId: string;
        fieldId: string;
      };

      if (!isWorkspaceOwner(communityId, workspaceId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks workspace:manage_custom_fields capability.",
            code: "INSUFFICIENT_CAPABILITY",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const fields = getMockCustomFields(workspaceId);
      const field = fields.find((f) => f.id === fieldId);
      if (!field) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Not Found",
            status: 404,
            detail: "Custom field definition not found.",
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      let body: any;
      try {
        body = await request.json();
      } catch {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/bad-request",
            title: "Bad Request",
            status: 400,
            detail: "Malformed JSON payload.",
            code: "INVALID_JSON",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      // Check baseVersion for optimistic concurrency
      if (body.baseVersion !== undefined && body.baseVersion !== field.version) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/conflict",
            title: "Version Conflict",
            status: 409,
            detail: `Stale custom-field schema version (expected ${field.version}, got ${body.baseVersion}).`,
            code: "CUSTOM_FIELD_VERSION_CONFLICT",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (body.name !== undefined) {
        if (!body.name.trim() || body.name.length > 100) {
          return HttpResponse.json(
            {
              type: "https://errors.sonder.platform/validation-error",
              title: "Validation Error",
              status: 400,
              detail: "Name must be between 1 and 100 characters.",
              code: "CUSTOM_FIELD_VALIDATION_FAILED",
            },
            { status: 400, headers: { "Content-Type": "application/problem+json" } }
          );
        }
        field.name = body.name.trim();
      }

      if (body.description !== undefined) {
        field.description = body.description ? body.description.trim() : null;
      }

      if (body.isRequired !== undefined) {
        field.isRequired = Boolean(body.isRequired);
      }

      if (body.displayOrder !== undefined) {
        field.displayOrder = body.displayOrder;
      }

      field.version += 1;

      return HttpResponse.json(field, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(field.version),
        },
      });
    }
  ),

  // 4. DELETE /api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId
  http.delete(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId",
    async ({ params, request }) => {
      if (customFieldsDelayMs > 0) {
        await delay(customFieldsDelayMs);
      }

      if (customFieldsErrorOverride && (!customFieldsErrorOverride.method || customFieldsErrorOverride.method === "DELETE")) {
        return HttpResponse.json(customFieldsErrorOverride.problem, {
          status: customFieldsErrorOverride.status,
          headers: { "Content-Type": "application/problem+json" },
        });
      }

      const { communityId, workspaceId, fieldId } = params as {
        communityId: string;
        workspaceId: string;
        fieldId: string;
      };

      if (!isWorkspaceOwner(communityId, workspaceId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks workspace:manage_custom_fields capability.",
            code: "INSUFFICIENT_CAPABILITY",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const url = new URL(request.url);
      const baseVersionParam = url.searchParams.get("baseVersion");
      const baseVersion = baseVersionParam ? parseInt(baseVersionParam, 10) : undefined;

      const fields = getMockCustomFields(workspaceId);
      const field = fields.find((f) => f.id === fieldId);
      if (!field) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Not Found",
            status: 404,
            detail: "Custom field definition not found.",
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      if (baseVersion !== undefined && baseVersion !== field.version) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/conflict",
            title: "Version Conflict",
            status: 409,
            detail: `Stale version (expected ${field.version}, got ${baseVersion}).`,
            code: "CUSTOM_FIELD_VERSION_CONFLICT",
          },
          { status: 409, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      field.isArchived = true;
      field.version += 1;

      return new HttpResponse(null, {
        status: 204,
        headers: {
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(field.version),
        },
      });
    }
  ),

  // 5. POST /api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId/options
  http.post(
    "/api/v1/communities/:communityId/workspaces/:workspaceId/custom-fields/:fieldId/options",
    async ({ params, request }) => {
      const { communityId, workspaceId, fieldId } = params as {
        communityId: string;
        workspaceId: string;
        fieldId: string;
      };

      if (!isWorkspaceOwner(communityId, workspaceId)) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Caller lacks workspace:manage_custom_fields capability.",
            code: "INSUFFICIENT_CAPABILITY",
          },
          { status: 403, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const fields = getMockCustomFields(workspaceId);
      const field = fields.find((f) => f.id === fieldId);
      if (!field || field.fieldType !== "SINGLE_SELECT") {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/not-found",
            title: "Not Found",
            status: 404,
            detail: "SINGLE_SELECT custom field definition not found.",
            code: "RESOURCE_NOT_FOUND",
          },
          { status: 404, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const body = (await request.json()) as { label: string };
      if (!body?.label?.trim()) {
        return HttpResponse.json(
          {
            type: "https://errors.sonder.platform/validation-error",
            title: "Validation Error",
            status: 400,
            detail: "Option label is required.",
            code: "CUSTOM_FIELD_VALIDATION_FAILED",
          },
          { status: 400, headers: { "Content-Type": "application/problem+json" } }
        );
      }

      const newOption: CustomFieldOptionDto = {
        id: generateUuidV7(),
        label: body.label.trim(),
        sortOrder: field.options.length + 1,
        isArchived: false,
      };

      field.options.push(newOption);
      field.version += 1;

      return HttpResponse.json(field, {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "private, no-store",
          "X-Workspace-Seq": String(field.version),
        },
      });
    }
  ),
];

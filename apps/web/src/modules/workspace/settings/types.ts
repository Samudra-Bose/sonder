import type { ApiSchema } from "@sonder/contracts";

export type CustomFieldType = ApiSchema<"CustomFieldType">;
export type CustomFieldDefinitionDto = ApiSchema<"CustomFieldDefinitionDto">;
export type CustomFieldDefinitionListDto = ApiSchema<"CustomFieldDefinitionListDto">;
export type CustomFieldOptionDto = ApiSchema<"CustomFieldOptionDto">;
export type CreateCustomFieldDefinitionRequest = ApiSchema<"CreateCustomFieldDefinitionRequest">;
export type UpdateCustomFieldDefinitionRequest = ApiSchema<"UpdateCustomFieldDefinitionRequest">;

export type WorkspaceMemberDto = ApiSchema<"WorkspaceMemberDto">;
export type WorkspaceMemberListDto = ApiSchema<"WorkspaceMemberListDto">;
export type WorkspaceRoleDto = ApiSchema<"WorkspaceRoleDto">;
export type WorkspaceRoleListDto = ApiSchema<"WorkspaceRoleListDto">;
export type RoleCapability = ApiSchema<"RoleCapability">;
export type UpdateWorkspaceSettingsRequest = ApiSchema<"UpdateWorkspaceSettingsRequest">;

export type AuditEventDto = ApiSchema<"AuditEventDto">;
export type AuditEventPageDto = ApiSchema<"AuditEventPageDto">;
export type AuditEventExportRequest = ApiSchema<"AuditEventExportRequest">;
export type AuditIntegrityStatusDto = ApiSchema<"AuditIntegrityStatusDto">;
export type AuditEventType = ApiSchema<"AuditEventType">;
export type AuditEventCategory = ApiSchema<"AuditEventCategory">;
export type AuditTargetType = ApiSchema<"AuditTargetType">;

export type SettingsCategory =
  | "general"
  | "custom-fields"
  | "workflow"
  | "members"
  | "permissions"
  | "audit";

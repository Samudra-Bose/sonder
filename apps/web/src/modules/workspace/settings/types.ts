import type { ApiSchema } from "@sonder/contracts";

export type CustomFieldType = ApiSchema<"CustomFieldType">;
export type CustomFieldDefinitionDto = ApiSchema<"CustomFieldDefinitionDto">;
export type CustomFieldDefinitionListDto = ApiSchema<"CustomFieldDefinitionListDto">;
export type CustomFieldOptionDto = ApiSchema<"CustomFieldOptionDto">;
export type CreateCustomFieldDefinitionRequest = ApiSchema<"CreateCustomFieldDefinitionRequest">;
export type UpdateCustomFieldDefinitionRequest = ApiSchema<"UpdateCustomFieldDefinitionRequest">;

export type WorkspaceMemberDto = ApiSchema<"WorkspaceMemberDto">;
export type WorkspaceMemberListDto = ApiSchema<"WorkspaceMemberListDto">;
export type UpdateWorkspaceSettingsRequest = ApiSchema<"UpdateWorkspaceSettingsRequest">;

export type SettingsCategory =
  | "general"
  | "custom-fields"
  | "workflow"
  | "members"
  | "permissions";

import type { ApiSchema } from "@sonder/contracts";

export type WorkspaceRoleDto = ApiSchema<"WorkspaceRoleDto">;

export const ALL_CANONICAL_CAPABILITIES: ApiSchema<"RoleCapability">[] = [
  "task:read",
  "task:create",
  "task:edit_definition",
  "task:edit_title_description",
  "task:edit_dates_priority",
  "task:edit_custom_fields_links",
  "task:edit_estimate",
  "task:update_status",
  "task:assign",
  "task:manage_subtasks",
  "task:move",
  "task:comment",
  "task:watch",
  "task:archive",
  "task:restore",
  "task:delete_permanent",
  "task:request_signoff",
  "task:approve_signoff",
  "workspace:read_metadata",
  "workspace:invite_members",
  "workspace:manage_members",
  "workspace:administer_roles",
  "workspace:update_settings",
  "workspace:transfer_ownership",
  "workspace:archive",
  "workspace:restore",
  "workspace:configure_workflow",
  "saved_view:manage_shared",
  "audit:read",
  "audit:export",
  "workspace:manage_custom_fields",
];

export const mockOwnerRole: WorkspaceRoleDto = {
  id: "018f98a2-3f12-7890-role-owner-001",
  systemKey: "OWNER",
  name: "Workspace Owner",
  description: "Full administrative, role management, workflow, and data management authority.",
  capabilities: [...ALL_CANONICAL_CAPABILITIES],
  isBuiltIn: true,
};

export const mockCoordinatorRole: WorkspaceRoleDto = {
  id: "018f98a2-3f12-7890-role-coord-002",
  systemKey: "COORDINATOR",
  name: "Coordinator",
  description: "Member invitation, team execution oversight, triage, and task lifecycle management.",
  capabilities: [
    "task:read",
    "task:create",
    "task:edit_definition",
    "task:edit_title_description",
    "task:edit_dates_priority",
    "task:edit_custom_fields_links",
    "task:edit_estimate",
    "task:update_status",
    "task:assign",
    "task:manage_subtasks",
    "task:move",
    "task:comment",
    "task:watch",
    "task:archive",
    "task:restore",
    "task:request_signoff",
    "task:approve_signoff",
    "workspace:read_metadata",
    "workspace:invite_members",
    "saved_view:manage_shared",
    "audit:read",
  ],
  isBuiltIn: true,
};

export const mockMemberRole: WorkspaceRoleDto = {
  id: "018f98a2-3f12-7890-role-member-003",
  systemKey: "MEMBER",
  name: "Member",
  description: "Create and update tasks, log progress, edit custom fields, and collaborate with comments.",
  capabilities: [
    "task:read",
    "task:create",
    "task:edit_title_description",
    "task:edit_dates_priority",
    "task:edit_custom_fields_links",
    "task:edit_estimate",
    "task:update_status",
    "task:comment",
    "task:watch",
    "task:request_signoff",
    "workspace:read_metadata",
  ],
  isBuiltIn: true,
};

export const mockViewerRole: WorkspaceRoleDto = {
  id: "018f98a2-3f12-7890-role-viewer-004",
  systemKey: "VIEWER",
  name: "Viewer",
  description: "Read-only access to view tasks, comments, and export reports.",
  capabilities: [
    "task:read",
    "task:watch",
    "workspace:read_metadata",
  ],
  isBuiltIn: true,
};

export const mockCustomTriageRole: WorkspaceRoleDto = {
  id: "018f98a2-3f12-7890-role-custom-005",
  systemKey: null,
  name: "Triage Specialist",
  description: "Specialized triage role with status transitions, subtask management, and priority tagging.",
  capabilities: [
    "task:read",
    "task:create",
    "task:edit_dates_priority",
    "task:update_status",
    "task:manage_subtasks",
    "task:comment",
    "task:watch",
    "workspace:read_metadata",
  ],
  isBuiltIn: false,
};

export const initialMockWorkspaceRoles: WorkspaceRoleDto[] = [
  mockOwnerRole,
  mockCoordinatorRole,
  mockMemberRole,
  mockViewerRole,
  mockCustomTriageRole,
];

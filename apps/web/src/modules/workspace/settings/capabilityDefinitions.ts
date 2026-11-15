import type { WorkspaceDto } from "@/modules/workspace/types.js";
import type { WorkspaceRoleDto, RoleCapability } from "./types.js";

export type CapabilityCategory = "TASKS" | "ADMINISTRATION" | "COLLABORATION";

export interface CapabilityDefinition {
  code: RoleCapability;
  name: string;
  category: CapabilityCategory;
  description: string;
  ownerOnly?: boolean;
}

export interface CapabilityEvaluation {
  code: RoleCapability;
  name: string;
  category: CapabilityCategory;
  description: string;
  granted: boolean;
  rationale: string;
  modifiers: string[];
}

export const CAPABILITY_DEFINITIONS: CapabilityDefinition[] = [
  // 1. Tasks & Hierarchy
  {
    code: "task:read",
    name: "View Tasks & Details",
    category: "TASKS",
    description: "Read task titles, descriptions, assignees, dates, subtasks, and comments across all workspace views.",
  },
  {
    code: "task:create",
    name: "Create Tasks",
    category: "TASKS",
    description: "Create new top-level tasks and assign sequential workspace keys.",
  },
  {
    code: "task:edit_definition",
    name: "Edit Task Definition",
    category: "TASKS",
    description: "Modify core task attributes, archetypes, and immutable configuration.",
  },
  {
    code: "task:edit_title_description",
    name: "Edit Title & Description",
    category: "TASKS",
    description: "Update the task title and markdown description body.",
  },
  {
    code: "task:edit_dates_priority",
    name: "Edit Dates & Priority",
    category: "TASKS",
    description: "Change start date, due date, and priority level (URGENT, HIGH, MEDIUM, LOW, NONE).",
  },
  {
    code: "task:edit_custom_fields_links",
    name: "Edit Custom Fields & Links",
    category: "TASKS",
    description: "Modify custom field values and task relationship dependencies (blocks, relates to).",
  },
  {
    code: "task:edit_estimate",
    name: "Edit Complexity Estimate",
    category: "TASKS",
    description: "Set story points or estimated effort on tasks.",
  },
  {
    code: "task:update_status",
    name: "Update Task Status",
    category: "TASKS",
    description: "Transition tasks between status categories (Backlog, Todo, In Progress, Done, Canceled).",
  },
  {
    code: "task:assign",
    name: "Assign Team Members",
    category: "TASKS",
    description: "Add or remove task assignees across active workspace members.",
  },
  {
    code: "task:manage_subtasks",
    name: "Manage Subtasks & Hierarchy",
    category: "TASKS",
    description: "Add, convert, reorder, and indent subtasks within the workspace maximum depth limit.",
  },
  {
    code: "task:move",
    name: "Move Tasks",
    category: "TASKS",
    description: "Move tasks between milestones or projects within the community.",
  },
  {
    code: "task:archive",
    name: "Soft-Delete (Archive) Tasks",
    category: "TASKS",
    description: "Move tasks to the 30-day workspace trash with recovery option.",
  },
  {
    code: "task:restore",
    name: "Restore Archived Tasks",
    category: "TASKS",
    description: "Recover previously soft-deleted tasks from the 30-day workspace trash.",
  },
  {
    code: "task:delete_permanent",
    name: "Permanent Task Purge",
    category: "TASKS",
    description: "Permanently delete tasks and erase historical tombstones. Strictly restricted to Owner.",
    ownerOnly: true,
  },
  {
    code: "task:request_signoff",
    name: "Request Task Signoff",
    category: "TASKS",
    description: "Submit a milestone or task for formal approval signoff.",
  },
  {
    code: "task:approve_signoff",
    name: "Approve Task Signoff",
    category: "TASKS",
    description: "Grant formal milestone or task signoff approval.",
  },

  // 2. Collaboration & Views
  {
    code: "task:comment",
    name: "Post Comments & Mentions",
    category: "COLLABORATION",
    description: "Add discussion comments and mention teammates using @mentions.",
  },
  {
    code: "task:watch",
    name: "Subscribe / Watch Tasks",
    category: "COLLABORATION",
    description: "Receive notification alerts on activity, status changes, and mentions.",
  },
  {
    code: "saved_view:manage_shared",
    name: "Manage Shared Saved Views",
    category: "COLLABORATION",
    description: "Create, reorder, and update saved views visible to all workspace members.",
  },
  {
    code: "audit:read",
    name: "View Audit Log Trail",
    category: "COLLABORATION",
    description: "Inspect immutable, append-only security and activity audit records.",
  },
  {
    code: "audit:export",
    name: "Export Audit Log to CSV",
    category: "COLLABORATION",
    description: "Export the full cryptographic audit log hash chain to CSV.",
  },

  // 3. Workspace Administration
  {
    code: "workspace:read_metadata",
    name: "View Workspace Metadata",
    category: "ADMINISTRATION",
    description: "Access workspace name, prefix, members count, and public settings.",
  },
  {
    code: "workspace:invite_members",
    name: "Invite Workspace Members",
    category: "ADMINISTRATION",
    description: "Invite active community members to collaborate in this workspace.",
  },
  {
    code: "workspace:manage_members",
    name: "Manage Workspace Members",
    category: "ADMINISTRATION",
    description: "Assign member roles or remove members from the workspace.",
    ownerOnly: true,
  },
  {
    code: "workspace:administer_roles",
    name: "Administer Custom Roles",
    category: "ADMINISTRATION",
    description: "Create, configure, and modify custom capability roles.",
    ownerOnly: true,
  },
  {
    code: "workspace:update_settings",
    name: "Update Workspace Settings",
    category: "ADMINISTRATION",
    description: "Modify workspace name, key prefix, subtask depth limit, and policies.",
    ownerOnly: true,
  },
  {
    code: "workspace:transfer_ownership",
    name: "Transfer Workspace Ownership",
    category: "ADMINISTRATION",
    description: "Transfer primary ownership to another eligible workspace member.",
    ownerOnly: true,
  },
  {
    code: "workspace:archive",
    name: "Archive Workspace",
    category: "ADMINISTRATION",
    description: "Archive the entire workspace, making all views read-only.",
    ownerOnly: true,
  },
  {
    code: "workspace:restore",
    name: "Restore Archived Workspace",
    category: "ADMINISTRATION",
    description: "Reactivate a previously archived workspace.",
    ownerOnly: true,
  },
  {
    code: "workspace:configure_workflow",
    name: "Configure Workflow Spine",
    category: "ADMINISTRATION",
    description: "Customize status transitions and workflow rules.",
    ownerOnly: true,
  },
  {
    code: "workspace:manage_custom_fields",
    name: "Manage Custom Field Definitions",
    category: "ADMINISTRATION",
    description: "Create, modify, order, and archive custom field definitions (FEAT-D04a).",
  },
];

/**
 * Evaluates a single capability against a given role, workspace context, and policy constraints.
 * Generates an authoritative plain-language explanation and surfaces relevant contextual modifiers.
 */
export function evaluateCapability(
  def: CapabilityDefinition,
  role: WorkspaceRoleDto | null | undefined,
  workspace: WorkspaceDto | null | undefined
): CapabilityEvaluation {
  const modifiers: string[] = [];
  const isPersonal = workspace?.kind === "PERSONAL";
  const taskPolicy = workspace?.taskEditPolicy ?? "CREATOR_COORDINATOR_STRICT";
  const coordinatorCanInvite = Boolean(workspace?.coordinatorCanInviteMembers);

  // If no role is selected or context is missing, fail closed safely
  if (!role) {
    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: false,
      rationale: "Denied: No active role context selected (fails closed).",
      modifiers: [],
    };
  }

  const roleKey = role.systemKey ?? "CUSTOM";
  const hasCapInList = role.capabilities.includes(def.code);

  // 1. Universal enforcement: If the capability is not in effective capabilities, fail closed
  if (!hasCapInList) {
    let rationale = `Denied: Role '${role.name}' does not possess '${def.code}'.`;
    if (def.ownerOnly) {
      rationale = `Denied: '${def.name}' is strictly reserved to the active Workspace Owner and cannot be delegated or simulated for other roles.`;
    } else if (roleKey === "MEMBER") {
      rationale = `Denied: Member role does not possess '${def.code}'. Requires Coordinator or Owner role.`;
    } else if (roleKey === "VIEWER") {
      rationale = "Denied: Viewer role is strictly read-only and cannot mutate workspace or task state.";
    } else if (roleKey === "OWNER") {
      rationale = `Denied: Capability '${def.code}' is not held by your active role. Role preview cannot grant capabilities exceeding your active permissions.`;
    }

    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: false,
      rationale,
      modifiers,
    };
  }

  // 2. OWNER-specific handling
  if (roleKey === "OWNER") {
    let rationale = "Granted: Built-in Workspace Owner role possesses full authoritative capability across all operations.";

    if (def.code === "workspace:invite_members" && isPersonal) {
      modifiers.push("Personal Workspace: Invitations restricted under audited break-glass policy.");
    }
    if (def.code === "task:manage_subtasks") {
      modifiers.push(`Workspace Max Depth: Level ${workspace?.maxSubtaskDepth ?? 1}.`);
    }

    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: true,
      rationale,
      modifiers,
    };
  }

  // 3. Strict Owner-only capabilities (never grantable to non-owners)
  if (def.ownerOnly) {
    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: false,
      rationale: `Denied: '${def.name}' is strictly reserved to the active Workspace Owner and cannot be delegated or simulated for other roles.`,
      modifiers,
    };
  }

  // 4. Coordinator-specific contextual rules
  if (roleKey === "COORDINATOR") {
    if (def.code === "workspace:invite_members") {
      if (coordinatorCanInvite && !isPersonal) {
        modifiers.push("Policy active: Coordinator invitation permitted by workspace settings.");
        return {
          code: def.code,
          name: def.name,
          category: def.category,
          description: def.description,
          granted: true,
          rationale: "Granted: Coordinator is permitted to invite Member and Viewer roles.",
          modifiers,
        };
      } else {
        const reason = isPersonal
          ? "Denied: Personal workspaces do not permit coordinator member invitations."
          : "Denied: Workspace settings currently disable coordinator invitations (Owner-only).";
        modifiers.push("Setting disabled: coordinatorCanInviteMembers is false.");
        return {
          code: def.code,
          name: def.name,
          category: def.category,
          description: def.description,
          granted: false,
          rationale: reason,
          modifiers,
        };
      }
    }

    if (def.code === "task:manage_subtasks") {
      modifiers.push(`Workspace Max Depth: Level ${workspace?.maxSubtaskDepth ?? 1}.`);
    }

    if (hasCapInList) {
      return {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        granted: true,
        rationale: "Granted: Canonical capability included in the Coordinator role.",
        modifiers,
      };
    }
  }

  // 4. Member-specific contextual rules
  if (roleKey === "MEMBER") {
    if (["task:edit_title_description", "task:edit_dates_priority", "task:edit_custom_fields_links"].includes(def.code)) {
      if (taskPolicy === "COLLABORATIVE_MEMBER") {
        modifiers.push("Collaborative Member Policy: Any workspace member can update permitted task fields.");
      } else {
        modifiers.push("Strict Policy: Limited to tasks created by or assigned to this member.");
      }
    }

    if (hasCapInList) {
      return {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        granted: true,
        rationale: "Granted: Standard execution capability for workspace Members.",
        modifiers,
      };
    } else {
      return {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        granted: false,
        rationale: `Denied: Member role does not possess '${def.code}'. Requires Coordinator or Owner role.`,
        modifiers,
      };
    }
  }

  // 5. Viewer-specific handling
  if (roleKey === "VIEWER") {
    if (hasCapInList) {
      return {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        granted: true,
        rationale: "Granted: Viewer possesses read-only access for this operation.",
        modifiers,
      };
    } else {
      return {
        code: def.code,
        name: def.name,
        category: def.category,
        description: def.description,
        granted: false,
        rationale: "Denied: Viewer role is strictly read-only and cannot mutate workspace or task state.",
        modifiers,
      };
    }
  }

  // 6. Custom Roles handling
  if (hasCapInList) {
    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: true,
      rationale: `Granted: Explicitly granted in custom role '${role.name}'.`,
      modifiers,
    };
  } else {
    return {
      code: def.code,
      name: def.name,
      category: def.category,
      description: def.description,
      granted: false,
      rationale: `Denied: Capability '${def.code}' is not included in the custom role definition for '${role.name}'.`,
      modifiers,
    };
  }
}

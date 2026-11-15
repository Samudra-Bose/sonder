import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Info,
  Layers,
} from "lucide-react";
import type { WorkspaceDto } from "@/modules/workspace/types.js";
import { useWorkspaceRoles } from "./useWorkspaceSettings.js";
import type { WorkspaceRoleDto } from "./types.js";
import {
  CAPABILITY_DEFINITIONS,
  evaluateCapability,
  type CapabilityCategory,
  type CapabilityEvaluation,
} from "./capabilityDefinitions.js";
import {
  mockOwnerRole,
  mockCoordinatorRole,
  mockMemberRole,
  mockViewerRole,
} from "@/mocks/data/roles.js";
import { computeEffectiveCapabilities } from "@/lib/authorization.js";

export interface PermissionInspectorProps {
  workspace: WorkspaceDto | null | undefined;
  communityId?: string | null;
  workspaceId?: string | null;
}

export const PermissionInspector: React.FC<PermissionInspectorProps> = ({
  workspace,
  communityId,
  workspaceId,
}) => {
  const { data: rolesData, isLoading: rolesLoading } = useWorkspaceRoles(communityId, workspaceId);

  // Available roles: merge server/mock roles with standard canonical built-ins
  const allRoles: WorkspaceRoleDto[] = useMemo(() => {
    const fetched = rolesData?.items ?? [];
    if (fetched.length > 0) return fetched;
    return [mockOwnerRole, mockCoordinatorRole, mockMemberRole, mockViewerRole];
  }, [rolesData]);

  // Actual current role derived from workspace
  const actualRole = useMemo<WorkspaceRoleDto>(() => {
    const currentKey = workspace?.myRole ?? "OWNER";
    const found = allRoles.find((r) => r.systemKey === currentKey);
    if (found) return found;
    // Default fallback to OWNER if myRole matches or fallback role
    if (currentKey === "COORDINATOR") return mockCoordinatorRole;
    if (currentKey === "MEMBER") return mockMemberRole;
    if (currentKey === "VIEWER") return mockViewerRole;
    return mockOwnerRole;
  }, [allRoles, workspace?.myRole]);

  // Simulation state
  const [simulatedRoleId, setSimulatedRoleId] = useState<string | null>(null);

  // Active role being evaluated (either simulated or actual)
  const activeEvaluatedRole = useMemo<WorkspaceRoleDto>(() => {
    if (simulatedRoleId) {
      const sim = allRoles.find((r) => r.id === simulatedRoleId);
      if (sim) {
        // Enforce downward-only intersection: callerCapabilities ∩ previewRoleCapabilities
        const effectiveCaps = computeEffectiveCapabilities(
          actualRole.capabilities,
          sim.capabilities
        );
        return {
          ...sim,
          capabilities: effectiveCaps,
        };
      }
    }
    return actualRole;
  }, [simulatedRoleId, allRoles, actualRole]);

  const isSimulating = Boolean(simulatedRoleId && simulatedRoleId !== actualRole.id);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CapabilityCategory | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GRANTED" | "DENIED">("ALL");

  // Interactive Scenario Sandbox state
  const [scenarioRelation, setScenarioRelation] = useState<"CREATOR" | "ASSIGNEE" | "UNASSIGNED">("ASSIGNEE");
  const [scenarioStatus, setScenarioStatus] = useState<"ACTIVE" | "ARCHIVED">("ACTIVE");

  // Evaluate all capabilities for active role
  const evaluatedCapabilities = useMemo<CapabilityEvaluation[]>(() => {
    return CAPABILITY_DEFINITIONS.map((def) =>
      evaluateCapability(def, activeEvaluatedRole, workspace)
    );
  }, [activeEvaluatedRole, workspace]);

  // Filtered capabilities
  const filteredCapabilities = useMemo(() => {
    return evaluatedCapabilities.filter((item) => {
      // Category filter
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }

      // Status filter
      if (statusFilter === "GRANTED" && !item.granted) return false;
      if (statusFilter === "DENIED" && item.granted) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCode = item.code.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesRationale = item.rationale.toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesDesc && !matchesRationale) {
          return false;
        }
      }

      return true;
    });
  }, [evaluatedCapabilities, selectedCategory, statusFilter, searchQuery]);

  const grantedCount = evaluatedCapabilities.filter((c) => c.granted).length;
  const deniedCount = evaluatedCapabilities.length - grantedCount;

  // Scenario Sandbox evaluations
  const scenarioResults = useMemo(() => {
    const isArchived = scenarioStatus === "ARCHIVED";
    const roleKey = activeEvaluatedRole.systemKey ?? "CUSTOM";
    const taskPolicy = workspace?.taskEditPolicy ?? "CREATOR_COORDINATOR_STRICT";

    // Can edit task title/description
    let canEditTitle = false;
    let titleReason = "";
    if (isArchived) {
      canEditTitle = false;
      titleReason = "Denied: Task is in 30-day Trash (read-only until restored).";
    } else if (roleKey === "OWNER" || roleKey === "COORDINATOR") {
      canEditTitle = true;
      titleReason = "Allowed: Coordinators and Owners can edit all tasks in the workspace.";
    } else if (roleKey === "MEMBER") {
      if (taskPolicy === "COLLABORATIVE_MEMBER") {
        canEditTitle = true;
        titleReason = "Allowed: Workspace uses Collaborative Member policy.";
      } else if (scenarioRelation === "CREATOR" || scenarioRelation === "ASSIGNEE") {
        canEditTitle = true;
        titleReason = `Allowed: Member is the task ${scenarioRelation.toLowerCase()} under Strict policy.`;
      } else {
        canEditTitle = false;
        titleReason = "Denied: Under Strict policy, unassigned members cannot edit this task.";
      }
    } else {
      canEditTitle = false;
      titleReason = "Denied: Viewer role is strictly read-only.";
    }

    // Can change task status
    let canChangeStatus = false;
    let statusReason = "";
    if (isArchived) {
      canChangeStatus = false;
      statusReason = "Denied: Archived tasks cannot transition status.";
    } else if (roleKey === "OWNER" || roleKey === "COORDINATOR") {
      canChangeStatus = true;
      statusReason = "Allowed: Full status management authority.";
    } else if (roleKey === "MEMBER") {
      canChangeStatus = true;
      statusReason = "Allowed: Members can progress tasks through workflow states.";
    } else {
      canChangeStatus = false;
      statusReason = "Denied: Viewer role cannot transition status.";
    }

    // Can edit custom fields
    let canEditCustomFields = false;
    let customFieldsReason = "";
    if (isArchived) {
      canEditCustomFields = false;
      customFieldsReason = "Denied: Task is archived.";
    } else if (roleKey === "VIEWER") {
      canEditCustomFields = false;
      customFieldsReason = "Denied: Viewer cannot modify custom field values.";
    } else {
      canEditCustomFields = true;
      customFieldsReason = "Allowed: Member has task:edit_custom_fields_links capability.";
    }

    // Can add subtasks
    let canAddSubtasks = false;
    let subtasksReason = "";
    const maxDepth = workspace?.maxSubtaskDepth ?? 1;
    if (isArchived) {
      canAddSubtasks = false;
      subtasksReason = "Denied: Cannot add subtasks to archived task.";
    } else if (roleKey === "VIEWER") {
      canAddSubtasks = false;
      subtasksReason = "Denied: Viewer role cannot create subtasks.";
    } else if (roleKey === "OWNER" || roleKey === "COORDINATOR") {
      canAddSubtasks = true;
      subtasksReason = `Allowed: Up to max hierarchy depth (Level ${maxDepth}).`;
    } else {
      canAddSubtasks = true;
      subtasksReason = `Allowed: Members can add checklists/subtasks up to Level ${maxDepth}.`;
    }

    // Can permanently delete
    const canPurge = roleKey === "OWNER";
    const purgeReason = canPurge
      ? "Allowed: Active Workspace Owner has purge authority."
      : "Denied: Permanent deletion is strictly restricted to Workspace Owner.";

    return [
      { action: "Edit Title & Description", allowed: canEditTitle, reason: titleReason },
      { action: "Update Status (e.g. Backlog → Todo)", allowed: canChangeStatus, reason: statusReason },
      { action: "Edit Custom Field Values", allowed: canEditCustomFields, reason: customFieldsReason },
      { action: "Add Subtask / Checklist", allowed: canAddSubtasks, reason: subtasksReason },
      { action: "Permanent Task Purge", allowed: canPurge, reason: purgeReason },
    ];
  }, [activeEvaluatedRole, workspace, scenarioRelation, scenarioStatus]);

  return (
    <div className="space-y-6" data-testid="permission-inspector-root">
      {/* Simulation Active Banner */}
      {isSimulating && (
        <div
          data-testid="role-simulator-banner"
          className="rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-500/10 dark:bg-amber-950/40 p-4 text-foreground shadow-xs animate-in fade-in duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                    Role Simulation Active
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                    {activeEvaluatedRole.name}
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 dark:text-amber-200/90 mt-1">
                  Previewing effective permissions and capabilities as this role. Simulation is strictly read-only: live mutations are disabled and real workspace permissions are unaffected.
                </p>
              </div>
            </div>

            <button
              type="button"
              data-testid="exit-simulation-btn"
              onClick={() => setSimulatedRoleId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-200/80 hover:bg-amber-200 dark:bg-amber-900/80 dark:hover:bg-amber-900 text-amber-900 dark:text-amber-100 transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to My Role
            </button>
          </div>
        </div>
      )}

      {/* Role Simulator Controls Card */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4" data-testid="role-simulator-controls">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                Permission Inspector & Role Simulator (FEAT-G03)
              </h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select a built-in or custom role to simulate its effective permissions and plain-language governance rationale.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <label htmlFor="simulate-role-select" className="text-xs font-medium text-muted-foreground shrink-0">
              Simulate Role:
            </label>
            <select
              id="simulate-role-select"
              data-testid="simulate-role-select"
              value={simulatedRoleId ?? activeEvaluatedRole.id}
              onChange={(e) => {
                const val = e.target.value;
                if (val === actualRole.id) {
                  setSimulatedRoleId(null);
                } else {
                  setSimulatedRoleId(val);
                }
              }}
              disabled={rolesLoading}
              className="px-3 py-1.5 rounded-md border border-input bg-background text-xs font-medium text-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            >
              <optgroup label="Your Actual Role">
                <option value={actualRole.id}>
                  {actualRole.name} (My Active Role)
                </option>
              </optgroup>
              <optgroup label="Simulate Another Role">
                {allRoles
                  .filter((r) => r.id !== actualRole.id)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.isBuiltIn ? "(Built-in)" : "(Custom Role)"}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Active Role Meta Pills */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Evaluating:</span>
            <span className="font-semibold text-foreground">
              {activeEvaluatedRole.name}
            </span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {activeEvaluatedRole.systemKey ?? "CUSTOM"}
            </span>
          </div>

          <div className="h-3.5 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              {grantedCount} Granted
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-destructive/10 text-destructive border border-destructive/20">
              <XCircle className="w-3 h-3" />
              {deniedCount} Denied
            </span>
          </div>

          <div className="h-3.5 w-px bg-border" />

          <div className="text-muted-foreground">
            Task Policy: <span className="text-foreground font-medium">{workspace?.taskEditPolicy ?? "CREATOR_COORDINATOR_STRICT"}</span>
          </div>
        </div>
      </div>

      {/* Interactive Scenario Sandbox ("Test an Action in Context") */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4" data-testid="scenario-sandbox">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Contextual Action Simulator
            </h4>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Simulates contextual overrides, assignee grants, and trash protections.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-border/60 text-xs">
          <div>
            <label htmlFor="scenario-relation-select" className="block text-muted-foreground font-medium mb-1">
              Actor's Relationship to Task:
            </label>
            <select
              id="scenario-relation-select"
              data-testid="scenario-relation-select"
              value={scenarioRelation}
              onChange={(e) => setScenarioRelation(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground"
            >
              <option value="ASSIGNEE">Active Assignee</option>
              <option value="CREATOR">Original Task Creator</option>
              <option value="UNASSIGNED">Unassigned Workspace Member</option>
            </select>
          </div>

          <div>
            <label htmlFor="scenario-status-select" className="block text-muted-foreground font-medium mb-1">
              Task Lifecycle State:
            </label>
            <select
              id="scenario-status-select"
              data-testid="scenario-status-select"
              value={scenarioStatus}
              onChange={(e) => setScenarioStatus(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-foreground"
            >
              <option value="ACTIVE">Active Task (In Workspace)</option>
              <option value="ARCHIVED">Archived in 30-Day Trash</option>
            </select>
          </div>
        </div>

        {/* Live Scenario Verdicts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1" data-testid="scenario-verdicts">
          {scenarioResults.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-border bg-background flex items-start gap-2.5 text-xs"
              data-testid={`scenario-result-${idx}`}
            >
              {item.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{item.action}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      item.allowed
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {item.allowed ? "ALLOWED" : "BLOCKED"}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/30">
            <button
              type="button"
              data-testid="filter-all"
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "ALL"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({evaluatedCapabilities.length})
            </button>
            <button
              type="button"
              data-testid="filter-granted"
              onClick={() => setStatusFilter("GRANTED")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "GRANTED"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Granted ({grantedCount})
            </button>
            <button
              type="button"
              data-testid="filter-denied"
              onClick={() => setStatusFilter("DENIED")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                statusFilter === "DENIED"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Denied ({deniedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              data-testid="capability-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search capabilities (e.g. custom fields, subtask)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-muted-foreground mr-1 text-[11px] font-medium">Category:</span>
          {(
            [
              { id: "ALL", label: "All Categories" },
              { id: "TASKS", label: "Tasks & Hierarchy" },
              { id: "ADMINISTRATION", label: "Workspace Administration" },
              { id: "COLLABORATION", label: "Collaboration & Views" },
            ] as const
          ).map((cat) => (
            <button
              key={cat.id}
              type="button"
              data-testid={`category-chip-${cat.id}`}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedCategory === cat.id
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Evaluated Capabilities List */}
      <div className="space-y-2.5" data-testid="capability-list">
        {filteredCapabilities.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
            No capabilities match your search query or filter.
          </div>
        ) : (
          filteredCapabilities.map((item) => (
            <div
              key={item.code}
              data-testid={`capability-item-${item.code}`}
              className={`rounded-lg border p-4 transition-colors ${
                item.granted
                  ? "border-border bg-card hover:border-border/80"
                  : "border-border/80 bg-muted/20 opacity-90"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {item.granted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Granted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                      <XCircle className="w-3 h-3" />
                      Denied
                    </span>
                  )}
                  <h4 className="text-xs font-semibold text-foreground">
                    {item.name}
                  </h4>
                  <code className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                    {item.code}
                  </code>
                </div>

                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {item.category}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mt-1.5">
                {item.description}
              </p>

              {/* Rationale & Modifiers Box */}
              <div className="mt-2.5 pt-2.5 border-t border-border/50 text-xs space-y-1.5">
                <div className="flex items-start gap-1.5 text-foreground/90">
                  <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-xs">
                    <strong className="text-foreground font-medium">Rationale:</strong> {item.rationale}
                  </span>
                </div>

                {item.modifiers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {item.modifiers.map((mod, mi) => (
                      <span
                        key={mi}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-secondary text-secondary-foreground border border-border"
                      >
                        <Layers className="w-3 h-3" />
                        {mod}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  computeDownwardIntersection,
  BUILTIN_ROLES,
} from "../src/modules/roles/roles.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Tenant Isolation & Migration Integrity", () => {
  it("001_initial_schema.sql exists and defines all required tenant entities and RLS policies", async () => {
    const migrationPath = path.join(__dirname, "../src/db/migrations/001_initial_schema.sql");
    const sql = await fs.readFile(migrationPath, "utf-8");

    // Entity tables
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS users");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS communities");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS community_memberships");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS workspaces");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS workspace_roles");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS workspace_memberships");

    // Row-Level Security enablement
    expect(sql).toContain("ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;");
    expect(sql).toContain("ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;");

    // Tenant isolation policies via PostgreSQL session configuration
    expect(sql).toContain("current_setting('app.current_community_id', true)");
    expect(sql).toContain("current_setting('app.current_workspace_id', true)");

    // Unique constraints preventing tenant data mixing
    expect(sql).toContain("CONSTRAINT uq_community_user UNIQUE (community_id, user_id)");
    expect(sql).toContain("CONSTRAINT uq_workspace_membership UNIQUE (workspace_id, user_id)");
    expect(sql).toContain("CONSTRAINT uq_workspace_system_key UNIQUE (workspace_id, system_key)");
  });

  it("downward-only intersection strictly removes capabilities not held by caller", () => {
    const ownerRole = BUILTIN_ROLES.find((r) => r.systemKey === "OWNER")!;
    const coordRole = BUILTIN_ROLES.find((r) => r.systemKey === "COORDINATOR")!;
    const memberRole = BUILTIN_ROLES.find((r) => r.systemKey === "MEMBER")!;
    const viewerRole = BUILTIN_ROLES.find((r) => r.systemKey === "VIEWER")!;

    // Coordinator attempts to preview Owner -> cannot acquire Owner capabilities
    const coordPreviewsOwner = computeDownwardIntersection(
      coordRole.capabilities,
      ownerRole.capabilities
    );
    expect(coordPreviewsOwner).not.toContain("audit:export");
    expect(coordPreviewsOwner).not.toContain("workspace:update_settings");
    expect(coordPreviewsOwner).not.toContain("workspace:administer_roles");
    expect(coordPreviewsOwner).toEqual(coordRole.capabilities);

    // Member attempts to preview Coordinator -> cannot acquire Coordinator capabilities
    const memberPreviewsCoord = computeDownwardIntersection(
      memberRole.capabilities,
      coordRole.capabilities
    );
    expect(memberPreviewsCoord).not.toContain("audit:read");
    expect(memberPreviewsCoord).not.toContain("workspace:invite_members");
    expect(memberPreviewsCoord).toEqual(memberRole.capabilities);

    // Viewer previews Member -> retains only read-only capabilities
    const viewerPreviewsMember = computeDownwardIntersection(
      viewerRole.capabilities,
      memberRole.capabilities
    );
    expect(viewerPreviewsMember).toContain("task:read");
    expect(viewerPreviewsMember).not.toContain("task:create");
  });
});

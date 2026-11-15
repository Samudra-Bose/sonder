-- Sonder Database Initial Schema Migration
-- Version: 001_initial_schema.sql
-- Conforms to Community-Work-Management-v1.5 Domain Model & RLS Specifications

CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users (Global identity)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email_normalized VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    account_state VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Communities (Tenant boundary)
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    policy_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community Memberships
CREATE TABLE IF NOT EXISTS community_memberships (
    id UUID PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    is_community_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_default_coordinator BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_community_user UNIQUE (community_id, user_id)
);

-- Workspaces (Primary work container: PERSONAL or SHARED)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    kind VARCHAR(50) NOT NULL DEFAULT 'SHARED',
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL,
    next_task_sequence INTEGER NOT NULL DEFAULT 1,
    settings JSONB NOT NULL DEFAULT '{}',
    assignee_editable_field_groups_allowed JSONB NOT NULL DEFAULT '[]',
    assignee_editable_field_groups_default JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ NULL
);

-- Workspace Roles (Built-in and custom capability roles)
CREATE TABLE IF NOT EXISTS workspace_roles (
    id UUID PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    workspace_id UUID NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    system_key VARCHAR(50) NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]',
    is_built_in BOOLEAN NOT NULL DEFAULT FALSE,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_system_key UNIQUE (workspace_id, system_key)
);

-- Workspace Memberships
CREATE TABLE IF NOT EXISTS workspace_memberships (
    id UUID PRIMARY KEY,
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES workspace_roles(id),
    state VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_workspace_membership UNIQUE (workspace_id, user_id)
);

-- Row-Level Security (RLS) Policies for Multi-Tenant Isolation
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;

-- Workspaces RLS: Community isolation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspaces' AND policyname = 'workspaces_tenant_isolation'
    ) THEN
        CREATE POLICY workspaces_tenant_isolation ON workspaces
            FOR ALL
            USING (community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid);
    END IF;
END $$;

-- Workspace Roles RLS: Community isolation + Workspace scope (workspace-specific or community built-in)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspace_roles' AND policyname = 'workspace_roles_tenant_isolation'
    ) THEN
        CREATE POLICY workspace_roles_tenant_isolation ON workspace_roles
            FOR ALL
            USING (
                community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
                AND (workspace_id IS NULL OR workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid)
            );
    END IF;
END $$;

-- Workspace Memberships RLS: Community & Workspace isolation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'workspace_memberships' AND policyname = 'workspace_memberships_tenant_isolation'
    ) THEN
        CREATE POLICY workspace_memberships_tenant_isolation ON workspace_memberships
            FOR ALL
            USING (
                community_id = NULLIF(current_setting('app.current_community_id', true), '')::uuid
                AND workspace_id = NULLIF(current_setting('app.current_workspace_id', true), '')::uuid
            );
    END IF;
END $$;

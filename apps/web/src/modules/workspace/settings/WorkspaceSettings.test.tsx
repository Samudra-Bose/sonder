import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { WorkspaceSettingsLayout } from "./WorkspaceSettingsLayout.js";
import { resetWorkspaceMockState } from "@/mocks/handlers/workspaces.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";

const testUser = {
  id: "018f98a2-3f12-7890-a123-456789abcdef",
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testUser,
    communities: defaultMockCommunities,
    csrfToken: "test-csrf-token",
    status: "authenticated",
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    clearError: vi.fn(),
    ...overrides,
  };
}

function renderSettings({
  initialRoute = "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/settings/general",
  workspaceId = "018f98a2-3f12-7890-w002-456789abcdef",
  authOverrides,
}: {
  initialRoute?: string;
  workspaceId?: string;
  authOverrides?: Partial<AuthContextType>;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const authValue = createMockAuth(authOverrides);

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <WorkspaceProvider
          initialCommunityId="018f98a2-3f12-7890-b123-456789abcdef"
          initialWorkspaceId={workspaceId}
        >
          <MemoryRouter initialEntries={[initialRoute]}>
            <Routes>
              <Route
                path="/c/:communityId/w/:workspaceId/settings"
                element={<WorkspaceSettingsLayout />}
              />
              <Route
                path="/c/:communityId/w/:workspaceId/settings/:category"
                element={<WorkspaceSettingsLayout />}
              />
              <Route
                path="/workspaces/:workspaceId/settings/:category"
                element={<WorkspaceSettingsLayout />}
              />
            </Routes>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09H: Workspace Settings Shell & Workflow Spine", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
  });

  it("renders workspace settings shell with workspace metadata and all category tabs", async () => {
    renderSettings();

    expect(await screen.findByTestId("workspace-settings-shell")).toBeInTheDocument();
    expect(await screen.findByText("Engineering Platform")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-prefix-badge")).toHaveTextContent("ENG");

    // Category navigation tabs
    expect(screen.getByTestId("settings-tab-general")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-custom-fields")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-workflow")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-members")).toBeInTheDocument();
    expect(screen.getByTestId("settings-tab-permissions")).toBeInTheDocument();
  });

  it("renders 5-Category Workflow Spine (FEAT-D01) with canonical categories and governance notice", async () => {
    renderSettings({
      initialRoute: "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/settings/workflow",
    });

    expect(await screen.findByTestId("workflow-spine")).toBeInTheDocument();

    // Verify all 5 canonical categories
    expect(screen.getByTestId("workflow-category-BACKLOG")).toBeInTheDocument();
    expect(screen.getByTestId("workflow-category-TODO")).toBeInTheDocument();
    expect(screen.getByTestId("workflow-category-IN_PROGRESS")).toBeInTheDocument();
    expect(screen.getByTestId("workflow-category-DONE")).toBeInTheDocument();
    expect(screen.getByTestId("workflow-category-CANCELED")).toBeInTheDocument();

    // Verify stage indicators
    expect(screen.getByTestId("category-badge-BACKLOG")).toHaveTextContent("Backlog");
    expect(screen.getByTestId("category-badge-TODO")).toHaveTextContent("To Do");
    expect(screen.getByTestId("category-badge-IN_PROGRESS")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("category-badge-DONE")).toHaveTextContent("Done");
    expect(screen.getByTestId("category-badge-CANCELED")).toHaveTextContent("Canceled");

    // Simplicity policy notice
    expect(screen.getByText("Workflow Governance & Simplicity Policy")).toBeInTheDocument();
  });

  it("navigates between category tabs smoothly", async () => {
    const user = userEvent.setup();
    renderSettings({
      initialRoute: "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w002-456789abcdef/settings/general",
    });

    expect(await screen.findByTestId("general-settings-form")).toBeInTheDocument();

    // Click Workflow Spine tab
    await user.click(screen.getByTestId("settings-tab-workflow"));
    expect(await screen.findByTestId("workflow-spine")).toBeInTheDocument();

    // Click Members tab
    await user.click(screen.getByTestId("settings-tab-members"));
    expect(await screen.findByTestId("members-settings")).toBeInTheDocument();

    // Click Permissions tab
    await user.click(screen.getByTestId("settings-tab-permissions"));
    expect(await screen.findByTestId("permissions-settings")).toBeInTheDocument();
    expect(screen.getByTestId("role-matrix")).toBeInTheDocument();
    expect(screen.getByTestId("delegation-policy-card")).toBeInTheDocument();
  });

  it("validates keyPrefix input and updates general settings", async () => {
    const user = userEvent.setup();
    renderSettings();

    const nameInput = await screen.findByTestId("workspace-name-input");
    const prefixInput = screen.getByTestId("workspace-prefix-input");
    const saveButton = screen.getByTestId("save-general-settings-btn");

    // Try entering invalid prefix (starts with lower case / invalid chars)
    await user.clear(prefixInput);
    await user.type(prefixInput, "invalid!");
    await user.click(saveButton);

    expect(await screen.findByText(/key prefix must start with an uppercase letter/i)).toBeInTheDocument();

    // Now enter valid prefix and name
    await user.clear(prefixInput);
    await user.type(prefixInput, "ENG2");
    await user.clear(nameInput);
    await user.type(nameInput, "Engineering Core");

    await user.click(saveButton);

    expect(await screen.findByText("Workspace settings updated successfully.")).toBeInTheDocument();
  });

  it("enforces read-only permissions for non-owner members", async () => {
    // Render workspace w004 where current user's role is MEMBER
    renderSettings({
      workspaceId: "018f98a2-3f12-7890-w004-456789abcdef",
      initialRoute: "/c/018f98a2-3f12-7890-b123-456789abcdef/w/018f98a2-3f12-7890-w004-456789abcdef/settings/general",
    });

    const nameInput = await screen.findByTestId("workspace-name-input");
    const saveButton = screen.getByTestId("save-general-settings-btn");

    // Name and prefix inputs are disabled
    expect(nameInput).toBeDisabled();
    expect(screen.getByTestId("workspace-prefix-input")).toBeDisabled();
    expect(saveButton).toBeDisabled();

    // Non-owner warning banner is present
    expect(screen.getByTestId("owner-restricted-notice")).toHaveTextContent(/only an active Workspace Owner may modify workspace settings/i);
  });
});

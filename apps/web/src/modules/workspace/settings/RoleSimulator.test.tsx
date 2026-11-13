import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { PermissionsSettingsView } from "./PermissionsSettingsView.js";
import { PermissionInspector } from "./PermissionInspector.js";
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

function renderPermissionsView({
  workspaceId = "018f98a2-3f12-7890-w002-456789abcdef",
  communityId = "018f98a2-3f12-7890-b123-456789abcdef",
}: {
  workspaceId?: string;
  communityId?: string;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createMockAuth()}>
        <WorkspaceProvider
          initialCommunityId={communityId}
          initialWorkspaceId={workspaceId}
        >
          <MemoryRouter
            initialEntries={[`/c/${communityId}/w/${workspaceId}/settings/permissions`]}
          >
            <Routes>
              <Route
                path="/c/:communityId/w/:workspaceId/settings/permissions"
                element={<PermissionsSettingsView />}
              />
            </Routes>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09I: Permission Inspector & Role Simulator (FEAT-G03)", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
  });

  it("renders the Permission Inspector with active caller role and all 31 canonical capabilities", async () => {
    renderPermissionsView();

    expect(await screen.findByTestId("permissions-settings")).toBeInTheDocument();
    expect(await screen.findByTestId("permission-inspector-root")).toBeInTheDocument();

    const roleSelect = screen.getByTestId("simulate-role-select");
    await waitFor(() => expect(roleSelect).not.toBeDisabled());

    // Verify evaluating active role (Owner on workspace w002)
    expect(screen.getByText("Workspace Owner")).toBeInTheDocument();

    // Verify capability count metrics
    expect(await screen.findByText(/31 Granted/i)).toBeInTheDocument();
    expect(screen.getByText(/0 Denied/i)).toBeInTheDocument();

    const capList = screen.getByTestId("capability-list");
    // Verify key capabilities appear in capability list
    expect(within(capList).getByText("View Tasks & Details")).toBeInTheDocument();
    expect(within(capList).getByText("Create Tasks")).toBeInTheDocument();
    expect(within(capList).getByText("Manage Custom Field Definitions")).toBeInTheDocument();
    expect(within(capList).getByText("Permanent Task Purge")).toBeInTheDocument();
  });

  it("simulates switching to Member role and displays active simulation banner", async () => {
    const user = userEvent.setup();
    renderPermissionsView();

    expect(await screen.findByTestId("permission-inspector-root")).toBeInTheDocument();

    const roleSelect = screen.getByTestId("simulate-role-select");
    await waitFor(() => expect(roleSelect).not.toBeDisabled());

    // Switch to Member role (018f98a2-3f12-7890-role-member-003)
    await user.selectOptions(roleSelect, "018f98a2-3f12-7890-role-member-003");

    // Banner appears
    const banner = await screen.findByTestId("role-simulator-banner");
    expect(banner).toBeInTheDocument();
    expect(within(banner).getByText(/role simulation active/i)).toBeInTheDocument();
    expect(within(banner).getByText(/Previewing effective permissions and capabilities as this role/i)).toBeInTheDocument();

    // Evaluated posture changes: member has fewer granted capabilities
    expect(await screen.findByText(/11 Granted/i)).toBeInTheDocument();
    expect(screen.getByText(/20 Denied/i)).toBeInTheDocument();

    // Custom fields management is now DENIED for Member
    const cfItem = screen.getByTestId("capability-item-workspace:manage_custom_fields");
    expect(within(cfItem).getByText("Denied")).toBeInTheDocument();
    expect(within(cfItem).getByText(/Member role does not possess 'workspace:manage_custom_fields'/i)).toBeInTheDocument();

    // Permanent delete is DENIED
    const purgeItem = screen.getByTestId("capability-item-task:delete_permanent");
    expect(within(purgeItem).getByText("Denied")).toBeInTheDocument();
    expect(within(purgeItem).getByText(/strictly reserved to the active Workspace Owner/i)).toBeInTheDocument();
  });

  it("exits simulation mode when clicking 'Reset to My Role'", async () => {
    const user = userEvent.setup();
    renderPermissionsView();

    expect(await screen.findByTestId("permission-inspector-root")).toBeInTheDocument();

    const roleSelect = screen.getByTestId("simulate-role-select");
    await waitFor(() => expect(roleSelect).not.toBeDisabled());

    await user.selectOptions(roleSelect, "018f98a2-3f12-7890-role-viewer-004");

    expect(await screen.findByTestId("role-simulator-banner")).toBeInTheDocument();

    // Click exit simulation button
    const exitBtn = screen.getByTestId("exit-simulation-btn");
    await user.click(exitBtn);

    // Banner disappears and state resets to Owner
    await waitFor(() => {
      expect(screen.queryByTestId("role-simulator-banner")).not.toBeInTheDocument();
    });
    expect(screen.getByText(/31 Granted/i)).toBeInTheDocument();
  });

  it("evaluates contextual rules in the interactive scenario sandbox", async () => {
    const user = userEvent.setup();
    renderPermissionsView();

    expect(await screen.findByTestId("scenario-sandbox")).toBeInTheDocument();

    const roleSelect = screen.getByTestId("simulate-role-select");
    await waitFor(() => expect(roleSelect).not.toBeDisabled());

    // Simulate Member role
    await user.selectOptions(roleSelect, "018f98a2-3f12-7890-role-member-003");

    // Active task as Assignee: editing title/description is ALLOWED
    const result0 = screen.getByTestId("scenario-result-0");
    expect(within(result0).getByText("ALLOWED")).toBeInTheDocument();

    // Switch lifecycle state to ARCHIVED (in 30-day trash)
    const statusSelect = screen.getByTestId("scenario-status-select");
    await user.selectOptions(statusSelect, "ARCHIVED");

    // Title editing is now BLOCKED by trash protection
    expect(within(result0).getByText("BLOCKED")).toBeInTheDocument();
    expect(within(result0).getByText(/Task is in 30-day Trash/i)).toBeInTheDocument();

    // Permanent purge is always BLOCKED for Member
    const result4 = screen.getByTestId("scenario-result-4");
    expect(within(result4).getByText("BLOCKED")).toBeInTheDocument();
    expect(within(result4).getByText(/strictly restricted to Workspace Owner/i)).toBeInTheDocument();
  });

  it("filters capabilities by search query, status, and category", async () => {
    const user = userEvent.setup();
    renderPermissionsView();

    expect(await screen.findByTestId("permission-inspector-root")).toBeInTheDocument();

    const capList = screen.getByTestId("capability-list");

    // Search for "custom field"
    const searchInput = screen.getByTestId("capability-search-input");
    await user.type(searchInput, "custom field");

    // Only custom field capabilities appear
    expect(within(capList).getByText("Manage Custom Field Definitions")).toBeInTheDocument();
    expect(within(capList).getByText("Edit Custom Fields & Links")).toBeInTheDocument();
    expect(within(capList).queryByText("Permanent Task Purge")).not.toBeInTheDocument();

    // Clear search
    await user.clear(searchInput);

    // Click Category: Workspace Administration
    const adminChip = screen.getByTestId("category-chip-ADMINISTRATION");
    await user.click(adminChip);

    expect(within(capList).getByText("Manage Custom Field Definitions")).toBeInTheDocument();
    expect(within(capList).getByText("Update Workspace Settings")).toBeInTheDocument();
    expect(within(capList).queryByText("Create Tasks")).not.toBeInTheDocument();

    // Click Category: All
    await user.click(screen.getByTestId("category-chip-ALL"));

    const roleSelect = screen.getByTestId("simulate-role-select");
    await waitFor(() => expect(roleSelect).not.toBeDisabled());

    // Simulate Member role and filter by Denied
    await user.selectOptions(roleSelect, "018f98a2-3f12-7890-role-member-003");
    await user.click(screen.getByTestId("filter-denied"));

    // Only denied capabilities are visible
    expect(within(capList).getByText("Manage Custom Field Definitions")).toBeInTheDocument();
    expect(within(capList).queryByText("View Tasks & Details")).not.toBeInTheDocument();
  });

  it("renders the Roles Matrix and Delegation Policy Card alongside the Permission Inspector", async () => {
    renderPermissionsView();

    expect(await screen.findByTestId("permission-inspector-root")).toBeInTheDocument();
    expect(await screen.findByTestId("role-matrix")).toBeInTheDocument();
    expect(screen.getByTestId("delegation-policy-card")).toBeInTheDocument();
    expect(screen.getByText("Built-In Roles Reference Matrix")).toBeInTheDocument();
  });

  it("fails closed safely when role or workspace context is null", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <PermissionInspector workspace={null} />
      </QueryClientProvider>
    );

    expect(screen.getByTestId("permission-inspector-root")).toBeInTheDocument();
  });
});

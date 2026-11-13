import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { CustomFieldsSettingsView } from "./CustomFieldsSettingsView.js";
import { resetWorkspaceMockState } from "@/mocks/handlers/workspaces.js";
import { resetCustomFieldsMockState } from "@/mocks/handlers/custom-fields.js";
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

function renderCustomFieldsView({
  workspaceId = "018f98a2-3f12-7890-w002-456789abcdef",
  communityId = "018f98a2-3f12-7890-b123-456789abcdef",
  authOverrides,
}: {
  workspaceId?: string;
  communityId?: string;
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
          initialCommunityId={communityId}
          initialWorkspaceId={workspaceId}
        >
          <MemoryRouter
            initialEntries={[`/c/${communityId}/w/${workspaceId}/settings/custom-fields`]}
          >
            <Routes>
              <Route
                path="/c/:communityId/w/:workspaceId/settings/custom-fields"
                element={<CustomFieldsSettingsView />}
              />
            </Routes>
          </MemoryRouter>
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09H: Core Custom Fields Management (FEAT-D04a)", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
    resetCustomFieldsMockState();
  });

  it("renders custom fields settings list with seeded definitions and badges", async () => {
    renderCustomFieldsView();

    expect(await screen.findByTestId("custom-fields-settings")).toBeInTheDocument();

    // Verify seeded custom fields appear in the table
    expect(await screen.findByText("Component")).toBeInTheDocument();
    expect(screen.getByText("Story Points")).toBeInTheDocument();
    expect(screen.getByText("Release Track")).toBeInTheDocument();
    expect(screen.getByText("Customer Impact")).toBeInTheDocument();

    // Verify type badges
    expect(screen.getByText("Single Select")).toBeInTheDocument();
    expect(screen.getByText("Number")).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();

    // Verify key display
    expect(screen.getByText("cf.cf_story_points")).toBeInTheDocument();
  });

  it("creates a new TEXT custom field successfully", async () => {
    const user = userEvent.setup();
    renderCustomFieldsView();

    const createBtn = await screen.findByTestId("create-custom-field-btn");
    await user.click(createBtn);

    // Modal dialog opens
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Create Custom Field" })).toBeInTheDocument();

    const nameInput = screen.getByTestId("field-name-input");
    const descInput = screen.getByTestId("field-description-input");
    const submitBtn = screen.getByTestId("submit-custom-field-btn");

    await user.type(nameInput, "Sprint Target");
    await user.type(descInput, "Target sprint milestone identifier");

    await user.click(submitBtn);

    // Modal closes and new field appears in list
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Sprint Target")).toBeInTheDocument();
  });

  it("creates a SINGLE_SELECT custom field with dynamic options", async () => {
    const user = userEvent.setup();
    renderCustomFieldsView();

    await user.click(await screen.findByTestId("create-custom-field-btn"));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const nameInput = screen.getByTestId("field-name-input");
    const typeSelect = screen.getByTestId("field-type-select");
    const submitBtn = screen.getByTestId("submit-custom-field-btn");

    await user.type(nameInput, "Severity Level");
    await user.selectOptions(typeSelect, "SINGLE_SELECT");

    // Option builder appears
    expect(screen.getByText(/min 1 option required/i)).toBeInTheDocument();

    // Attempting to submit without options shows validation error
    await user.click(submitBtn);
    expect(await screen.findByText("Single select fields must have at least one option.")).toBeInTheDocument();

    // Add options
    const optInput = screen.getByTestId("add-option-input");
    const addOptBtn = screen.getByTestId("add-option-btn");

    await user.type(optInput, "Critical (P0)");
    await user.click(addOptBtn);

    await user.type(optInput, "Major (P1)");
    await user.click(addOptBtn);

    await user.type(optInput, "Minor (P2)");
    await user.click(addOptBtn);

    expect(screen.getByText("Critical (P0)")).toBeInTheDocument();
    expect(screen.getByText("Major (P1)")).toBeInTheDocument();
    expect(screen.getByText("Minor (P2)")).toBeInTheDocument();

    // Now submit
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Severity Level")).toBeInTheDocument();
  });

  it("edits an existing custom field definition", async () => {
    const user = userEvent.setup();
    renderCustomFieldsView();

    // Find edit button for Story Points (cf02)
    const editBtn = await screen.findByTestId("edit-custom-field-btn-018f98a2-3f12-7890-cf02-456789abcdef");
    await user.click(editBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Edit Custom Field: Story Points/i)).toBeInTheDocument();

    const nameInput = screen.getByTestId("edit-field-name-input");
    await user.clear(nameInput);
    await user.type(nameInput, "Fibonacci Points");

    const submitBtn = screen.getByTestId("submit-edit-custom-field-btn");
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(await screen.findByText("Fibonacci Points")).toBeInTheDocument();
  });

  it("archives a custom field with confirmation dialog", async () => {
    const user = userEvent.setup();
    renderCustomFieldsView();

    // Story Points
    expect(await screen.findByText("Story Points")).toBeInTheDocument();

    const archiveBtn = screen.getByTestId("archive-custom-field-btn-018f98a2-3f12-7890-cf02-456789abcdef");
    await user.click(archiveBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Archive Custom Field: Story Points/i)).toBeInTheDocument();
    expect(screen.getByText(/Archiving removes this custom field from new task creation/i)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-archive-custom-field-btn");
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Story Points")).not.toBeInTheDocument();
  });

  it("enforces read-only permissions for non-owner members", async () => {
    // Render workspace w004 where user role is MEMBER
    renderCustomFieldsView({
      workspaceId: "018f98a2-3f12-7890-w004-456789abcdef",
    });

    expect(await screen.findByTestId("custom-fields-settings")).toBeInTheDocument();

    // Read-only notice is displayed
    expect(await screen.findByTestId("read-only-notice")).toBeInTheDocument();
    expect(screen.getByText(/only workspace owners can create, modify, or archive custom field definitions/i)).toBeInTheDocument();

    // Create button is disabled
    const createBtn = screen.getByTestId("create-custom-field-btn");
    expect(createBtn).toBeDisabled();

    // Edit and Archive buttons are not rendered
    expect(screen.queryByTestId("edit-custom-field-btn-018f98a2-3f12-7890-cf01-456789abcdef")).not.toBeInTheDocument();
    expect(screen.queryByTestId("archive-custom-field-btn-018f98a2-3f12-7890-cf01-456789abcdef")).not.toBeInTheDocument();
  });
});

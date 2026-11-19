import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "./lib/theme.js";
import { AuthContext, type AuthContextType } from "./modules/auth/AuthContext.js";
import { OmnibarProvider } from "./modules/omnibar/OmnibarContext.js";
import { MemberSelector } from "./modules/workspace/MemberSelector.js";
import { InlineAssigneeEditor } from "./modules/tasks/InlineFieldEditors.js";
import { QuickTaskComposer } from "./modules/tasks/QuickTaskComposer.js";
import { AppHeader } from "./modules/app-shell/AppHeader.js";
import { resetWorkspaceMockState } from "./mocks/handlers/workspaces.js";
import { resetTaskMockState } from "./mocks/handlers/tasks.js";
import { makeTaskPermissions } from "./mocks/data/tasks.js";
import type { TaskDto } from "./modules/tasks/types.js";
import * as WorkspaceModule from "./modules/workspace/WorkspaceContext.js";
import * as QuickComposerContextModule from "./modules/tasks/QuickTaskComposerContext.js";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

const mockAuthValue: AuthContextType = {
  user: {
    id: "018f98a2-3f12-7890-a123-456789abcdef",
    displayName: "Alex Morgan",
    email: "alex.morgan@example.org",
    avatarUrl: null,
  },
  communities: [],
  status: "authenticated",
  csrfToken: "mock-session-csrf-token",
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  clearError: vi.fn(),
};

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthContext.Provider value={mockAuthValue}>
          <OmnibarProvider>
            <MemoryRouter>{children}</MemoryRouter>
          </OmnibarProvider>
        </AuthContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

describe("Sonder — Task Assignment Integrity, Permissions & Global Header Context", () => {
  beforeEach(() => {
    resetWorkspaceMockState();
    resetTaskMockState();
    vi.restoreAllMocks();
  });

  describe("MemberSelector Component Contract & Interactions", () => {
    it("renders trigger with placeholder, opens dropdown and filters by displayName and role without email", async () => {
      const user = userEvent.setup();
      const onSelectMember = vi.fn();

      render(
        <TestWrapper>
          <MemberSelector
            communityId="018f98a2-3f12-7890-b123-456789abcdef"
            workspaceId="018f98a2-3f12-7890-w001-456789abcdef"
            selectedMemberId={null}
            onSelectMember={onSelectMember}
            placeholder="+ Assign person"
          />
        </TestWrapper>
      );

      // Trigger is present with placeholder
      const trigger = screen.getByTestId("member-selector-trigger");
      expect(trigger).toHaveTextContent("+ Assign person");

      // Open popover
      await user.click(trigger);

      // Verify listbox is rendered and members are loaded
      await waitFor(() => {
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
        expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
        expect(screen.getByText("Taylor Swift")).toBeInTheDocument();
      });

      // Role names are visible in the dropdown
      expect(screen.getAllByText("Workspace Owner").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Coordinator").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Member").length).toBeGreaterThanOrEqual(1);

      // Search input filters by name
      const searchInput = screen.getByTestId("member-selector-search");
      await user.type(searchInput, "Taylor");

      expect(screen.getByText("Taylor Swift")).toBeInTheDocument();
      expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();

      // Clear and search by role
      await user.clear(searchInput);
      await user.type(searchInput, "Coordinator");

      expect(screen.getByText("Jordan Lee")).toBeInTheDocument();
      expect(screen.queryByText("Alex Morgan")).not.toBeInTheDocument();

      // Select Jordan Lee
      const jordanOption = screen.getByTestId("member-option-018f98a2-3f12-7890-a123-456789bbcdef");
      await user.click(jordanOption);

      expect(onSelectMember).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({
            displayName: "Jordan Lee",
          }),
        })
      );
    });

    it("allows selecting 'Unassigned' to clear assignee selection", async () => {
      const user = userEvent.setup();
      const onSelectMember = vi.fn();

      render(
        <TestWrapper>
          <MemberSelector
            communityId="018f98a2-3f12-7890-b123-456789abcdef"
            workspaceId="018f98a2-3f12-7890-w001-456789abcdef"
            selectedMemberId="018f98a2-3f12-7890-a123-456789bbcdef"
            onSelectMember={onSelectMember}
          />
        </TestWrapper>
      );

      const trigger = screen.getByTestId("member-selector-trigger");
      await user.click(trigger);

      const unassignedOption = await screen.findByTestId("member-option-unassigned");
      expect(unassignedOption).toBeInTheDocument();
      await user.click(unassignedOption);

      expect(onSelectMember).toHaveBeenCalledWith(null);
    });
  });

  describe("InlineAssigneeEditor Fail-Closed Permission Gate", () => {
    const baseMockTask: TaskDto = {
      id: "018f98a2-task-test-01",
      workspaceId: "018f98a2-3f12-7890-w001-456789abcdef",
      parentTaskId: null,
      taskKey: "ENG-999",
      title: "Test Task",
      itemType: "TASK",
      statusCategory: "TODO",
      priority: "MEDIUM",
      assigneeIds: ["018f98a2-3f12-7890-a123-456789bbcdef"],
      creatorId: "018f98a2-3f12-7890-a123-456789abcdef",
      startDate: null,
      dueDate: null,
      estimatePoints: null,
      labelIds: [],
      milestoneId: null,
      rankKey: "0|hzzzzz:",
      version: 1,
      fieldRevisions: { assigneeIds: 1 },
      effectivePermissions: makeTaskPermissions(true),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
      assigneeAssignments: [
        {
          userId: "018f98a2-3f12-7890-a123-456789bbcdef",
          user: {
            id: "018f98a2-3f12-7890-a123-456789bbcdef",
            displayName: "Jordan Lee",
            avatarUrl: null,
          },
          assignedByUserId: "018f98a2-3f12-7890-a123-456789abcdef",
          assignedAt: new Date().toISOString(),
        },
      ],
      assigneeEditableFieldGroups: [],
    };

    it("renders interactive MemberSelector when canAssign is true", () => {
      render(
        <TestWrapper>
          <InlineAssigneeEditor
            task={baseMockTask}
            communityId="018f98a2-3f12-7890-b123-456789abcdef"
            workspaceId="018f98a2-3f12-7890-w001-456789abcdef"
            isArchived={false}
          />
        </TestWrapper>
      );

      expect(screen.getByTestId("member-selector-trigger")).toBeInTheDocument();
    });

    it("fails closed and renders read-only avatar pill when canAssign is false", () => {
      const readOnlyTask: TaskDto = {
        ...baseMockTask,
        effectivePermissions: {
          ...baseMockTask.effectivePermissions,
          canAssign: false,
        },
      };

      render(
        <TestWrapper>
          <InlineAssigneeEditor
            task={readOnlyTask}
            communityId="018f98a2-3f12-7890-b123-456789abcdef"
            workspaceId="018f98a2-3f12-7890-w001-456789abcdef"
            isArchived={false}
          />
        </TestWrapper>
      );

      // MemberSelector trigger should NOT be present
      expect(screen.queryByTestId("member-selector-trigger")).not.toBeInTheDocument();

      // Read-only pill with security title should be present
      const pill = screen.getByTitle("You do not have permission to modify task assignees");
      expect(pill).toBeInTheDocument();
      expect(pill).toHaveTextContent("Jordan Lee");
    });
  });

  describe("Global Header & QuickTaskComposer Zero-Workspace Context", () => {
    it("disables global header 'New Task' button with explanatory tooltip when active community has 0 workspaces", () => {
      vi.spyOn(WorkspaceModule, "useWorkspace").mockReturnValue({
        currentCommunityId: "018f98a2-3f12-7890-b123-456789abcdef",
        currentCommunity: {
          communityId: "018f98a2-3f12-7890-b123-456789abcdef",
          name: "Sonder Community",
          membershipStatus: "ACTIVE",
          isCommunityAdmin: true,
          isDefaultCoordinator: false,
        },
        communities: [],
        activeWorkspaceId: null,
        activeWorkspace: null,
        workspaces: [], // 0 workspaces!
        personalWorkspace: null,
        sharedWorkspaces: [],
        isLoading: false,
        error: null,
        refetchWorkspaces: vi.fn(),
        selectWorkspace: vi.fn(),
        selectCommunity: vi.fn(),
        isSwitchingCommunity: false,
        communitySwitchError: null,
      });

      render(
        <TestWrapper>
          <AppHeader
            user={{ id: "user-1", displayName: "Alex", email: "alex@example.org", avatarUrl: null }}
            isSidebarCollapsed={false}
            onToggleSidebar={vi.fn()}
            onOpenMobileNav={vi.fn()}
            onLogout={vi.fn()}
            isLoggingOut={false}
            onOpenQuickComposer={vi.fn()}
          />
        </TestWrapper>
      );

      const newTaskBtn = screen.getByTestId("global-header-create-task-btn");
      expect(newTaskBtn).toBeDisabled();
      expect(newTaskBtn).toHaveAttribute("aria-label", "Create new task (disabled)");
    });

    it("renders zero-workspace state in QuickTaskComposer when workspaces list is empty", () => {
      vi.spyOn(WorkspaceModule, "useWorkspace").mockReturnValue({
        currentCommunityId: "018f98a2-3f12-7890-b123-456789abcdef",
        currentCommunity: {
          communityId: "018f98a2-3f12-7890-b123-456789abcdef",
          name: "Sonder Community",
          membershipStatus: "ACTIVE",
          isCommunityAdmin: true,
          isDefaultCoordinator: false,
        },
        communities: [],
        activeWorkspaceId: null,
        activeWorkspace: null,
        workspaces: [], // 0 workspaces
        personalWorkspace: null,
        sharedWorkspaces: [],
        isLoading: false,
        error: null,
        refetchWorkspaces: vi.fn(),
        selectWorkspace: vi.fn(),
        selectCommunity: vi.fn(),
        isSwitchingCommunity: false,
        communitySwitchError: null,
      });

      vi.spyOn(QuickComposerContextModule, "useQuickTaskComposer").mockReturnValue({
        isOpen: true,
        open: vi.fn(),
        close: vi.fn(),
        toggle: vi.fn(),
        initialValues: null,
      });

      render(
        <TestWrapper>
          <QuickTaskComposer />
        </TestWrapper>
      );

      expect(screen.getByTestId("composer-no-workspaces")).toBeInTheDocument();
      expect(screen.getByText("No workspaces available")).toBeInTheDocument();
      expect(
        screen.getByText("You must create a workspace in this community before authoring tasks.")
      ).toBeInTheDocument();
      expect(screen.queryByTestId("composer-title-input")).not.toBeInTheDocument();
    });
  });
});

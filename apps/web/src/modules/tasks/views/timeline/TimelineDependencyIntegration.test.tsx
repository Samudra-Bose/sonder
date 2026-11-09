import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { defaultMockCommunities } from "../../../../mocks/handlers/auth.js";
import { AuthContext, type AuthContextType } from "@/modules/auth/index.js";
import { WorkspaceProvider } from "@/modules/workspace/index.js";
import { QuickTaskComposerProvider } from "../../QuickTaskComposerContext.js";
import { TaskPeekDrawer } from "../../TaskPeekDrawer.js";
import { WorkspaceTasksView } from "../WorkspaceTasksView.js";
import {
  WS_SHARED_ENG_ID,
  MOCK_COMMUNITY_1_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState } from "@/mocks/handlers/tasks.js";
import { resetMockMilestones } from "@/mocks/data/milestones.js";
import { resetMockTaskLinks, LINK_2_VALID_ID } from "@/mocks/data/task-links.js";

const mockAuthValue: AuthContextType = {
  user: {
    id: "018f98a2-3f12-7890-a001-23456789abcd",
    email: "alex@example.com",
    displayName: "Alex Morgan",
    avatarUrl: null,
  },
  communities: defaultMockCommunities,
  status: "authenticated",
  error: null,
  csrfToken: "mock-valid-csrf-token",
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  clearError: vi.fn(),
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderAppWithRoute(initialEntries: string[]) {
  const queryClient = createTestQueryClient();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={mockAuthValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <QuickTaskComposerProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                  <Route
                    path="/c/:communityId/w/:workspaceId/timeline"
                    element={<WorkspaceTasksView defaultView="timeline" />}
                  />
                  <Route
                    path="/c/:communityId/w/:workspaceId/*"
                    element={<WorkspaceTasksView defaultView="timeline" />}
                  />
                </Routes>
                <TaskPeekDrawer forceMode="desktop" />
              </MemoryRouter>
            </QuickTaskComposerProvider>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("VS-05C.1: Timeline Dependency Integration & Live Cache Invalidation", () => {
  beforeEach(() => {
    resetTaskMockState();
    resetMockMilestones();
    resetMockTaskLinks();
  });

  it("updates timeline connectors dynamically when deleting and adding dependencies without full page reload", async () => {
    const user = userEvent.setup();

    renderAppWithRoute([
      `/c/${MOCK_COMMUNITY_1_ID}/w/${WS_SHARED_ENG_ID}/timeline?date=2026-11-09&mode=month`,
    ]);

    // 1. Initial Timeline Mount: Verify timeline and dependency SVG container are present
    await waitFor(() => {
      expect(screen.getByTestId("timeline-view")).toBeInTheDocument();
      expect(screen.getByTestId("timeline-dependency-svg")).toBeInTheDocument();
    });

    // 2. Initial Dependency Edge: LINK_2_VALID_ID connects ENG-102 and ENG-050
    await waitFor(() => {
      expect(
        screen.getByTestId(`dependency-connector-${LINK_2_VALID_ID}`)
      ).toBeInTheDocument();
    });

    // 3. Open TaskPeekDrawer for ENG-102 by clicking its info button in the timeline row
    const taskInfoBtn = await screen.findByTestId(
      "timeline-task-info-018f98a2-task-003-today-assigned-created"
    );
    await user.click(taskInfoBtn);

    // Verify TaskPeekDrawer opened
    await waitFor(() => {
      expect(screen.getByTestId("task-peek-drawer-desktop")).toBeInTheDocument();
      expect(screen.getByTestId("task-dependencies-section")).toBeInTheDocument();
    });

    // 4. Verify TaskPeekDrawer shows the existing link (LINK_2_VALID_ID)
    await waitFor(() => {
      expect(
        screen.getByTestId(`dependency-item-${LINK_2_VALID_ID}`)
      ).toBeInTheDocument();
    });

    // 5. Delete the dependency from TaskPeekDrawer
    const deleteBtn = screen.getByTestId(`delete-dependency-${LINK_2_VALID_ID}`);
    await user.click(deleteBtn);

    // 6. Verify link is removed from TaskPeekDrawer dependency list
    await waitFor(() => {
      expect(
        screen.queryByTestId(`dependency-item-${LINK_2_VALID_ID}`)
      ).not.toBeInTheDocument();
    });

    // 7. Verify Timeline connector is removed dynamically WITHOUT full page reload
    await waitFor(() => {
      expect(
        screen.queryByTestId(`dependency-connector-${LINK_2_VALID_ID}`)
      ).not.toBeInTheDocument();
    });

    // 8. Add a new dependency link from TaskPeekDrawer: ENG-102 BLOCKS ENG-050 again
    const addDepBtn = screen.getByTestId("add-dependency-button");
    await user.click(addDepBtn);

    await waitFor(() => {
      expect(screen.getByTestId("add-dependency-form")).toBeInTheDocument();
    });

    // Select target task ENG-050
    const targetSelect = screen.getByTestId("dependency-target-select");
    await user.selectOptions(targetSelect, "018f98a2-task-011-viewer-readonly");

    // Submit form
    const submitBtn = screen.getByTestId("submit-dependency-button");
    await user.click(submitBtn);

    // 9. Verify new dependency item appears in TaskPeekDrawer
    await waitFor(() => {
      expect(screen.queryByTestId("add-dependency-form")).not.toBeInTheDocument();
      const depItems = screen.getAllByTestId(/^dependency-item-/);
      expect(depItems.length).toBeGreaterThan(0);
    });

    // 10. Verify that Timeline connector is rendered again dynamically without page reload
    await waitFor(() => {
      const connectors = screen.getAllByTestId(/^dependency-connector-/);
      expect(connectors.length).toBeGreaterThan(0);
    });
  });
});

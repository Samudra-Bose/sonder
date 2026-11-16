import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext.js";
import { WorkspaceProvider } from "@/modules/workspace/WorkspaceContext.js";
import { defaultMockCommunities } from "@/mocks/handlers/auth.js";
import {
  MOCK_COMMUNITY_1_ID,
  WS_SHARED_ENG_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work.js";
import { resetTaskMockState, getMockTasks, setMockTasksError } from "@/mocks/handlers/tasks.js";
import { TaskPeekDrawer } from "./TaskPeekDrawer.js";
import { TaskExternalLinksSection } from "./TaskExternalLinksSection.js";
import type { TaskDto } from "./types.js";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

function createMockAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: testAuthUser,
    communities: defaultMockCommunities,
    csrfToken: "mock-csrf-token",
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

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });
}

function renderExternalLinksSection(task: TaskDto, canEdit = true) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  const taskWithPerms: TaskDto = {
    ...task,
    effectivePermissions: {
      ...task.effectivePermissions,
      canEditCustomFieldsLinks: canEdit,
    },
  };

  const initialKey = ["communities", MOCK_COMMUNITY_1_ID, "workspaces", WS_SHARED_ENG_ID, "tasks", task.id];
  queryClient.setQueryData(initialKey, taskWithPerms);

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <MemoryRouter initialEntries={["/"]}>
              <TaskExternalLinksSection
                task={taskWithPerms}
                communityId={MOCK_COMMUNITY_1_ID}
                workspaceId={WS_SHARED_ENG_ID}
              />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

function renderDrawerWithTask(initialEntries = ["/?task=ENG-101"]) {
  const queryClient = createTestQueryClient();
  const authValue = createMockAuth();

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <WorkspaceProvider
            initialCommunityId={MOCK_COMMUNITY_1_ID}
            initialWorkspaceId={WS_SHARED_ENG_ID}
          >
            <MemoryRouter initialEntries={initialEntries}>
              <TaskPeekDrawer forceMode="desktop" />
            </MemoryRouter>
          </WorkspaceProvider>
        </AuthContext.Provider>
      </QueryClientProvider>
    ),
  };
}

describe("Structured External Link Management (FEAT-K01 & SEC-T09)", () => {
  beforeEach(() => {
    resetTaskMockState();
  });

  describe("Link Attachment Workflow", () => {
    it("attaches a valid GitHub PR URL with custom title and saves to task", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("task-external-links-section")).toBeInTheDocument();
      });

      // Click "Add link" button
      const addBtn = screen.getByTestId("add-external-link-btn");
      await user.click(addBtn);

      // Verify inline form opens
      expect(screen.getByTestId("external-link-form")).toBeInTheDocument();
      const urlInput = screen.getByTestId("external-link-url-input");
      const titleInput = screen.getByTestId("external-link-title-input");

      // Enter GitHub URL and custom title
      await user.type(urlInput, "https://github.com/sonder/frontend/pull/999");
      await user.type(titleInput, "Auth Refactor PR #999");

      // Verify live provider preview detects GitHub
      expect(screen.getByTestId("external-link-live-preview")).toHaveTextContent(/GitHub/i);

      // Submit form
      const submitBtn = screen.getByTestId("external-link-submit-btn");
      await user.click(submitBtn);

      // Verify form closes and new chip appears in drawer
      await waitFor(() => {
        expect(screen.queryByTestId("external-link-form")).not.toBeInTheDocument();
      });

      // Verify the new chip is rendered
      expect(screen.getByText("Auth Refactor PR #999")).toBeInTheDocument();

      // Verify persistence in MSW mock state
      const updatedTask = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(updatedTask?.externalLinks).toHaveLength(3);
      expect(updatedTask?.externalLinks?.some((l) => l.url === "https://github.com/sonder/frontend/pull/999")).toBe(true);
    });

    it("attaches a Figma URL with automatic title detection when custom title is omitted", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));

      const urlInput = screen.getByTestId("external-link-url-input");
      await user.type(urlInput, "https://figma.com/design/xyz123/Mobile-Navigation-Spec");

      // Submit without entering a custom title
      await user.click(screen.getByTestId("external-link-submit-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("external-link-form")).not.toBeInTheDocument();
      });

      // Verify automatic title was derived from path
      expect(screen.getByText(/Mobile Navigation Spec/i)).toBeInTheDocument();
    });

    it("attaches a generic URL and renders domain badge", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));
      await user.type(screen.getByTestId("external-link-url-input"), "https://linear.app/issue/LIN-42");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("external-link-form")).not.toBeInTheDocument();
      });

      expect(screen.getByText(/linear.app/i)).toBeInTheDocument();
    });
  });

  describe("Security & Validation Hardening (SEC-T09)", () => {
    it("rejects javascript: and dangerous URI schemes with clear error", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));

      const urlInput = screen.getByTestId("external-link-url-input");
      await user.type(urlInput, "javascript:alert(document.cookie)");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      // Verify form error is displayed and form is not submitted
      expect(screen.getByTestId("external-link-form-error")).toHaveTextContent(
        "Invalid URL scheme. Only https:// (and http://) URLs are allowed."
      );
      expect(screen.getByTestId("external-link-form")).toBeInTheDocument();
    });

    it("rejects protocol-relative URLs (//evil.com)", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));

      const urlInput = screen.getByTestId("external-link-url-input");
      await user.type(urlInput, "//attacker.example.org/malware");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      expect(screen.getByTestId("external-link-form-error")).toHaveTextContent(
        /Protocol-relative URLs are not allowed/i
      );
    });

    it("rejects duplicate URLs with user-friendly error message", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));

      // ENG-101 already has https://github.com/sonder/work-management/pull/42
      const urlInput = screen.getByTestId("external-link-url-input");
      await user.type(urlInput, "https://github.com/sonder/work-management/pull/42");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      expect(screen.getByTestId("external-link-form-error")).toHaveTextContent(
        /This URL is already attached to this task/i
      );
    });

    it("rejects empty URL submission", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));
      await user.click(screen.getByTestId("external-link-submit-btn"));

      expect(screen.getByTestId("external-link-form-error")).toHaveTextContent(/URL is required/i);
    });
  });

  describe("Link Editing & Removal Workflow", () => {
    it("edits an existing external link title and saves changes", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("edit-external-link-btn-link-018f-pr-42")).toBeInTheDocument();
      });

      // Click edit on the PR link
      await user.click(screen.getByTestId("edit-external-link-btn-link-018f-pr-42"));

      expect(screen.getByTestId("external-link-form")).toBeInTheDocument();
      const titleInput = screen.getByTestId("external-link-title-input");

      // Clear and type new title
      await user.clear(titleInput);
      await user.type(titleInput, "Renamed Token Refresh PR");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("external-link-form")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Renamed Token Refresh PR")).toBeInTheDocument();

      // Verify MSW state updated
      const updated = getMockTasks().find((t) => t.taskKey === "ENG-101");
      const foundLink = updated?.externalLinks?.find((l) => l.id === "link-018f-pr-42");
      expect(foundLink?.title).toBe("Renamed Token Refresh PR");
    });

    it("removes an attached external link with immediate drawer update and MSW persistence", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("remove-external-link-btn-link-018f-figma-spec")).toBeInTheDocument();
      });

      // Click remove on Figma link
      await user.click(screen.getByTestId("remove-external-link-btn-link-018f-figma-spec"));

      // Verify the link is removed from drawer
      await waitFor(() => {
        expect(screen.queryByTestId("remove-external-link-btn-link-018f-figma-spec")).not.toBeInTheDocument();
      });

      // Header link count decrements to 1
      expect(screen.getByText(/External Links \(1\)/i)).toBeInTheDocument();

      // Verify MSW state
      const updated = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(updated?.externalLinks).toHaveLength(1);
      expect(updated?.externalLinks?.some((l) => l.id === "link-018f-figma-spec")).toBe(false);
    });

    it("cancels add form without saving or mutating task", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-external-link-btn"));
      await user.type(screen.getByTestId("external-link-url-input"), "https://example.com/cancelled");

      // Click Cancel
      await user.click(screen.getByTestId("external-link-cancel-btn"));

      expect(screen.queryByTestId("external-link-form")).not.toBeInTheDocument();
      expect(screen.queryByText(/cancelled/i)).not.toBeInTheDocument();

      // Mock task unchanged
      const task = getMockTasks().find((t) => t.taskKey === "ENG-101");
      expect(task?.externalLinks).toHaveLength(2);
    });
  });

  describe("Permission Boundaries & Read-Only Users", () => {
    it("hides add, edit, and remove controls when user lacks canEditCustomFieldsLinks", async () => {
      const task = getMockTasks().find((t) => t.taskKey === "ENG-101")!;
      renderExternalLinksSection(task, false);

      await waitFor(() => {
        expect(screen.getByTestId("task-external-links-section")).toBeInTheDocument();
      });

      // Add link button must not be present
      expect(screen.queryByTestId("add-external-link-btn")).not.toBeInTheDocument();

      // Edit and remove buttons must not be present
      expect(screen.queryByTestId("edit-external-link-btn-link-018f-pr-42")).not.toBeInTheDocument();
      expect(screen.queryByTestId("remove-external-link-btn-link-018f-pr-42")).not.toBeInTheDocument();

      // Chips still render for reading with copy buttons and safe direct links
      expect(screen.getAllByTestId("smart-url-chip")).toHaveLength(2);
      expect(screen.getAllByTestId("smart-url-copy-btn")).toHaveLength(2);
    });
  });

  describe("Concurrency & Optimistic Rollback", () => {
    it("rolls back optimistic links and displays error banner when server rejects update", async () => {
      const user = userEvent.setup();
      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("add-external-link-btn")).toBeInTheDocument();
      });

      // Force MSW to return a 409 conflict on next PATCH
      setMockTasksError({
        status: 409,
        problem: {
          type: "https://errors.sonder.platform/task-concurrency-conflict",
          title: "Task Concurrency Conflict",
          status: 409,
          detail: "Field(s) 'externalLinks' have been modified concurrently.",
          code: "FIELD_REVISION_CONFLICT",
          conflictingFields: ["externalLinks"],
        },
      });

      await user.click(screen.getByTestId("add-external-link-btn"));
      await user.type(screen.getByTestId("external-link-url-input"), "https://github.com/sonder/frontend/pull/500");
      await user.click(screen.getByTestId("external-link-submit-btn"));

      // Error alert appears
      await waitFor(() => {
        expect(screen.getByTestId("external-link-error-alert")).toBeInTheDocument();
      });

      expect(screen.getByTestId("external-link-error-alert")).toHaveTextContent(
        /Link update conflict: this task was modified concurrently/i
      );

      // The rejected link is not present in the drawer chips
      expect(screen.queryByText(/pull\/500/i)).not.toBeInTheDocument();
    });
  });

  describe("Copy & Navigation Invariants", () => {
    it("copies link to clipboard and preserves direct safe navigation attributes", async () => {
      const user = userEvent.setup();
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      renderDrawerWithTask(["/?task=ENG-101"]);

      await waitFor(() => {
        expect(screen.getByTestId("task-external-links-section")).toBeInTheDocument();
      });

      const copyBtns = screen.getAllByTestId("smart-url-copy-btn");
      await user.click(copyBtns[0]!);

      expect(writeTextMock).toHaveBeenCalledWith("https://github.com/sonder/work-management/pull/42");

      const link = screen.getByRole("link", { name: /github/i });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext, type AuthContextType } from "@/modules/auth/AuthContext";
import { WorkspaceProvider } from "./WorkspaceContext";
import { defaultMockCommunities } from "@/mocks/handlers/auth";
import {
  MOCK_COMMUNITY_1_ID,
  MOCK_USER_ID,
} from "@/mocks/data/my-work";
import { CreateWorkspaceDialog } from "./CreateWorkspaceDialog";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { MobileWorkspaceSelector } from "./MobileWorkspaceSelector";
import * as workspaceApi from "./api";
import {
  setMockTemplatesError,
  setMockCreateWorkspaceError,
  resetWorkspaceMockState,
} from "@/mocks/handlers/workspaces";

const testAuthUser = {
  id: MOCK_USER_ID,
  displayName: "Alex Morgan",
  email: "alex.morgan@example.org",
  avatarUrl: null,
};

const mockAuthValue: AuthContextType = {
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
};

function renderCreateDialog(props: {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  communityId?: string;
  onSuccess?: () => void;
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
    },
  });

  const onOpenChange = props.onOpenChange ?? vi.fn();

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <WorkspaceProvider initialCommunityId={props.communityId ?? MOCK_COMMUNITY_1_ID}>
          <CreateWorkspaceDialog
            isOpen={props.isOpen ?? true}
            onOpenChange={onOpenChange}
            communityId={props.communityId ?? MOCK_COMMUNITY_1_ID}
            onSuccess={props.onSuccess}
          />
        </WorkspaceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("VS-09C: Starter Templates Picker UI (FEAT-D05a)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkspaceMockState();
  });

  describe("Template Catalog Presentation & Built-in Templates", () => {
    it("renders exactly the 3 canonical built-in templates from the catalog", async () => {
      renderCreateDialog();

      // Dialog opens
      expect(await screen.findByTestId("create-workspace-dialog")).toBeInTheDocument();

      // Wait for template cards to render
      expect(await screen.findByTestId("template-card-GENERAL_PURPOSE")).toBeInTheDocument();
      expect(screen.getByTestId("template-card-EVENT_PLANNING")).toBeInTheDocument();
      expect(screen.getByTestId("template-card-TEAM_OPERATIONS")).toBeInTheDocument();

      // Ensure no invented 4th template exists
      expect(screen.queryByTestId("template-card-BLANK")).not.toBeInTheDocument();

      // Verify canonical template names & badges
      expect(screen.getByText("General Workspace")).toBeInTheDocument();
      expect(screen.getByText("Recommended")).toBeInTheDocument();

      expect(screen.getByText("Event Planning")).toBeInTheDocument();
      expect(screen.getByText("Team Operations")).toBeInTheDocument();

      // Verify meaningful included features are displayed
      // Event Planning has 2 custom fields and timeline view
      const eventCard = screen.getByTestId("template-card-EVENT_PLANNING");
      expect(within(eventCard).getByText("2")).toBeInTheDocument();
      expect(within(eventCard).getByText(/custom fields/i)).toBeInTheDocument();
      expect(within(eventCard).getByText(/Planning board, Event calendar, Timeline/i)).toBeInTheDocument();
    });

    it("defaults selection to GENERAL_PURPOSE with unmistakable visual check state", async () => {
      renderCreateDialog();

      const generalCard = await screen.findByTestId("template-card-GENERAL_PURPOSE");
      expect(generalCard).toHaveAttribute("aria-checked", "true");
      expect(within(generalCard).getByText("Selected")).toBeInTheDocument();

      // Other cards are unselected
      expect(screen.getByTestId("template-card-EVENT_PLANNING")).toHaveAttribute("aria-checked", "false");
      expect(screen.getByTestId("template-card-TEAM_OPERATIONS")).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Template Selection & Keyboard Navigation", () => {
    it("selects a template on click and updates aria-checked and visual state", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      const eventCard = await screen.findByTestId("template-card-EVENT_PLANNING");
      expect(eventCard).toHaveAttribute("aria-checked", "false");

      await user.click(eventCard);

      expect(eventCard).toHaveAttribute("aria-checked", "true");
      expect(within(eventCard).getByText("Selected")).toBeInTheDocument();

      // General Purpose is now unselected
      expect(screen.getByTestId("template-card-GENERAL_PURPOSE")).toHaveAttribute("aria-checked", "false");
    });

    it("supports keyboard selection using Enter and Space keys", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      const opsCard = await screen.findByTestId("template-card-TEAM_OPERATIONS");
      expect(opsCard).toHaveAttribute("aria-checked", "false");

      opsCard.focus();
      expect(opsCard).toHaveFocus();

      // Press Enter to select TEAM_OPERATIONS
      await user.keyboard("{Enter}");
      expect(opsCard).toHaveAttribute("aria-checked", "true");

      // Press Space on GENERAL_PURPOSE
      const generalCard = screen.getByTestId("template-card-GENERAL_PURPOSE");
      generalCard.focus();
      await user.keyboard(" ");
      expect(generalCard).toHaveAttribute("aria-checked", "true");
      expect(opsCard).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Template Preview Modal & Policy Inspection", () => {
    it("opens template preview modal showing full workflow statuses, custom fields, and views", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      await screen.findByTestId("template-card-EVENT_PLANNING");
      const previewBtn = screen.getByTestId("template-preview-btn-EVENT_PLANNING");

      await user.click(previewBtn);

      const previewDialog = await screen.findByTestId("template-preview-dialog");
      expect(previewDialog).toBeInTheDocument();

      // Verifies DEC-OPEN-07 Policy Notice
      expect(
        within(previewDialog).getByText(/Configuration-Only Seeding/i)
      ).toBeInTheDocument();
      expect(
        within(previewDialog).getByText(/never creates sample tasks, assignees, watchers/i)
      ).toBeInTheDocument();

      // Workflow statuses listed
      expect(within(previewDialog).getByText("Included Workflow Statuses (4)")).toBeInTheDocument();
      expect(within(previewDialog).getByText("Backlog")).toBeInTheDocument();
      expect(within(previewDialog).getByText("To do")).toBeInTheDocument();

      // Custom fields listed
      expect(within(previewDialog).getByText("Custom Field Definitions (2)")).toBeInTheDocument();
      expect(within(previewDialog).getByText("Event date")).toBeInTheDocument();
      expect(within(previewDialog).getByText("Workstream")).toBeInTheDocument();
      expect(within(previewDialog).getByText("Logistics")).toBeInTheDocument();

      // Default views listed
      expect(within(previewDialog).getByText("Default Shared Views (3)")).toBeInTheDocument();
      expect(within(previewDialog).getByText("Timeline")).toBeInTheDocument();

      // Close modal
      const closeBtn = within(previewDialog).getByTestId("preview-close-button");
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("template-preview-dialog")).not.toBeInTheDocument();
      });
    });

    it("applies template from within preview modal", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      await screen.findByTestId("template-card-TEAM_OPERATIONS");
      const previewBtn = screen.getByTestId("template-preview-btn-TEAM_OPERATIONS");
      await user.click(previewBtn);

      const previewDialog = await screen.findByTestId("template-preview-dialog");
      const applyBtn = within(previewDialog).getByTestId("preview-apply-button");
      expect(applyBtn).toHaveTextContent("Use This Template");

      await user.click(applyBtn);

      // Preview closes
      await waitFor(() => {
        expect(screen.queryByTestId("template-preview-dialog")).not.toBeInTheDocument();
      });

      // TEAM_OPERATIONS is now selected
      expect(screen.getByTestId("template-card-TEAM_OPERATIONS")).toHaveAttribute("aria-checked", "true");
    });

    it("preserves workspace creation details when navigating between selection and preview", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      // 1. Enter details in creation form
      const nameInput = await screen.findByTestId("workspace-name-input");
      await user.type(nameInput, "Spring Arts Festival 2027");

      const personalTypeBtn = screen.getByTestId("workspace-kind-personal");
      await user.click(personalTypeBtn);

      const prefixInput = screen.getByTestId("workspace-prefix-input");
      await user.type(prefixInput, "FEST");

      // 2. Open template preview
      const previewBtn = screen.getByTestId("template-preview-btn-EVENT_PLANNING");
      await user.click(previewBtn);

      expect(await screen.findByTestId("template-preview-dialog")).toBeInTheDocument();

      // 3. Close template preview
      const closeBtn = screen.getByTestId("preview-close-button");
      await user.click(closeBtn);

      await waitFor(() => {
        expect(screen.queryByTestId("template-preview-dialog")).not.toBeInTheDocument();
      });

      // 4. Verify all inputs are preserved exactly
      expect(screen.getByTestId("workspace-name-input")).toHaveValue("Spring Arts Festival 2027");
      expect(screen.getByTestId("workspace-prefix-input")).toHaveValue("FEST");
    });
  });

  describe("Form Validation & Submission", () => {
    it("validates required name field and prevents submission when empty", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      const submitBtn = await screen.findByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      expect(await screen.findByText("Workspace name is required.")).toBeInTheDocument();
    });

    it("validates key prefix format according to contract regex ^[A-Z][A-Z0-9]{1,9}$", async () => {
      const user = userEvent.setup();
      renderCreateDialog();

      const nameInput = await screen.findByTestId("workspace-name-input");
      await user.type(nameInput, "Alpha Team Workspace");

      const prefixInput = screen.getByTestId("workspace-prefix-input");
      await user.type(prefixInput, "123");

      const submitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      expect(
        await screen.findByText(/Prefix must be 2-10 uppercase alphanumeric characters starting with a letter/i)
      ).toBeInTheDocument();
    });

    it("submits the correct templateKey in CreateWorkspaceRequest and invokes onSuccess", async () => {
      const user = userEvent.setup();
      const onSuccessSpy = vi.fn();
      const apiSpy = vi.spyOn(workspaceApi, "createWorkspaceApi");

      renderCreateDialog({ onSuccess: onSuccessSpy });

      // Enter valid form data
      const nameInput = await screen.findByTestId("workspace-name-input");
      await user.type(nameInput, "Operations & Facilities");

      const prefixInput = screen.getByTestId("workspace-prefix-input");
      await user.type(prefixInput, "OPS");

      // Select Team Operations template
      const opsCard = screen.getByTestId("template-card-TEAM_OPERATIONS");
      await user.click(opsCard);

      // Submit
      const submitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiSpy).toHaveBeenCalledWith(
          MOCK_COMMUNITY_1_ID,
          {
            name: "Operations & Facilities",
            kind: "SHARED",
            keyPrefix: "OPS",
            maxSubtaskDepth: 1,
            templateKey: "TEAM_OPERATIONS",
          },
          "mock-csrf-token"
        );
      });

      await waitFor(() => {
        expect(onSuccessSpy).toHaveBeenCalled();
      });
    });

    it("submits default GENERAL_PURPOSE when user does not change template selection", async () => {
      const user = userEvent.setup();
      const apiSpy = vi.spyOn(workspaceApi, "createWorkspaceApi");

      renderCreateDialog();

      const nameInput = await screen.findByTestId("workspace-name-input");
      await user.type(nameInput, "General Purpose Team");

      const submitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      await waitFor(() => {
        expect(apiSpy).toHaveBeenCalledWith(
          MOCK_COMMUNITY_1_ID,
          expect.objectContaining({
            name: "General Purpose Team",
            templateKey: "GENERAL_PURPOSE",
          }),
          "mock-csrf-token"
        );
      });
    });
  });

  describe("Error Recovery & Edge Cases", () => {
    it("displays error alert and retry button when template catalog fetch fails", async () => {
      const user = userEvent.setup();
      setMockTemplatesError({
        status: 500,
        problem: {
          type: "https://errors.sonder.platform/internal-error",
          title: "Template Service Unavailable",
          status: 500,
          detail: "Failed to load template definitions from catalog database.",
          code: "TEMPLATE_CATALOG_UNAVAILABLE",
        },
      });

      renderCreateDialog();

      expect(
        await screen.findByText(/Failed to load template catalog/i)
      ).toBeInTheDocument();

      const retryBtn = screen.getByRole("button", { name: /retry loading templates/i });
      expect(retryBtn).toBeInTheDocument();

      // Reset error and click retry
      resetWorkspaceMockState();
      await user.click(retryBtn);

      // Successfully loads catalog
      expect(await screen.findByTestId("template-card-GENERAL_PURPOSE")).toBeInTheDocument();
    });

    it("displays creation error alert when backend rejects submission without clearing inputs", async () => {
      const user = userEvent.setup();
      setMockCreateWorkspaceError({
        status: 409,
        problem: {
          type: "https://errors.sonder.platform/conflict",
          title: "Prefix Already In Use",
          status: 409,
          detail: "Task key prefix ENG is already registered in this community.",
          code: "KEY_PREFIX_CONFLICT",
        },
      });

      renderCreateDialog();

      const nameInput = await screen.findByTestId("workspace-name-input");
      await user.type(nameInput, "Conflicting Space");

      const prefixInput = screen.getByTestId("workspace-prefix-input");
      await user.type(prefixInput, "ENG");

      const submitBtn = screen.getByTestId("create-workspace-submit-btn");
      await user.click(submitBtn);

      expect(await screen.findByText(/Task key prefix ENG is already registered/i)).toBeInTheDocument();

      // Form values remain preserved for user correction
      expect(screen.getByTestId("workspace-name-input")).toHaveValue("Conflicting Space");
      expect(screen.getByTestId("workspace-prefix-input")).toHaveValue("ENG");
    });
  });

  describe("Integration with Workspace Switcher and Mobile Selector", () => {
    it("opens CreateWorkspaceDialog from WorkspaceSwitcher trigger button", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID}>
              <WorkspaceSwitcher />
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Open WorkspaceSwitcher popover
      const trigger = screen.getByLabelText(/select a workspace/i);
      await user.click(trigger);

      // Click Create Workspace button
      const createTrigger = await screen.findByTestId("create-workspace-trigger");
      await user.click(createTrigger);

      // CreateWorkspaceDialog opens
      expect(await screen.findByTestId("create-workspace-dialog")).toBeInTheDocument();
    });

    it("opens CreateWorkspaceDialog from MobileWorkspaceSelector trigger button", async () => {
      const user = userEvent.setup();
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 0 } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={mockAuthValue}>
            <WorkspaceProvider initialCommunityId={MOCK_COMMUNITY_1_ID}>
              <MobileWorkspaceSelector />
            </WorkspaceProvider>
          </AuthContext.Provider>
        </QueryClientProvider>
      );

      // Expand mobile selector
      const toggle = screen.getByText(/select workspace/i);
      await user.click(toggle);

      // Click Mobile Create New Workspace button
      const mobileCreateBtn = await screen.findByTestId("mobile-create-workspace-trigger");
      await user.click(mobileCreateBtn);

      // CreateWorkspaceDialog opens
      expect(await screen.findByTestId("create-workspace-dialog")).toBeInTheDocument();
    });
  });
});

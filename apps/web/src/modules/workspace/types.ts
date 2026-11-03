import type { ApiSchema } from "@sonder/contracts";

export type WorkspaceDto = ApiSchema<"WorkspaceDto">;
export type WorkspaceListDto = ApiSchema<"WorkspaceListDto">;
export type WorkspaceKind = ApiSchema<"WorkspaceKind">;
export type ActiveCommunityDto = ApiSchema<"ActiveCommunityDto">;
export type SetActiveCommunityRequest = ApiSchema<"SetActiveCommunityRequest">;
export type CommunityMembershipDto = ApiSchema<"CommunityMembershipDto">;

export type WorkspaceRole = NonNullable<WorkspaceDto["myRole"]>;

export interface WorkspaceContextValue {
  /** The currently active Community ID (null if unselected) */
  currentCommunityId: string | null;
  /** Community metadata matching currentCommunityId */
  currentCommunity: CommunityMembershipDto | null;
  /** All communities the user belongs to */
  communities: CommunityMembershipDto[];
  /** The currently active Workspace ID (null if unselected) */
  activeWorkspaceId: string | null;
  /** Full DTO for the currently active workspace */
  activeWorkspace: WorkspaceDto | null;
  /** All visible workspaces in the current community */
  workspaces: WorkspaceDto[];
  /** The user's Personal Workspace in the current community (null if none) */
  personalWorkspace: WorkspaceDto | null;
  /** Shared workspaces visible to the user in the current community */
  sharedWorkspaces: WorkspaceDto[];
  /** Loading status of the workspace catalog */
  isLoading: boolean;
  /** Error state for workspace catalog query */
  error: Error | null;
  /** Refetches the workspace catalog for the current community */
  refetchWorkspaces: () => Promise<void>;
  /** Explicitly select a workspace by ID */
  selectWorkspace: (workspaceId: string) => void;
  /** Select and switch active community via contract endpoint */
  selectCommunity: (communityId: string) => Promise<void>;
  /** Loading status of community switch mutation */
  isSwitchingCommunity: boolean;
  /** Error message if community switch mutation fails */
  communitySwitchError: string | null;
}

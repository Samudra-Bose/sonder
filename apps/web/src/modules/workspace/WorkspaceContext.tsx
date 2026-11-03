import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth";
import { fetchWorkspaces, setActiveCommunityApi } from "./api";
import type {
  WorkspaceDto,
  CommunityMembershipDto,
  WorkspaceContextValue,
} from "./types";

export const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(
  undefined
);

export interface WorkspaceProviderProps {
  children: React.ReactNode;
  /** Optional initial community ID for testing or route hydration */
  initialCommunityId?: string | null;
  /** Optional initial workspace ID for testing or route hydration */
  initialWorkspaceId?: string | null;
}

export function WorkspaceProvider({
  children,
  initialCommunityId = null,
  initialWorkspaceId = null,
}: WorkspaceProviderProps): React.JSX.Element {
  const { communities, csrfToken } = useAuth();
  const queryClient = useQueryClient();

  // Active community context. Respects "No blind index-0 assumption":
  // Uses initial prop, stored explicit selection, or single membership.
  const [currentCommunityId, setCurrentCommunityId] = useState<string | null>(
    () => {
      if (initialCommunityId) return initialCommunityId;
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("sonder-active-community-id");
          if (stored && communities.some((c) => c.communityId === stored)) {
            return stored;
          }
        } catch {
          // Storage sandbox
        }
      }
      if (communities.length === 1 && communities[0]) {
        return communities[0].communityId;
      }
      return null;
    }
  );

  // Synchronize when communities load if exactly 1 community or matches stored
  useEffect(() => {
    if (!currentCommunityId) {
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("sonder-active-community-id");
          if (stored && communities.some((c) => c.communityId === stored)) {
            setCurrentCommunityId(stored);
            return;
          }
        } catch {
          // Ignore
        }
      }
      if (communities.length === 1 && communities[0]) {
        setCurrentCommunityId(communities[0].communityId);
      }
    }
  }, [communities, currentCommunityId]);

  // Active workspace context. Never blindly assumes workspaces[0] is active.
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    initialWorkspaceId
  );

  const [isSwitchingCommunity, setIsSwitchingCommunity] = useState(false);
  const [communitySwitchError, setCommunitySwitchError] = useState<string | null>(
    null
  );

  // Fetch workspaces visible to caller in the active community
  const {
    data: workspaceListData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["communities", currentCommunityId, "workspaces"],
    queryFn: () => {
      if (!currentCommunityId) {
        return Promise.resolve({ items: [], nextCursor: null });
      }
      return fetchWorkspaces(currentCommunityId);
    },
    enabled: !!currentCommunityId,
    staleTime: 1000 * 60 * 5,
  });

  const workspaces = useMemo<WorkspaceDto[]>(
    () => workspaceListData?.items ?? [],
    [workspaceListData]
  );

  // Derived collections
  const personalWorkspace = useMemo<WorkspaceDto | null>(
    () => workspaces.find((w) => w.kind === "PERSONAL") ?? null,
    [workspaces]
  );

  const sharedWorkspaces = useMemo<WorkspaceDto[]>(
    () => workspaces.filter((w) => w.kind === "SHARED"),
    [workspaces]
  );

  const activeWorkspace = useMemo<WorkspaceDto | null>(() => {
    if (!activeWorkspaceId) return null;
    return workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
  }, [workspaces, activeWorkspaceId]);

  const currentCommunity = useMemo<CommunityMembershipDto | null>(() => {
    if (!currentCommunityId) return null;
    return (
      communities.find((c) => c.communityId === currentCommunityId) ?? null
    );
  }, [communities, currentCommunityId]);

  // Select workspace handler
  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      const exists = workspaces.some((w) => w.id === workspaceId);
      if (exists) {
        setActiveWorkspaceId(workspaceId);
      }
    },
    [workspaces]
  );

  // Select community handler with contract mutation and cache isolation
  const selectCommunity = useCallback(
    async (communityId: string): Promise<void> => {
      if (communityId === currentCommunityId) return;

      setIsSwitchingCommunity(true);
      setCommunitySwitchError(null);

      try {
        if (!csrfToken) {
          throw new Error("Missing CSRF token for community switch mutation.");
        }

        // Call contract endpoint PUT /api/v1/me/active-community
        await setActiveCommunityApi(communityId, csrfToken);

        // Clear active workspace so previous-community data cannot leak
        setActiveWorkspaceId(null);
        setCurrentCommunityId(communityId);
        try {
          window.localStorage.setItem("sonder-active-community-id", communityId);
        } catch {
          // Ignore
        }

        // Invalidate and refetch query cache for new community
        await queryClient.invalidateQueries({
          queryKey: ["communities", communityId, "workspaces"],
        });
      } catch (err) {
        const msg =
          (err as Error).message || "Failed to switch active community.";
        setCommunitySwitchError(msg);
        throw err;
      } finally {
        setIsSwitchingCommunity(false);
      }
    },
    [currentCommunityId, csrfToken, queryClient]
  );

  const refetchWorkspaces = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      currentCommunityId,
      currentCommunity,
      communities,
      activeWorkspaceId,
      activeWorkspace,
      workspaces,
      personalWorkspace,
      sharedWorkspaces,
      isLoading,
      error: (error as Error) ?? null,
      refetchWorkspaces,
      selectWorkspace,
      selectCommunity,
      isSwitchingCommunity,
      communitySwitchError,
    }),
    [
      currentCommunityId,
      currentCommunity,
      communities,
      activeWorkspaceId,
      activeWorkspace,
      workspaces,
      personalWorkspace,
      sharedWorkspaces,
      isLoading,
      error,
      refetchWorkspaces,
      selectWorkspace,
      selectCommunity,
      isSwitchingCommunity,
      communitySwitchError,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}

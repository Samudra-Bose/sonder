import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/useAuth.js";
import {
  fetchWorkspaceSettings,
  updateWorkspaceSettingsApi,
  fetchWorkspaceMembers,
} from "./api.js";
import type { UpdateWorkspaceSettingsRequest } from "./types.js";

export function useWorkspaceSettings(
  communityId: string | null | undefined,
  workspaceId: string | null | undefined
) {
  return useQuery({
    queryKey: ["communities", communityId, "workspaces", workspaceId, "settings"],
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      return fetchWorkspaceSettings(communityId, workspaceId);
    },
    enabled: Boolean(communityId && workspaceId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUpdateWorkspaceSettings(
  communityId: string | null | undefined,
  workspaceId: string | null | undefined
) {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateWorkspaceSettingsRequest) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token required.");
      }
      return updateWorkspaceSettingsApi(communityId, workspaceId, data, csrfToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces"],
      });
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "settings"],
      });
    },
  });
}

export function useWorkspaceMembers(
  communityId: string | null | undefined,
  workspaceId: string | null | undefined
) {
  return useQuery({
    queryKey: ["communities", communityId, "workspaces", workspaceId, "members"],
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        return { items: [], nextCursor: null };
      }
      return fetchWorkspaceMembers(communityId, workspaceId);
    },
    enabled: Boolean(communityId && workspaceId),
    staleTime: 1000 * 60 * 2,
  });
}

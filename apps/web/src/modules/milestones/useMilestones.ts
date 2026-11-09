import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/index.js";
import {
  fetchMilestones,
  createMilestoneApi,
  updateMilestoneApi,
  deleteMilestoneApi,
} from "./api.js";
import type {
  MilestoneDto,
  MilestoneListDto,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
} from "./types.js";

export const milestonesQueryKey = (
  communityId: string,
  workspaceId: string
): [string, string, string] => ["milestones", communityId, workspaceId];

export interface UseMilestonesOptions {
  enabled?: boolean;
}

/**
 * Hook to fetch workspace milestones.
 * Milestones are workspace-level markers, excluded from task counts and snapshots.
 */
export function useMilestones(
  communityId?: string | null,
  workspaceId?: string | null,
  options: UseMilestonesOptions = {}
): UseQueryResult<MilestoneListDto, Error> {
  const isEnabled = Boolean(communityId && workspaceId && (options.enabled ?? true));

  return useQuery({
    queryKey: milestonesQueryKey(communityId ?? "", workspaceId ?? ""),
    queryFn: () => {
      if (!communityId || !workspaceId) {
        throw new Error("Cannot fetch milestones: missing communityId or workspaceId");
      }
      return fetchMilestones({ communityId, workspaceId });
    },
    enabled: isEnabled,
    staleTime: 60 * 1000,
  });
}

export interface CreateMilestoneVariables {
  communityId: string;
  workspaceId: string;
  data: CreateMilestoneRequest;
}

/**
 * Hook to create a workspace milestone.
 * Requires active CSRF token.
 */
export function useCreateMilestone(): UseMutationResult<
  MilestoneDto,
  Error,
  CreateMilestoneVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, data }: CreateMilestoneVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot create milestone: CSRF token is not initialized.");
      }
      return createMilestoneApi({
        communityId,
        workspaceId,
        data,
        csrfToken,
      });
    },
    onSuccess: (_newMilestone, { communityId, workspaceId }) => {
      // Invalidate milestones list
      queryClient.invalidateQueries({
        queryKey: milestonesQueryKey(communityId, workspaceId),
      });
    },
  });
}

export interface UpdateMilestoneVariables {
  communityId: string;
  workspaceId: string;
  milestoneId: string;
  data: UpdateMilestoneRequest;
}

/**
 * Hook to update a workspace milestone.
 * Requires active CSRF token.
 */
export function useUpdateMilestone(): UseMutationResult<
  MilestoneDto,
  Error,
  UpdateMilestoneVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, milestoneId, data }: UpdateMilestoneVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot update milestone: CSRF token is not initialized.");
      }
      return updateMilestoneApi({
        communityId,
        workspaceId,
        milestoneId,
        data,
        csrfToken,
      });
    },
    onSuccess: (_updatedMilestone, { communityId, workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: milestonesQueryKey(communityId, workspaceId),
      });
      // Invalidate workspace tasks in case milestone name changes affect task displays
      queryClient.invalidateQueries({
        queryKey: ["workspace-tasks", communityId, workspaceId],
      });
    },
  });
}

export interface DeleteMilestoneVariables {
  communityId: string;
  workspaceId: string;
  milestoneId: string;
}

/**
 * Hook to delete a workspace milestone.
 * Deleting a milestone clears milestoneId references on linked tasks on the server.
 */
export function useDeleteMilestone(): UseMutationResult<
  void,
  Error,
  DeleteMilestoneVariables
> {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({ communityId, workspaceId, milestoneId }: DeleteMilestoneVariables) => {
      if (!csrfToken) {
        throw new Error("Cannot delete milestone: CSRF token is not initialized.");
      }
      return deleteMilestoneApi({
        communityId,
        workspaceId,
        milestoneId,
        csrfToken,
      });
    },
    onSuccess: (_, { communityId, workspaceId }) => {
      queryClient.invalidateQueries({
        queryKey: milestonesQueryKey(communityId, workspaceId),
      });
      // Server clears milestoneId on linked tasks, so invalidate tasks cache
      queryClient.invalidateQueries({
        queryKey: ["workspace-tasks", communityId, workspaceId],
      });
    },
  });
}

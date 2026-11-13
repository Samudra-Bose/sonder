import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/modules/auth/useAuth.js";
import {
  fetchCustomFields,
  createCustomFieldApi,
  updateCustomFieldApi,
  archiveCustomFieldApi,
  createCustomFieldOptionApi,
} from "./api.js";
import type {
  CreateCustomFieldDefinitionRequest,
  UpdateCustomFieldDefinitionRequest,
} from "./types.js";

export function useCustomFields(communityId: string | null | undefined, workspaceId: string | null | undefined) {
  return useQuery({
    queryKey: ["communities", communityId, "workspaces", workspaceId, "custom-fields"],
    queryFn: async () => {
      if (!communityId || !workspaceId) {
        return { items: [] };
      }
      return fetchCustomFields(communityId, workspaceId);
    },
    enabled: Boolean(communityId && workspaceId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateCustomField(communityId: string | null | undefined, workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCustomFieldDefinitionRequest) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token required.");
      }
      return createCustomFieldApi(communityId, workspaceId, data, csrfToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "custom-fields"],
      });
    },
  });
}

export function useUpdateCustomField(communityId: string | null | undefined, workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      fieldId,
      data,
    }: {
      fieldId: string;
      data: UpdateCustomFieldDefinitionRequest;
    }) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token required.");
      }
      return updateCustomFieldApi(communityId, workspaceId, fieldId, data, csrfToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "custom-fields"],
      });
    },
  });
}

export function useArchiveCustomField(communityId: string | null | undefined, workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      fieldId,
      baseVersion,
    }: {
      fieldId: string;
      baseVersion: number;
    }) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token required.");
      }
      return archiveCustomFieldApi(communityId, workspaceId, fieldId, baseVersion, csrfToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "custom-fields"],
      });
    },
  });
}

export function useCreateCustomFieldOption(communityId: string | null | undefined, workspaceId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { csrfToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      fieldId,
      label,
    }: {
      fieldId: string;
      label: string;
    }) => {
      if (!communityId || !workspaceId) {
        throw new Error("Community ID and Workspace ID are required.");
      }
      if (!csrfToken) {
        throw new Error("CSRF token required.");
      }
      return createCustomFieldOptionApi(communityId, workspaceId, fieldId, label, csrfToken);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces", workspaceId, "custom-fields"],
      });
    },
  });
}

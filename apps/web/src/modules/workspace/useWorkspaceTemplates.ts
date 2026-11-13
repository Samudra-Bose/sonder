import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceTemplates } from "./api";
import type { WorkspaceTemplateDto } from "./types";

export function useWorkspaceTemplates(communityId: string | null | undefined) {
  return useQuery({
    queryKey: ["communities", communityId, "workspace-templates"],
    queryFn: async (): Promise<WorkspaceTemplateDto[]> => {
      if (!communityId) {
        throw new Error("communityId is required to fetch workspace templates");
      }
      const response = await fetchWorkspaceTemplates(communityId);
      return response.items;
    },
    enabled: Boolean(communityId),
    staleTime: 1000 * 60 * 30, // 30 minutes; template catalog is static
  });
}

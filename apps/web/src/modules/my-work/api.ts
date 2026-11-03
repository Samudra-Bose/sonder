import { apiRequest } from "@/lib/api-client";
import type { MyWorkQuerySpec, MyWorkQueryResult } from "./types";

export interface QueryMyWorkOptions {
  communityId: string;
  spec?: Partial<MyWorkQuerySpec>;
  csrfToken?: string | null;
}

/**
 * Executes a cross-workspace My Work query for an authorized community.
 * Contract: POST /api/v1/communities/{communityId}/my-work/query
 */
export async function queryMyWorkApi({
  communityId,
  spec = {},
  csrfToken,
}: QueryMyWorkOptions): Promise<MyWorkQueryResult> {
  const defaultSpec: MyWorkQuerySpec = {
    includePersonalWorkspace: true,
    includeSharedWorkspaces: true,
    filter: {
      conjunction: "AND",
      conditions: [],
    },
    groupBy: "none",
    subGroupBy: "none",
    subtaskMode: "NESTED",
    includeBacklog: true,
    includeCompleted: false,
    ...spec,
  };

  return apiRequest<MyWorkQueryResult>(
    `/communities/${encodeURIComponent(communityId)}/my-work/query`,
    {
      method: "POST",
      body: JSON.stringify(defaultSpec),
      csrfToken,
    }
  );
}

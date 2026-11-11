import { useMutation, useQueryClient } from "@tanstack/react-query";
import { archiveTask, restoreTask } from "./api.js";
import { taskQueryKey } from "./useTask.js";
import type { TaskDto, ArchiveTaskResultDto, TaskQueryResult } from "./types.js";

export interface QueryMembershipAnchor {
  existed: boolean;
  recordedIndex: number;
  prevTaskId: string | null;
  nextTaskId: string | null;
}

export interface ArchiveTaskVariables {
  task: TaskDto;
  reason?: string;
  communityId?: string;
  workspaceId?: string;
}

export interface RestoreTaskVariables {
  task: TaskDto;
  undoToken: string;
  queryMemberships?: Map<string, QueryMembershipAnchor>;
  communityId?: string;
  workspaceId?: string;
}

export interface ArchiveTaskContext {
  taskSnapshot: TaskDto;
  queryMemberships: Map<string, QueryMembershipAnchor>;
  singleTaskSnapshot?: TaskDto;
  effectiveCommunityId: string;
  effectiveWorkspaceId: string;
}

export interface RestoreTaskContext {
  taskSnapshot: TaskDto;
  queryMemberships: Map<string, QueryMembershipAnchor>;
  singleTaskSnapshot?: TaskDto;
  effectiveCommunityId: string;
  effectiveWorkspaceId: string;
}

export interface UseArchiveTaskOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  csrfToken?: string;
  onSuccess?: (result: ArchiveTaskResultDto, context: ArchiveTaskContext) => void;
  onError?: (error: Error, variables: ArchiveTaskVariables, context?: ArchiveTaskContext) => void;
}

export interface UseRestoreTaskOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  csrfToken?: string;
  onSuccess?: (restoredTask: TaskDto, context: RestoreTaskContext) => void;
  onError?: (error: Error, variables: RestoreTaskVariables, context?: RestoreTaskContext) => void;
}

/**
 * Hook providing single-item task archive mutation with:
 * - Multi-view query cache membership tracking across List, Board, Calendar, Timeline
 * - Stable neighbor anchor tracking (prevTaskId, nextTaskId)
 * - Surgical rollback preserving concurrent changes to other tasks
 */
export function useArchiveTask({
  communityId,
  workspaceId,
  csrfToken,
  onSuccess,
  onError,
}: UseArchiveTaskOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<
    ArchiveTaskResultDto,
    Error,
    ArchiveTaskVariables,
    ArchiveTaskContext
  >({
    mutationFn: async ({ task, reason, communityId: varCommId, workspaceId: varWsId }) => {
      const commId = varCommId || communityId;
      const wsId = varWsId || workspaceId || task.workspaceId;
      if (!commId || !wsId) {
        throw new Error("Missing communityId or workspaceId for archiveTask.");
      }
      return archiveTask({
        communityId: commId,
        workspaceId: wsId,
        taskId: task.id,
        reason,
        csrfToken,
      });
    },
    onMutate: async ({ task, communityId: varCommId, workspaceId: varWsId }) => {
      const effCommId = varCommId || communityId;
      const effWsId = varWsId || workspaceId || task.workspaceId;
      if (!effCommId || !effWsId) {
        throw new Error("Missing context parameters for optimistic archive.");
      }

      const queryPrefix = [
        "communities",
        effCommId,
        "workspaces",
        effWsId,
        "tasks",
        "query",
      ] as const;

      await queryClient.cancelQueries({ queryKey: queryPrefix });

      const singleKey = taskQueryKey(effCommId, effWsId, task.id);
      await queryClient.cancelQueries({ queryKey: singleKey });
      const singleTaskSnapshot = queryClient.getQueryData<TaskDto>(singleKey);

      // Track membership independently per query
      const queryMemberships = new Map<string, QueryMembershipAnchor>();
      const matchingQueries = queryClient.getQueriesData<TaskQueryResult>({
        queryKey: queryPrefix,
      });

      for (const [queryKey, data] of matchingQueries) {
        const keyJson = JSON.stringify(queryKey);
        if (!data) {
          queryMemberships.set(keyJson, {
            existed: false,
            recordedIndex: -1,
            prevTaskId: null,
            nextTaskId: null,
          });
          continue;
        }

        let existed = false;
        let index = -1;
        let prevTaskId: string | null = null;
        let nextTaskId: string | null = null;

        if (Array.isArray(data.items)) {
          index = data.items.findIndex((t) => t.id === task.id);
          if (index !== -1) {
            existed = true;
            prevTaskId = index > 0 ? data.items[index - 1]?.id ?? null : null;
            nextTaskId =
              index >= 0 && index < data.items.length - 1
                ? data.items[index + 1]?.id ?? null
                : null;
          }
        }

        if (!existed && Array.isArray(data.groups)) {
          for (const group of data.groups) {
            if (Array.isArray(group.items)) {
              const gIdx = group.items.findIndex((t) => t.id === task.id);
              if (gIdx !== -1) {
                existed = true;
                index = gIdx;
                prevTaskId = gIdx > 0 ? group.items[gIdx - 1]?.id ?? null : null;
                nextTaskId =
                  gIdx < group.items.length - 1
                    ? group.items[gIdx + 1]?.id ?? null
                    : null;
                break;
              }
            }
          }
        }

        queryMemberships.set(keyJson, {
          existed,
          recordedIndex: index,
          prevTaskId,
          nextTaskId,
        });

        if (existed) {
          queryClient.setQueryData<TaskQueryResult>(queryKey, (old) => {
            if (!old) return old;
            const filteredItems = Array.isArray(old.items)
              ? old.items.filter((t) => t.id !== task.id)
              : old.items;

            const filteredGroups = Array.isArray(old.groups)
              ? old.groups.map((group) => {
                  if (!Array.isArray(group.items)) return group;
                  const gItems = group.items.filter((t) => t.id !== task.id);
                  const countDiff = group.items.length - gItems.length;
                  return {
                    ...group,
                    items: gItems,
                    total: Math.max(0, group.total - countDiff),
                  };
                })
              : old.groups;

            return {
              ...old,
              items: filteredItems,
              groups: filteredGroups,
              primaryCount: Math.max(0, (old.primaryCount ?? 0) - 1),
              total: Math.max(0, (old.total ?? 0) - 1),
            };
          });
        }
      }

      // Optimistically mark single task detail query as ARCHIVED
      if (singleTaskSnapshot) {
        queryClient.setQueryData<TaskDto>(singleKey, {
          ...singleTaskSnapshot,
          archivedAt: new Date().toISOString(),
        });
      }

      return {
        taskSnapshot: task,
        queryMemberships,
        singleTaskSnapshot,
        effectiveCommunityId: effCommId,
        effectiveWorkspaceId: effWsId,
      };
    },
    onError: (err, variables, context) => {
      if (!context) return;

      const { taskSnapshot, queryMemberships, singleTaskSnapshot, effectiveCommunityId, effectiveWorkspaceId } = context;

      // Surgical rollback: re-insert target task ONLY into queries where it previously existed
      queryMemberships.forEach((anchor, keyJson) => {
        if (!anchor.existed) return;
        try {
          const queryKey = JSON.parse(keyJson);
          queryClient.setQueryData<TaskQueryResult>(queryKey, (old) => {
            if (!old || !Array.isArray(old.items)) return old;
            if (old.items.some((t) => t.id === taskSnapshot.id)) return old;

            const newItems = [...old.items];
            let inserted = false;
            let needsRefetch = false;

            // 1. Anchor after prevTaskId
            if (anchor.prevTaskId) {
              const prevIdx = newItems.findIndex((t) => t.id === anchor.prevTaskId);
              if (prevIdx !== -1) {
                newItems.splice(prevIdx + 1, 0, taskSnapshot);
                inserted = true;
              }
            }

            // 2. Anchor before nextTaskId
            if (!inserted && anchor.nextTaskId) {
              const nextIdx = newItems.findIndex((t) => t.id === anchor.nextTaskId);
              if (nextIdx !== -1) {
                newItems.splice(nextIdx, 0, taskSnapshot);
                inserted = true;
              }
            }

            // 3. Fallback to clamped index + refetch flag
            if (!inserted) {
              const targetIdx = Math.min(
                Math.max(0, anchor.recordedIndex),
                newItems.length
              );
              newItems.splice(targetIdx, 0, taskSnapshot);
              needsRefetch = true;
            }

            if (needsRefetch) {
              queryClient.invalidateQueries({ queryKey });
            }

            const newGroups = Array.isArray(old.groups)
              ? old.groups.map((group) => {
                  if (group.key === taskSnapshot.statusCategory) {
                    if (group.items.some((t) => t.id === taskSnapshot.id)) return group;
                    return {
                      ...group,
                      items: [taskSnapshot, ...group.items],
                      total: group.total + 1,
                    };
                  }
                  return group;
                })
              : old.groups;

            return {
              ...old,
              items: newItems,
              groups: newGroups,
              primaryCount: (old.primaryCount ?? 0) + 1,
              total: (old.total ?? 0) + 1,
            };
          });
        } catch {
          // ignore parse errors
        }
      });

      // Restore single task detail query
      if (singleTaskSnapshot) {
        const singleKey = taskQueryKey(effectiveCommunityId, effectiveWorkspaceId, taskSnapshot.id);
        queryClient.setQueryData(singleKey, singleTaskSnapshot);
      }

      onError?.(err, variables, context);
    },
    onSuccess: (result, _variables, context) => {
      onSuccess?.(result, context);
    },
  });
}

/**
 * Hook providing task restoration mutation with:
 * - Re-insertion into query cache using stable neighbor anchors
 * - Re-eviction on restore failure
 * - Background invalidation ensuring exact server sorting on success
 */
export function useRestoreTask({
  communityId,
  workspaceId,
  csrfToken,
  onSuccess,
  onError,
}: UseRestoreTaskOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<
    TaskDto,
    Error,
    RestoreTaskVariables,
    RestoreTaskContext
  >({
    mutationFn: async ({ task, undoToken, communityId: varCommId, workspaceId: varWsId }) => {
      const commId = varCommId || communityId;
      const wsId = varWsId || workspaceId || task.workspaceId;
      if (!commId || !wsId) {
        throw new Error("Missing communityId or workspaceId for restoreTask.");
      }
      return restoreTask({
        communityId: commId,
        workspaceId: wsId,
        taskId: task.id,
        undoToken,
        csrfToken,
      });
    },
    onMutate: async ({ task, queryMemberships = new Map(), communityId: varCommId, workspaceId: varWsId }) => {
      const effCommId = varCommId || communityId;
      const effWsId = varWsId || workspaceId || task.workspaceId;
      if (!effCommId || !effWsId) {
        throw new Error("Missing context parameters for optimistic restore.");
      }

      const queryPrefix = [
        "communities",
        effCommId,
        "workspaces",
        effWsId,
        "tasks",
        "query",
      ] as const;

      await queryClient.cancelQueries({ queryKey: queryPrefix });
      const singleKey = taskQueryKey(effCommId, effWsId, task.id);
      await queryClient.cancelQueries({ queryKey: singleKey });
      const singleTaskSnapshot = queryClient.getQueryData<TaskDto>(singleKey);

      const optimisticRestored: TaskDto = {
        ...task,
        archivedAt: null,
      };

      // Optimistically restore into queries where it previously existed
      queryMemberships.forEach((anchor, keyJson) => {
        if (!anchor.existed) return;
        try {
          const queryKey = JSON.parse(keyJson);
          queryClient.setQueryData<TaskQueryResult>(queryKey, (old) => {
            if (!old || !Array.isArray(old.items)) return old;
            if (old.items.some((t) => t.id === task.id)) return old;

            const newItems = [...old.items];
            let inserted = false;

            if (anchor.prevTaskId) {
              const prevIdx = newItems.findIndex((t) => t.id === anchor.prevTaskId);
              if (prevIdx !== -1) {
                newItems.splice(prevIdx + 1, 0, optimisticRestored);
                inserted = true;
              }
            }

            if (!inserted && anchor.nextTaskId) {
              const nextIdx = newItems.findIndex((t) => t.id === anchor.nextTaskId);
              if (nextIdx !== -1) {
                newItems.splice(nextIdx, 0, optimisticRestored);
                inserted = true;
              }
            }

            if (!inserted) {
              const targetIdx = Math.min(
                Math.max(0, anchor.recordedIndex),
                newItems.length
              );
              newItems.splice(targetIdx, 0, optimisticRestored);
            }

            const newGroups = Array.isArray(old.groups)
              ? old.groups.map((group) => {
                  if (group.key === optimisticRestored.statusCategory) {
                    if (group.items.some((t) => t.id === optimisticRestored.id)) return group;
                    return {
                      ...group,
                      items: [optimisticRestored, ...group.items],
                      total: group.total + 1,
                    };
                  }
                  return group;
                })
              : old.groups;

            return {
              ...old,
              items: newItems,
              groups: newGroups,
              primaryCount: (old.primaryCount ?? 0) + 1,
              total: (old.total ?? 0) + 1,
            };
          });
        } catch {
          // ignore parse errors
        }
      });

      // Optimistically activate single task query
      queryClient.setQueryData<TaskDto>(singleKey, optimisticRestored);

      return {
        taskSnapshot: task,
        queryMemberships,
        singleTaskSnapshot,
        effectiveCommunityId: effCommId,
        effectiveWorkspaceId: effWsId,
      };
    },
    onError: (err, variables, context) => {
      if (!context) return;

      const { taskSnapshot, singleTaskSnapshot, effectiveCommunityId, effectiveWorkspaceId } = context;

      // Restore failure rollback: re-evict the task so it does NOT stay visible
      const queryPrefix = [
        "communities",
        effectiveCommunityId,
        "workspaces",
        effectiveWorkspaceId,
        "tasks",
        "query",
      ] as const;

      const matchingQueries = queryClient.getQueriesData<TaskQueryResult>({
        queryKey: queryPrefix,
      });

      for (const [queryKey, data] of matchingQueries) {
        if (!data) continue;
        const inItems = Array.isArray(data.items) && data.items.some((t) => t.id === taskSnapshot.id);
        const inGroups =
          Array.isArray(data.groups) &&
          data.groups.some((g) => Array.isArray(g.items) && g.items.some((t) => t.id === taskSnapshot.id));
        if (!inItems && !inGroups) continue;

        queryClient.setQueryData<TaskQueryResult>(queryKey, (old) => {
          if (!old) return old;
          const filteredItems = Array.isArray(old.items)
            ? old.items.filter((t) => t.id !== taskSnapshot.id)
            : old.items;

          const filteredGroups = Array.isArray(old.groups)
            ? old.groups.map((group) => {
                if (!Array.isArray(group.items)) return group;
                const gItems = group.items.filter((t) => t.id !== taskSnapshot.id);
                const countDiff = group.items.length - gItems.length;
                return {
                  ...group,
                  items: gItems,
                  total: Math.max(0, group.total - countDiff),
                };
              })
            : old.groups;

          return {
            ...old,
            items: filteredItems,
            groups: filteredGroups,
            primaryCount: Math.max(0, (old.primaryCount ?? 0) - 1),
            total: Math.max(0, (old.total ?? 0) - 1),
          };
        });
      }

      // Single task query remains ARCHIVED
      const singleKey = taskQueryKey(effectiveCommunityId, effectiveWorkspaceId, taskSnapshot.id);
      if (singleTaskSnapshot) {
        queryClient.setQueryData(singleKey, singleTaskSnapshot);
      } else {
        queryClient.setQueryData<TaskDto>(singleKey, {
          ...taskSnapshot,
          archivedAt: new Date().toISOString(),
        });
      }

      queryClient.invalidateQueries({ queryKey: queryPrefix });
      onError?.(err, variables, context);
    },
    onSuccess: (serverTask, _variables, context) => {
      const effCommId = context?.effectiveCommunityId || communityId;
      const effWsId = context?.effectiveWorkspaceId || workspaceId || serverTask.workspaceId;
      if (!effCommId || !effWsId) return;

      // Replace with authoritative server TaskDto in single-task query
      const singleKey = taskQueryKey(effCommId, effWsId, serverTask.id);
      queryClient.setQueryData(singleKey, serverTask);

      // Invalidate queries so authoritative server sorting and filtering take effect
      const queryPrefix = [
        "communities",
        effCommId,
        "workspaces",
        effWsId,
        "tasks",
        "query",
      ] as const;
      queryClient.invalidateQueries({ queryKey: queryPrefix });

      onSuccess?.(serverTask, context);
    },
  });
}

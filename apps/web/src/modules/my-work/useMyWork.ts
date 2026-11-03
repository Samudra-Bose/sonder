import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/modules/workspace";
import { useAuth } from "@/modules/auth";
import { queryMyWorkApi } from "./api";
import {
  processRawTasks,
  filterTasksByRelationship,
  groupTasksTemporally,
} from "./task-helpers";
import { getDefaultReferenceDate, type TemporalGroupKey } from "./date-utils";
import type {
  RelationshipFilter,
  MyWorkTaskItem,
  MyWorkSummary,
} from "./types";

export interface UseMyWorkOptions {
  referenceDate?: string;
}

export interface UseMyWorkResult {
  temporalGroups: Record<TemporalGroupKey, MyWorkTaskItem[]>;
  filteredTasks: MyWorkTaskItem[];
  allProcessedTasks: MyWorkTaskItem[];
  relationshipFilter: RelationshipFilter;
  setRelationshipFilter: (filter: RelationshipFilter) => void;
  summary: MyWorkSummary;
  referenceDate: string;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useMyWork({
  referenceDate: propReferenceDate,
}: UseMyWorkOptions = {}): UseMyWorkResult {
  const { currentCommunityId, workspaces } = useWorkspace();
  const { user, csrfToken } = useAuth();
  const [relationshipFilter, setRelationshipFilter] =
    useState<RelationshipFilter>("ALL");

  const referenceDate = useMemo(
    () => propReferenceDate || getDefaultReferenceDate(),
    [propReferenceDate]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["communities", currentCommunityId, "my-work"],
    queryFn: () => {
      if (!currentCommunityId) {
        return Promise.resolve({ items: [], total: 0, nextCursor: null });
      }
      return queryMyWorkApi({
        communityId: currentCommunityId,
        csrfToken,
      });
    },
    enabled: !!currentCommunityId && !!csrfToken,
    staleTime: 1000 * 60 * 2,
  });

  const rawTasks = useMemo(() => {
    return data?.items ?? [];
  }, [data]);

  // Process raw tasks: strict de-duplication by task ID, relationship derivation, workspace enrichment
  const allProcessedTasks = useMemo(() => {
    return processRawTasks(rawTasks, workspaces, user?.id ?? "", referenceDate);
  }, [rawTasks, workspaces, user?.id, referenceDate]);

  // Summary counts calculated from the unique, de-duplicated task set
  const summary = useMemo<MyWorkSummary>(() => {
    let assigned = 0;
    let created = 0;
    let watched = 0;

    for (const t of allProcessedTasks) {
      if (t.relationships.includes("ASSIGNED")) assigned++;
      if (t.relationships.includes("CREATED")) created++;
      if (t.relationships.includes("WATCHING")) watched++;
    }

    // Temporal counts for the currently filtered view
    const filtered = filterTasksByRelationship(allProcessedTasks, relationshipFilter);
    const groups = groupTasksTemporally(filtered);

    return {
      totalUnique: filtered.length,
      overdueCount: groups.overdue.length,
      dueTodayCount: groups.dueToday.length,
      upcomingCount: groups.upcoming.length,
      unscheduledCount: groups.unscheduled.length,
      assignedCount: assigned,
      createdCount: created,
      watchedCount: watched,
    };
  }, [allProcessedTasks, relationshipFilter]);

  // Filter tasks according to active relationship filter (ALL, ASSIGNED, CREATED, WATCHING)
  const filteredTasks = useMemo(() => {
    return filterTasksByRelationship(allProcessedTasks, relationshipFilter);
  }, [allProcessedTasks, relationshipFilter]);

  // Group tasks into the four approved temporal buckets
  const temporalGroups = useMemo(() => {
    return groupTasksTemporally(filteredTasks);
  }, [filteredTasks]);

  return {
    temporalGroups,
    filteredTasks,
    allProcessedTasks,
    relationshipFilter,
    setRelationshipFilter,
    summary,
    referenceDate,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}

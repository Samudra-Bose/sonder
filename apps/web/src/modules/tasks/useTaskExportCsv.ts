/**
 * Hook for Filtered View UTF-8 CSV Export (FEAT-J01a / VS-09F)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/modules/auth/index.js";
import {
  canExportTasks,
  fetchAllTasksForExport,
  generateTasksCsv,
  triggerCsvDownload,
} from "./taskExportCsv.js";
import type { ViewQuerySpec } from "./types.js";
import type { WorkspaceDto } from "@/modules/workspace/types.js";

export interface TaskExportFeedback {
  type: "success" | "error" | "info";
  message: string;
}

export interface UseTaskExportCsvOptions {
  communityId?: string | null;
  workspaceId?: string | null;
  activeWorkspace?: WorkspaceDto | null;
  workspaceSlug?: string;
  autoClearFeedbackMs?: number;
}

export interface UseTaskExportCsvReturn {
  isExporting: boolean;
  canExport: boolean;
  feedback: TaskExportFeedback | null;
  clearFeedback: () => void;
  exportFilteredTasksCsv: (querySpec: ViewQuerySpec) => Promise<boolean>;
}

export function useTaskExportCsv({
  communityId,
  workspaceId,
  activeWorkspace,
  workspaceSlug,
  autoClearFeedbackMs = 6000,
}: UseTaskExportCsvOptions): UseTaskExportCsvReturn {
  const { csrfToken } = useAuth();
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<TaskExportFeedback | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFeedback = useCallback(() => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedback(null);
  }, []);

  const setFeedbackWithAutoClear = useCallback(
    (newFeedback: TaskExportFeedback) => {
      clearFeedback();
      setFeedback(newFeedback);
      if (autoClearFeedbackMs > 0) {
        feedbackTimerRef.current = setTimeout(() => {
          setFeedback(null);
          feedbackTimerRef.current = null;
        }, autoClearFeedbackMs);
      }
    },
    [autoClearFeedbackMs, clearFeedback]
  );

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const canExport = canExportTasks(activeWorkspace);

  const exportFilteredTasksCsv = useCallback(
    async (querySpec: ViewQuerySpec): Promise<boolean> => {
      // Guard against concurrent invocations
      if (isExporting) return false;

      // Fail closed if workspace is not selected
      if (!communityId || !workspaceId) {
        setFeedbackWithAutoClear({
          type: "error",
          message: "Cannot export: workspace is not selected.",
        });
        return false;
      }

      // Permission check
      if (!canExport) {
        setFeedbackWithAutoClear({
          type: "error",
          message: "You do not have permission to export tasks from this workspace.",
        });
        return false;
      }

      setIsExporting(true);
      clearFeedback();

      try {
        const tasks = await fetchAllTasksForExport({
          communityId,
          workspaceId,
          querySpec,
          csrfToken: csrfToken ?? undefined,
        });

        if (tasks.length === 0) {
          setFeedbackWithAutoClear({
            type: "info",
            message: "No tasks matched the active filters to export.",
          });
          return true;
        }

        const csvContent = generateTasksCsv(tasks);
        const slug =
          workspaceSlug ||
          activeWorkspace?.keyPrefix?.toLowerCase() ||
          activeWorkspace?.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") ||
          workspaceId;
        const dateStr = new Date().toISOString().slice(0, 10);
        const filename = `tasks-export-${slug}-${dateStr}.csv`;

        triggerCsvDownload(csvContent, filename);

        setFeedbackWithAutoClear({
          type: "success",
          message: `Successfully exported ${tasks.length} ${
            tasks.length === 1 ? "task" : "tasks"
          } to CSV.`,
        });
        return true;
      } catch (error: unknown) {
        const err = error as { message?: string; detail?: string };
        const errorMessage =
          err?.detail || err?.message || "Failed to export tasks to CSV. Please try again.";
        setFeedbackWithAutoClear({
          type: "error",
          message: errorMessage,
        });
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    [
      isExporting,
      communityId,
      workspaceId,
      canExport,
      clearFeedback,
      setFeedbackWithAutoClear,
      csrfToken,
      workspaceSlug,
      activeWorkspace?.keyPrefix,
      activeWorkspace?.name,
    ]
  );

  return {
    isExporting,
    canExport,
    feedback,
    clearFeedback,
    exportFilteredTasksCsv,
  };
}

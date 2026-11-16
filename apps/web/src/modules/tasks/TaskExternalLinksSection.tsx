import React, { useState, useMemo } from "react";
import {
  Link2,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import {
  SmartUrlChip,
  isSafeExternalUrl,
  parseSmartUrl,
  ProviderIcon,
} from "@/components/ui/SmartUrlChip.js";
import { ApiProblemError } from "@/lib/api-client.js";
import { useUpdateTask } from "./useUpdateTask.js";
import { extractTaskExternalLinks } from "./TaskPeekDrawer.js";
import type { TaskDto } from "./types.js";

export interface TaskExternalLinksSectionProps {
  task: TaskDto;
  communityId: string | null;
  workspaceId: string;
  isArchived?: boolean;
}

/**
 * TaskExternalLinksSection (FEAT-K01 & SEC-T09).
 * Provides viewing, attaching, editing, and removing structured external links,
 * with automatic domain/provider detection, SEC-T09 protocol validation,
 * optimistic rollback, and field-revision concurrency handling.
 */
export const TaskExternalLinksSection: React.FC<TaskExternalLinksSectionProps> = ({
  task,
  communityId,
  workspaceId,
  isArchived = false,
}) => {
  const updateTaskMutation = useUpdateTask();

  const canEdit = !isArchived && Boolean(task.effectivePermissions?.canEditCustomFieldsLinks);

  // Structured links attached to the task entity
  const structuredLinks = task.externalLinks ?? [];

  // Links extracted from task description (excluding any already attached as structured links)
  const descriptionLinks = useMemo(() => {
    if (!task.description) return [];
    const all = extractTaskExternalLinks({ description: task.description });
    const structuredUrls = new Set(
      structuredLinks.map((l) => l.url.trim().toLowerCase())
    );
    return all.filter((l) => !structuredUrls.has(l.url.trim().toLowerCase()));
  }, [task.description, structuredLinks]);

  const totalCount = structuredLinks.length + descriptionLinks.length;

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Live provider detection preview for input
  const livePreview = useMemo(() => {
    if (!urlInput.trim() || !isSafeExternalUrl(urlInput.trim())) return null;
    return parseSmartUrl(urlInput.trim());
  }, [urlInput]);

  // If user cannot edit and there are no links at all, do not render section
  if (!canEdit && totalCount === 0) {
    return null;
  }

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingLinkId(null);
    setUrlInput("");
    setTitleInput("");
    setFormError(null);
    setConflictError(null);
  };

  const handleStartEdit = (link: NonNullable<TaskDto["externalLinks"]>[number]) => {
    setEditingLinkId(link.id);
    setIsAdding(false);
    setUrlInput(link.url);
    setTitleInput(link.title);
    setFormError(null);
    setConflictError(null);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingLinkId(null);
    setUrlInput("");
    setTitleInput("");
    setFormError(null);
  };

  const handleSaveLink = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      setFormError("URL is required.");
      return;
    }

    // Protocol validation per SEC-T09
    if (trimmedUrl.startsWith("//") || trimmedUrl.startsWith("\\\\")) {
      setFormError("Protocol-relative URLs are not allowed.");
      return;
    }

    if (!isSafeExternalUrl(trimmedUrl)) {
      setFormError("Invalid URL scheme. Only https:// (and http://) URLs are allowed.");
      return;
    }

    // Duplicate check
    const normalizedTargetUrl = trimmedUrl.toLowerCase();
    const isDuplicate = structuredLinks.some(
      (l) =>
        l.id !== editingLinkId &&
        l.url.trim().toLowerCase() === normalizedTargetUrl
    );

    if (isDuplicate) {
      setFormError("This URL is already attached to this task.");
      return;
    }

    // Auto-detect provider & title
    const parsed = parseSmartUrl(trimmedUrl);
    const provider = parsed?.provider || "generic";
    const title =
      titleInput.trim() || parsed?.displayLabel || parsed?.host || trimmedUrl;

    let updatedLinks: NonNullable<TaskDto["externalLinks"]>;
    if (editingLinkId) {
      updatedLinks = structuredLinks.map((l) =>
        l.id === editingLinkId
          ? {
              ...l,
              url: trimmedUrl,
              title,
              provider,
            }
          : l
      );
    } else {
      const newLink = {
        id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: trimmedUrl,
        title,
        provider,
      };
      updatedLinks = [...structuredLinks, newLink];
    }

    setIsSaving(true);
    setFormError(null);
    setConflictError(null);

    try {
      const currentRev = (task.fieldRevisions?.externalLinks as number | undefined) ?? 1;

      await updateTaskMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          externalLinks: updatedLinks,
          baseFieldRevisions: {
            externalLinks: currentRev,
          },
        },
      });

      // Reset form on success
      handleCancelForm();
    } catch (err: unknown) {
      if (
        (err instanceof ApiProblemError && err.status === 409) ||
        (err instanceof Error && (err.message.includes("conflict") || err.message.includes("409")))
      ) {
        setConflictError("Link update conflict: this task was modified concurrently.");
        handleCancelForm();
      } else if (err instanceof ApiProblemError) {
        setFormError(err.detail || err.message);
      } else {
        setFormError(
          err instanceof Error ? err.message : "Failed to update external links."
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveLink = async (linkId: string) => {
    if (!canEdit || isSaving) return;

    const linkToRemove = structuredLinks.find((l) => l.id === linkId);
    if (!linkToRemove) return;

    const updatedLinks = structuredLinks.filter((l) => l.id !== linkId);
    setIsSaving(true);
    setConflictError(null);

    try {
      const currentRev = (task.fieldRevisions?.externalLinks as number | undefined) ?? 1;

      await updateTaskMutation.mutateAsync({
        communityId: communityId ?? "",
        workspaceId,
        taskId: task.id,
        data: {
          externalLinks: updatedLinks,
          baseFieldRevisions: {
            externalLinks: currentRev,
          },
        },
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to remove external link.";
      setConflictError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="space-y-3 pt-3 border-t border-[var(--border-subtle)]"
      data-testid="task-external-links-section"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
          <span>External Links ({totalCount})</span>
        </h3>

        {canEdit && !isAdding && editingLinkId === null && (
          <button
            type="button"
            onClick={handleStartAdd}
            data-testid="add-external-link-btn"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Add link</span>
          </button>
        )}
      </div>

      {/* Global Concurrency Conflict / Server Error Alert */}
      {conflictError && (
        <div
          data-testid="external-link-error-alert"
          role="alert"
          className="p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{conflictError}</span>
          </div>
          <button
            type="button"
            onClick={() => setConflictError(null)}
            aria-label="Dismiss error"
            className="p-0.5 rounded hover:bg-destructive/20 text-destructive transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline Attach / Edit Form */}
      {(isAdding || editingLinkId !== null) && (
        <div
          data-testid="external-link-form"
          className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              {isAdding ? "Attach External Link" : "Edit External Link"}
            </span>
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={isSaving}
              aria-label="Close form"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-[var(--border-subtle)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label
                htmlFor="external-link-url"
                className="text-[11px] font-medium text-muted-foreground block mb-1"
              >
                Destination URL <span className="text-destructive">*</span>
              </label>
              <input
                id="external-link-url"
                data-testid="external-link-url-input"
                type="url"
                disabled={isSaving}
                placeholder="https://github.com/..., https://figma.com/..."
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>

            <div>
              <label
                htmlFor="external-link-title"
                className="text-[11px] font-medium text-muted-foreground block mb-1"
              >
                Custom Title (Optional)
              </label>
              <input
                id="external-link-title"
                data-testid="external-link-title-input"
                type="text"
                disabled={isSaving}
                placeholder={
                  livePreview
                    ? `Auto-detected: ${livePreview.displayLabel}`
                    : "e.g. Design Specs, Pull Request"
                }
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Live Provider Preview */}
          {livePreview && (
            <div
              data-testid="external-link-live-preview"
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-background/50 px-2 py-1 rounded border border-[var(--border-subtle)]"
            >
              <ProviderIcon provider={livePreview.provider} className="w-3 h-3" />
              <span>Detected:</span>
              <strong className="text-foreground font-medium">
                {livePreview.providerName}
              </strong>
              <span>•</span>
              <span className="truncate">{livePreview.displayLabel}</span>
            </div>
          )}

          {/* Form Validation Error */}
          {formError && (
            <div
              data-testid="external-link-form-error"
              role="alert"
              className="text-[11px] text-destructive flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleCancelForm}
              disabled={isSaving}
              data-testid="external-link-cancel-btn"
              className="px-2.5 py-1 rounded text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-[var(--border-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLink}
              disabled={isSaving}
              data-testid="external-link-submit-btn"
              className="px-3 py-1 rounded text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isSaving ? (
                <>
                  <span className="animate-pulse">Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3 h-3" aria-hidden="true" />
                  <span>{isAdding ? "Attach link" : "Save changes"}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Render Attached Structured Links */}
      <div className="flex flex-wrap gap-2" data-testid="external-links-list">
        {structuredLinks.map((link) => (
          <SmartUrlChip
            key={link.id}
            url={link.url}
            title={link.title}
            provider={link.provider}
            showCopyButton
            actions={
              canEdit ? (
                <div className="flex items-center gap-0.5 ml-1 border-l border-[var(--border-subtle)] pl-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(link)}
                    aria-label={`Edit link ${link.title}`}
                    data-testid={`edit-external-link-btn-${link.id}`}
                    title="Edit link"
                    className="p-1 rounded shrink-0 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <Pencil className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(link.id)}
                    aria-label={`Remove link ${link.title}`}
                    data-testid={`remove-external-link-btn-${link.id}`}
                    title="Remove link"
                    className="p-1 rounded shrink-0 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-destructive hover:bg-[var(--border-subtle)]/60 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    <span className="sr-only">Remove</span>
                  </button>
                </div>
              ) : undefined
            }
          />
        ))}

        {/* Render Links Extracted from Description */}
        {descriptionLinks.map((link, idx) => (
          <SmartUrlChip
            key={`desc-${link.url}-${idx}`}
            url={link.url}
            title={link.title}
            provider={link.provider}
            showCopyButton
          />
        ))}
      </div>
    </div>
  );
};

import React, { useState, useId, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/modules/auth";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, Sparkles, Building2, User, Layers } from "lucide-react";
import { useWorkspaceTemplates } from "./useWorkspaceTemplates";
import { WorkspaceTemplateCard } from "./WorkspaceTemplateCard";
import { WorkspaceTemplatePreviewModal } from "./WorkspaceTemplatePreviewModal";
import { createWorkspaceApi } from "./api";
import { useWorkspace } from "./WorkspaceContext";
import type {
  WorkspaceDto,
  WorkspaceKind,
  WorkspaceTemplateKey,
  WorkspaceTemplateDto,
  CreateWorkspaceRequest,
} from "./types";

export interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string | null;
  onSuccess?: (workspace: WorkspaceDto) => void;
}

export function CreateWorkspaceDialog({
  isOpen,
  onOpenChange,
  communityId,
  onSuccess,
}: CreateWorkspaceDialogProps): React.JSX.Element {
  const { csrfToken } = useAuth();
  const { selectWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  const nameInputId = useId();
  const prefixInputId = useId();

  // Form state
  const [name, setName] = useState("");
  const [kind, setKind] = useState<WorkspaceKind>("SHARED");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<WorkspaceTemplateKey>("GENERAL_PURPOSE");

  // Template preview state
  const [previewTemplate, setPreviewTemplate] = useState<WorkspaceTemplateDto | null>(null);

  // Form submission & validation state
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    keyPrefix?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // Template query
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    isError: isTemplatesError,
    error: templatesError,
    refetch: refetchTemplates,
  } = useWorkspaceTemplates(communityId);

  // Reset form when dialog closes
  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setName("");
      setKind("SHARED");
      setKeyPrefix("");
      setSelectedTemplateKey("GENERAL_PURPOSE");
      setValidationErrors({});
      setSubmitError(null);
      setPreviewTemplate(null);
    }, 200);
  };

  const validateForm = (): boolean => {
    const errors: { name?: string; keyPrefix?: string } = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      errors.name = "Workspace name is required.";
    } else if (trimmedName.length > 120) {
      errors.name = "Workspace name cannot exceed 120 characters.";
    }

    const trimmedPrefix = keyPrefix.trim();
    if (trimmedPrefix && !/^[A-Z][A-Z0-9]{1,9}$/.test(trimmedPrefix)) {
      errors.keyPrefix =
        "Prefix must be 2-10 uppercase alphanumeric characters starting with a letter (e.g. ENG, GALA).";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isSubmitting) return;

    if (!validateForm()) return;

    if (!communityId) {
      setSubmitError("No active community selected.");
      return;
    }

    const payload: CreateWorkspaceRequest = {
      name: name.trim(),
      kind,
      maxSubtaskDepth: 1,
      templateKey: selectedTemplateKey,
    };

    if (keyPrefix.trim()) {
      payload.keyPrefix = keyPrefix.trim().toUpperCase();
    }

    setIsSubmitting(true);
    try {
      const created = await createWorkspaceApi(
        communityId,
        payload,
        csrfToken ?? ""
      );

      // Invalidate and refetch workspace list queries to ensure immediate visibility
      await queryClient.invalidateQueries({
        queryKey: ["communities", communityId, "workspaces"],
      });
      await queryClient.refetchQueries({
        queryKey: ["communities", communityId, "workspaces"],
      });

      // Switch to new workspace
      startTransition(() => {
        selectWorkspace(created.id);
      });

      onSuccess?.(created);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create workspace. Please check your inputs and try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          data-testid="create-workspace-dialog"
          className="max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col p-6"
        >
          <DialogHeader className="mb-4">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[var(--surface-muted)] text-[var(--brand-primary)]">
                <Layers className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle>Create New Workspace</DialogTitle>
                <DialogDescription>
                  Set up a shared team workspace or personal work area with an optional starter template.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-[var(--feedback-danger-surface)] border border-[var(--feedback-danger-border)] text-xs text-[var(--feedback-danger-text)] flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Creation Failed</p>
                  <p>{submitError}</p>
                </div>
              </div>
            )}

            {/* Step 1: Workspace Basics */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                1. Workspace Details
              </h3>

              {/* Workspace Name */}
              <div className="space-y-1.5">
                <label
                  htmlFor={nameInputId}
                  className="block text-xs font-medium text-[var(--text-primary)]"
                >
                  Workspace Name <span className="text-[var(--feedback-danger-text)]">*</span>
                </label>
                <Input
                  id={nameInputId}
                  data-testid="workspace-name-input"
                  placeholder="e.g. Engineering Platform, Community Outreach"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) {
                      setValidationErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  error={validationErrors.name}
                  helperText="Between 1 and 120 characters."
                  maxLength={120}
                  autoFocus
                  required
                />
              </div>

              {/* Workspace Kind: Shared vs Personal */}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-[var(--text-primary)]">
                  Workspace Type
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setKind("SHARED")}
                    data-testid="workspace-kind-shared"
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      kind === "SHARED"
                        ? "border-[var(--brand-primary)] bg-[var(--surface-active)]/30 ring-1 ring-[var(--brand-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <Building2 className="h-4 w-4 mt-0.5 text-blue-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">
                        Shared Workspace
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Collaborative workspace for teams, coordinators, and members.
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setKind("PERSONAL")}
                    data-testid="workspace-kind-personal"
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      kind === "PERSONAL"
                        ? "border-[var(--brand-primary)] bg-[var(--surface-active)]/30 ring-1 ring-[var(--brand-primary)]"
                        : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <User className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-[var(--text-primary)] block">
                        Personal Workspace
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Private workspace owned exclusively by you with break-glass policy.
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Key Prefix (Optional) */}
              <div className="space-y-1.5">
                <label
                  htmlFor={prefixInputId}
                  className="block text-xs font-medium text-[var(--text-primary)]"
                >
                  Task Key Prefix <span className="text-[var(--text-muted)] font-normal">(Optional)</span>
                </label>
                <Input
                  id={prefixInputId}
                  data-testid="workspace-prefix-input"
                  placeholder="e.g. ENG, GALA, ART"
                  value={keyPrefix}
                  onChange={(e) => {
                    const upper = e.target.value.toUpperCase();
                    setKeyPrefix(upper);
                    if (validationErrors.keyPrefix) {
                      setValidationErrors((prev) => ({ ...prev, keyPrefix: undefined }));
                    }
                  }}
                  error={validationErrors.keyPrefix}
                  helperText="2 to 10 uppercase alphanumeric characters (e.g., ENG). If omitted, the platform will reserve one automatically."
                  maxLength={10}
                />
              </div>
            </div>

            {/* Step 2: Starter Templates Picker */}
            <div className="space-y-3 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    2. Choose a Starter Template
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Preconfigures workflow statuses, custom fields, and views. Configuration can be customized later.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--brand-primary)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                  <Sparkles className="h-3 w-3" />
                  <span>Seeded Atomically</span>
                </span>
              </div>

              {/* Loading State */}
              {isLoadingTemplates ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl border border-[var(--border-subtle)] space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-3/4" />
                      <div className="flex gap-1 pt-2">
                        <Skeleton className="h-5 w-12 rounded" />
                        <Skeleton className="h-5 w-16 rounded" />
                        <Skeleton className="h-5 w-12 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : isTemplatesError ? (
                <div className="p-4 rounded-lg bg-[var(--feedback-danger-surface)] border border-[var(--feedback-danger-border)] text-center space-y-2">
                  <div className="flex items-center justify-center gap-2 text-xs text-[var(--feedback-danger-text)]">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load template catalog: {templatesError?.message}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => refetchTemplates()}
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    Retry loading templates
                  </Button>
                </div>
              ) : (
                <div
                  role="radiogroup"
                  aria-label="Starter Templates"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  {/* Option 0: Blank Workspace */}
                  <WorkspaceTemplateCard
                    templateKey="BLANK"
                    title="Blank Workspace"
                    description="Start fresh with standard To do, In progress, and Done statuses. No preconfigured custom fields."
                    badge="Clean Slate"
                    workflowStatuses={BLANK_TEMPLATE_MOCK.workflowStatuses}
                    defaultViews={BLANK_TEMPLATE_MOCK.defaultSavedViews}
                    isSelected={selectedTemplateKey === "BLANK"}
                    onSelect={() => setSelectedTemplateKey("BLANK")}
                    onPreview={() => setPreviewTemplate(BLANK_TEMPLATE_MOCK)}
                  />

                  {/* Built-in Templates from Catalog */}
                  {templates?.map((t) => (
                    <WorkspaceTemplateCard
                      key={t.key}
                      templateKey={t.key}
                      title={t.name}
                      description={t.description}
                      badge={t.key === "GENERAL_PURPOSE" ? "Recommended" : undefined}
                      workflowStatuses={t.workflowStatuses}
                      customFields={t.customFieldDefinitions}
                      defaultViews={t.defaultSavedViews}
                      isSelected={selectedTemplateKey === t.key}
                      onSelect={() => setSelectedTemplateKey(t.key)}
                      onPreview={() => setPreviewTemplate(t)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Dialog Footer Actions */}
            <DialogFooter className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                data-testid="create-workspace-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                data-testid="create-workspace-submit-btn"
              >
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Preview Modal */}
      <WorkspaceTemplatePreviewModal
        isOpen={Boolean(previewTemplate)}
        onClose={() => setPreviewTemplate(null)}
        template={previewTemplate}
        isCurrentSelection={
          previewTemplate?.name === "Blank Workspace"
            ? selectedTemplateKey === "BLANK"
            : selectedTemplateKey === previewTemplate?.key
        }
        onApply={(tpl) => {
          if (tpl.name === "Blank Workspace") {
            setSelectedTemplateKey("BLANK");
          } else {
            setSelectedTemplateKey(tpl.key);
          }
        }}
      />
    </>
  );
}

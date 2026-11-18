import React, { useState, useId } from "react";
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
import { useAuth } from "@/modules/auth";
import { AlertCircle, Building2, Sparkles } from "lucide-react";
import { createCommunityApi } from "./api";
import { useWorkspace } from "./WorkspaceContext";
import type { CommunityMembershipDto } from "./types";

export interface CreateCommunityDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (community: CommunityMembershipDto) => void;
}

export function CreateCommunityDialog({
  isOpen,
  onOpenChange,
  onSuccess,
}: CreateCommunityDialogProps): React.JSX.Element {
  const { csrfToken, refreshSession } = useAuth();
  const { selectCommunity } = useWorkspace();
  const nameInputId = useId();

  const [name, setName] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setName("");
      setMakeActive(true);
      setValidationError(null);
      setSubmitError(null);
    }, 200);
  };

  const validate = (): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      setValidationError("Community name is required.");
      return false;
    }
    if (trimmed.length > 120) {
      setValidationError("Community name cannot exceed 120 characters.");
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isSubmitting) return;
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const created = await createCommunityApi(
        { name: name.trim() },
        csrfToken ?? ""
      );

      // Refresh session context so useAuth().communities includes the new community
      await refreshSession();

      // If requested, activate the community immediately
      if (makeActive) {
        await selectCommunity(created.communityId);
      }

      onSuccess?.(created);
      handleClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to create community. Please check your inputs and try again.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        data-testid="create-community-dialog"
        className="max-w-md flex flex-col p-6"
      >
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[var(--surface-muted)] text-[var(--brand-primary)]">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle>Create New Community</DialogTitle>
              <DialogDescription>
                Establish a new community organization to host shared and personal workspaces.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
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

          <div className="space-y-1.5">
            <label
              htmlFor={nameInputId}
              className="block text-xs font-medium text-[var(--text-primary)]"
            >
              Community Name <span className="text-[var(--feedback-danger-text)]">*</span>
            </label>
            <Input
              id={nameInputId}
              data-testid="community-name-input"
              placeholder="e.g. Northern Coast Conservancy, Civic Tech Guild"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationError) setValidationError(null);
              }}
              error={validationError ?? undefined}
              helperText="Between 1 and 120 characters."
              maxLength={120}
              autoFocus
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="make-community-active-checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-primary)] focus:ring-[var(--border-focus)] cursor-pointer"
            />
            <label
              htmlFor="make-community-active-checkbox"
              className="text-xs text-[var(--text-secondary)] select-none cursor-pointer"
            >
              Make this the active community immediately
            </label>
          </div>

          <DialogFooter className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="create-community-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              data-testid="create-community-submit-btn"
            >
              Create Community
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

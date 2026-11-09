import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog.js";
import { Button } from "@/components/ui/Button.js";
import { Input } from "@/components/ui/Input.js";
import {
  useCreateMilestone,
  useUpdateMilestone,
  type MilestoneDto,
} from "@/modules/milestones/index.js";

export interface TimelineMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  communityId: string;
  milestoneToEdit?: MilestoneDto | null;
}

export function TimelineMilestoneModal({
  isOpen,
  onClose,
  workspaceId,
  communityId,
  milestoneToEdit,
}: TimelineMilestoneModalProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreateMilestone();
  const updateMutation = useUpdateMilestone();

  const isEditing = Boolean(milestoneToEdit);
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (milestoneToEdit) {
      setName(milestoneToEdit.name);
      setTargetDate(milestoneToEdit.targetDate ?? "");
      setDescription(milestoneToEdit.description ?? "");
    } else {
      setName("");
      setTargetDate("");
      setDescription("");
    }
    setValidationError(null);
  }, [milestoneToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError("Milestone name is required.");
      return;
    }
    setValidationError(null);

    try {
      if (isEditing && milestoneToEdit) {
        await updateMutation.mutateAsync({
          communityId,
          workspaceId,
          milestoneId: milestoneToEdit.id,
          data: {
            name: name.trim(),
            targetDate: targetDate.trim() || null,
            description: description.trim() || null,
          },
        });
      } else {
        await createMutation.mutateAsync({
          communityId,
          workspaceId,
          data: {
            name: name.trim(),
            ...(targetDate.trim() ? { targetDate: targetDate.trim() } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
          },
        });
      }
      onClose();
    } catch (err: unknown) {
      setValidationError(err instanceof Error ? err.message : "Failed to save milestone.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="timeline-milestone-modal" className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Edit Milestone" : "Create Workspace Milestone"}
            </DialogTitle>
            <DialogDescription>
              Milestones mark workspace-level planning targets and deadlines across the timeline.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {validationError && (
              <div
                role="alert"
                className="p-3 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium"
              >
                {validationError}
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="milestone-name"
                className="text-xs font-semibold text-[var(--text-primary)]"
              >
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="milestone-name"
                data-testid="milestone-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Public Beta Release"
                required
                disabled={isPending}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="milestone-target-date"
                className="text-xs font-semibold text-[var(--text-primary)]"
              >
                Target Date
              </label>
              <Input
                id="milestone-target-date"
                data-testid="milestone-target-date-input"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isPending}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                The date this milestone appears on the timeline axis.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="milestone-description"
                className="text-xs font-semibold text-[var(--text-primary)]"
              >
                Description
              </label>
              <textarea
                id="milestone-description"
                data-testid="milestone-description-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Key goals, deliverables, or criteria for this milestone..."
                disabled={isPending}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)] transition-colors"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              data-testid="milestone-save-btn"
              className="bg-[var(--brand-accent-btn-bg)] hover:bg-[var(--brand-accent-btn-hover)] text-[var(--brand-accent-btn-text)]"
            >
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Milestone"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

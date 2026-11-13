import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Info, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkspaceTemplateDto } from "./types";

export interface WorkspaceTemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: WorkspaceTemplateDto | null;
  onApply: (template: WorkspaceTemplateDto) => void;
  isCurrentSelection: boolean;
}

export function WorkspaceTemplatePreviewModal({
  isOpen,
  onClose,
  template,
  onApply,
  isCurrentSelection,
}: WorkspaceTemplatePreviewModalProps): React.JSX.Element | null {
  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="template-preview-dialog"
        className="max-w-2xl max-h-[85vh] overflow-y-auto flex flex-col p-6"
      >
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-[var(--surface-muted)] text-[var(--brand-primary)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <DialogTitle>{template.name} Template</DialogTitle>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
              v{template.templateVersion}
            </span>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)] mt-1.5">
            {template.description}
          </DialogDescription>
        </DialogHeader>

        {/* DEC-OPEN-07 Policy Notice */}
        <div className="my-3 p-3 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] flex items-start gap-2.5">
          <Info className="h-4 w-4 text-[var(--text-secondary)] shrink-0 mt-0.5" />
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <strong>Configuration-Only Seeding:</strong> Applying this template seeds
            workflow statuses, custom fields, and default views into your new workspace.
            It never creates sample tasks, assignees, watchers, comments, or permissions.
          </p>
        </div>

        {/* Content Breakdown */}
        <div className="space-y-4 my-2 flex-1">
          {/* Section 1: Workflow Statuses */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Included Workflow Statuses ({template.workflowStatuses.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {template.workflowStatuses.map((st) => (
                <div
                  key={st.key}
                  className="flex items-center justify-between p-2 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        st.category === "DONE" && "bg-emerald-500",
                        st.category === "IN_PROGRESS" && "bg-blue-500",
                        st.category === "TODO" && "bg-amber-500",
                        st.category === "BACKLOG" && "bg-zinc-400"
                      )}
                    />
                    <span className="font-medium text-[var(--text-primary)]">
                      {st.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                    {st.category}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Custom Field Definitions */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Custom Field Definitions ({template.customFieldDefinitions.length})
            </h4>
            {template.customFieldDefinitions.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] italic p-2 bg-[var(--surface-muted)]/50 rounded border border-dashed border-[var(--border-subtle)]">
                No custom fields defined. Uses standard title, description, dates, priority, and assignees.
              </p>
            ) : (
              <div className="space-y-2">
                {template.customFieldDefinitions.map((cf) => (
                  <div
                    key={cf.key}
                    className="p-2.5 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--text-primary)]">
                        {cf.name}
                      </span>
                      <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                        {cf.fieldType}
                      </span>
                    </div>
                    {cf.options && cf.options.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Options:
                        </span>
                        {cf.options.map((opt) => (
                          <span
                            key={opt}
                            className="inline-block px-1.5 py-0.2 rounded text-[10px] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Default Saved Views */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Default Shared Views ({template.defaultSavedViews.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {template.defaultSavedViews.map((v) => (
                <div
                  key={v.name}
                  className="flex items-center justify-between p-2 rounded-md bg-[var(--surface-card)] border border-[var(--border-subtle)] text-xs"
                >
                  <span className="font-medium text-[var(--text-primary)]">
                    {v.name}
                  </span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-muted)] text-[var(--text-secondary)]">
                    {v.viewType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="preview-close-button"
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onApply(template);
              onClose();
            }}
            data-testid="preview-apply-button"
            leftIcon={isCurrentSelection ? <Check className="h-4 w-4" /> : undefined}
          >
            {isCurrentSelection ? "Keep Selected" : "Use This Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React from "react";
import { Check, Eye, LayoutGrid, CalendarDays, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WorkspaceTemplateKey,
  WorkspaceTemplateStatusDto,
  WorkspaceTemplateCustomFieldDto,
  WorkspaceTemplateSavedViewDto,
} from "./types";

export interface WorkspaceTemplateCardProps {
  templateKey: WorkspaceTemplateKey;
  title: string;
  description: string;
  badge?: string;
  workflowStatuses?: WorkspaceTemplateStatusDto[];
  customFields?: WorkspaceTemplateCustomFieldDto[];
  defaultViews?: WorkspaceTemplateSavedViewDto[];
  isSelected: boolean;
  onSelect: () => void;
  onPreview?: () => void;
  disabled?: boolean;
  className?: string;
}

export function WorkspaceTemplateCard({
  templateKey,
  title,
  description,
  badge,
  workflowStatuses = [],
  customFields = [],
  defaultViews = [],
  isSelected,
  onSelect,
  onPreview,
  disabled = false,
  className,
}: WorkspaceTemplateCardProps): React.JSX.Element {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  // Icon mapping per canonical template
  const renderIcon = () => {
    switch (templateKey) {
      case "EVENT_PLANNING":
        return <CalendarDays className="h-5 w-5 text-indigo-500 shrink-0" />;
      case "TEAM_OPERATIONS":
        return <Boxes className="h-5 w-5 text-emerald-500 shrink-0" />;
      case "GENERAL_PURPOSE":
      default:
        return <LayoutGrid className="h-5 w-5 text-blue-500 shrink-0" />;
    }
  };

  return (
    <div
      role="radio"
      aria-checked={isSelected}
      aria-label={`${title} starter template`}
      tabIndex={disabled ? -1 : 0}
      onClick={() => {
        if (!disabled) onSelect();
      }}
      onKeyDown={handleKeyDown}
      data-testid={`template-card-${templateKey}`}
      className={cn(
        "relative flex flex-col justify-between p-4 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        isSelected
          ? "border-[var(--brand-primary)] bg-[var(--surface-active)]/40 shadow-sm ring-1 ring-[var(--brand-primary)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)]/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Top Header: Icon, Title, Badge, and Selected Check Indicator */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] shrink-0">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                  {title}
                </span>
                {badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    {badge}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Radio indicator */}
          <div
            data-testid={`template-check-${templateKey}`}
            className={cn(
              "h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
              isSelected
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white"
                : "border-[var(--border-strong)] bg-[var(--surface-card)] text-transparent"
            )}
            aria-hidden="true"
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3">
          {description}
        </p>

        {/* Workflow Status Pills */}
        {workflowStatuses.length > 0 && (
          <div className="mb-3">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-1">
              Workflow Statuses
            </span>
            <div className="flex flex-wrap gap-1">
              {workflowStatuses.map((st) => (
                <span
                  key={st.key}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]"
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full shrink-0",
                      st.category === "DONE" && "bg-emerald-500",
                      st.category === "IN_PROGRESS" && "bg-blue-500",
                      st.category === "TODO" && "bg-amber-500",
                      st.category === "BACKLOG" && "bg-zinc-400"
                    )}
                  />
                  {st.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Summary Details: Custom Fields & Views */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          {customFields.length > 0 ? (
            <span>
              <strong className="text-[var(--text-primary)] font-medium">
                {customFields.length}
              </strong>{" "}
              custom field{customFields.length === 1 ? "" : "s"}
            </span>
          ) : (
            <span>Standard fields</span>
          )}

          {defaultViews.length > 0 && (
            <>
              <span>•</span>
              <span>
                Views:{" "}
                <span className="text-[var(--text-primary)] font-medium">
                  {defaultViews.map((v) => v.name).join(", ")}
                </span>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Card Action: Preview Button */}
      {onPreview && (
        <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreview();
            }}
            data-testid={`template-preview-btn-${templateKey}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-primary)] hover:underline focus-ring rounded px-1.5 py-0.5 cursor-pointer"
            aria-label={`Preview ${title} template`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Preview template</span>
          </button>

          {isSelected && (
            <span className="text-[11px] font-medium text-[var(--brand-primary)]">
              Selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}

import React from "react";
import type { TaskStatusCategory } from "@/modules/tasks/types.js";

interface CategoryMeta {
  category: TaskStatusCategory;
  name: string;
  badgeClass: string;
  dotClass: string;
  isOpen: boolean;
  defaultStatus: string;
  description: string;
  rules: string[];
}

const CATEGORIES: CategoryMeta[] = [
  {
    category: "BACKLOG",
    name: "Backlog",
    badgeClass: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700",
    dotClass: "bg-slate-400",
    isOpen: true,
    defaultStatus: "Backlog",
    description: "Intake, discovery, and unscheduled work. Backlog items are held in the collapsible tray in board and list views until promoted to the active queue.",
    rules: [
      "Excluded from active board columns by default",
      "Held in collapsible Backlog Tray in list and board views",
      "Promotable to To Do with single-click action",
    ],
  },
  {
    category: "TODO",
    name: "To Do",
    badgeClass: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    dotClass: "bg-blue-500",
    isOpen: true,
    defaultStatus: "To Do",
    description: "Committed tasks ready for immediate execution. Prioritized and ready to be picked up by team members.",
    rules: [
      "Primary entry point for active execution cycles",
      "Supports due dates, assignees, and priority sorting",
      "Visible in all primary views",
    ],
  },
  {
    category: "IN_PROGRESS",
    name: "In Progress",
    badgeClass: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    dotClass: "bg-amber-500",
    isOpen: true,
    defaultStatus: "In Progress",
    description: "Actively being worked on by one or more assignees. Reflects current team capacity and work in flight.",
    rules: [
      "Tracked for active cycle time and velocity",
      "Assignees should be set when tasks enter this stage",
      "Highlighted in 'My Work' active triage",
    ],
  },
  {
    category: "DONE",
    name: "Done",
    badgeClass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    dotClass: "bg-emerald-500",
    isOpen: false,
    defaultStatus: "Done",
    description: "Completed and verified. Marks work as resolved and establishes completion timestamp for workspace metrics.",
    rules: [
      "Considered a closed category for active filters",
      "Filtered out when 'Hide Completed' toggle is active",
      "Blocks dependent tasks automatically clear",
    ],
  },
  {
    category: "CANCELED",
    name: "Canceled",
    badgeClass: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    dotClass: "bg-rose-500",
    isOpen: false,
    defaultStatus: "Canceled",
    description: "Discarded, obsolete, or superseded work. Preserves full audit trail and discussion history without cluttering focus views.",
    rules: [
      "Considered a closed category for active filters",
      "Retains task history, links, and comments",
      "Canonical spelling 'CANCELED' adhered across API and UI",
    ],
  },
];

export const WorkflowSettingsView: React.FC = () => {
  return (
    <div className="space-y-8" data-testid="workflow-spine">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Workflow Spine & Statuses
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sonder organizes all work across five canonical workflow categories (FEAT-D01). Every status strictly maps into one category to preserve clarity across all views and analytics.
        </p>
      </div>

      {/* 5-Category Spine Grid */}
      <div className="grid grid-cols-1 gap-4">
        {CATEGORIES.map((cat, idx) => (
          <div
            key={cat.category}
            data-testid={`workflow-category-${cat.category}`}
            className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-xs transition-colors"
          >
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                  {idx + 1}
                </span>
                <span
                  data-testid={`category-badge-${cat.category}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cat.badgeClass}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${cat.dotClass}`} aria-hidden="true" />
                  {cat.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-mono">
                  {cat.isOpen ? "Open Stage" : "Closed Stage"}
                </span>
                <span className="text-xs text-muted-foreground">
                  Default status: <span className="font-medium text-foreground">{cat.defaultStatus}</span>
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {cat.description}
              </p>
              <ul className="text-xs text-muted-foreground space-y-1 pt-1 list-disc list-inside">
                {cat.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* Workflow Invariant & Governance Notice */}
      <div className="rounded-lg border border-border/80 bg-muted/40 p-5 space-y-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-primary shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-sm font-semibold text-foreground">
            Workflow Governance & Simplicity Policy
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Arbitrary transition schemes, mandatory enterprise gate screens, and rigid state-machine configurations are intentionally excluded (FEAT-D02) to maintain team agility and zero administrative drag. Status updates remain immediate and unencumbered, with full audit trail logging and granular capability checks.
        </p>
      </div>
    </div>
  );
};

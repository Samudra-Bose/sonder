import React from "react";
import { cn } from "@/lib/utils.js";

export type TaskDrawerSectionId = "overview" | "subtasks" | "fields" | "comments";

export interface TaskDrawerNavProps {
  activeSection: TaskDrawerSectionId;
  onSelectSection: (sectionId: TaskDrawerSectionId) => void;
  subtaskCount?: number;
  commentCount?: number;
  className?: string;
}

interface NavItem {
  id: TaskDrawerSectionId;
  label: string;
  href: string;
  testId: string;
  count?: number;
}

export function TaskDrawerNav({
  activeSection,
  onSelectSection,
  subtaskCount,
  commentCount,
  className,
}: TaskDrawerNavProps): React.JSX.Element {
  const navItems: NavItem[] = [
    {
      id: "overview",
      label: "Overview",
      href: "#overview",
      testId: "drawer-nav-overview",
    },
    {
      id: "subtasks",
      label: "Subtasks",
      href: "#subtasks",
      testId: "drawer-nav-subtasks",
      count: subtaskCount,
    },
    {
      id: "fields",
      label: "Fields",
      href: "#fields",
      testId: "drawer-nav-fields",
    },
    {
      id: "comments",
      label: "Comments",
      href: "#comments",
      testId: "drawer-nav-comments",
      count: commentCount,
    },
  ];

  return (
    <nav
      aria-label="Task section navigation"
      className={cn(
        "sticky top-0 z-10 px-4 py-2 bg-[var(--surface-card)]/95 backdrop-blur-xs border-b border-[var(--border-subtle)]",
        "flex items-center gap-1.5 select-none shrink-0 overflow-x-auto no-scrollbar",
        className
      )}
    >
      {navItems.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={item.href}
            aria-current={isActive ? "location" : undefined}
            data-testid={item.testId}
            onClick={(e) => {
              e.preventDefault();
              onSelectSection(item.id);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 relative",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              "min-h-[36px] sm:min-h-[28px] inline-flex items-center gap-1.5 cursor-pointer no-underline",
              isActive
                ? "bg-[var(--surface-muted)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--border-subtle)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/50"
            )}
          >
            <span>{item.label}</span>
            {typeof item.count === "number" && item.count > 0 && (
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                  isActive
                    ? "bg-[var(--brand-accent)] text-white dark:text-black font-bold"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                )}
              >
                {item.count}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}

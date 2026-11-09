import React from "react";
import { NavLink } from "react-router-dom";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  List,
  LayoutGrid,
  Calendar,
  GanttChart,
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { Kbd } from "@/components/ui/KeyboardShortcut";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher, useWorkspace } from "@/modules/workspace";
import {
  PRIMARY_NAV_ITEMS,
  type NavItem,
} from "./navigation";

export interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function AppSidebar({
  isCollapsed,
  onToggleCollapse,
}: AppSidebarProps): React.JSX.Element {
  const { activeWorkspace, currentCommunityId } = useWorkspace();

  return (
    <aside
      role="navigation"
      aria-label="Main navigation"
      className={cn(
        "hidden md:flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-card)] flex-shrink-0 transition-[width] duration-200 ease-in-out motion-reduce:transition-none select-none h-full",
        isCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand & Identity Header */}
      <div
        className={cn(
          "h-12 border-b border-[var(--border-subtle)] flex items-center px-3.5 flex-shrink-0",
          isCollapsed ? "justify-center px-0" : "justify-between"
        )}
      >
        <NavLink
          to="/"
          className="flex items-center space-x-2.5 focus-ring rounded-md p-1 group"
          aria-label="Sonder Home"
        >
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-accent-btn-bg)] flex items-center justify-center text-[var(--brand-accent-btn-text)] shadow-xs font-bold text-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-[var(--brand-accent-text)]">
                Sonder
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                v1.5.0
              </span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Primary Navigation Section */}
      <div className="flex-1 py-3 overflow-y-auto px-2 space-y-4">
        {/* Main Section */}
        <div className="space-y-1">
          {!isCollapsed && (
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Navigation
            </h2>
          )}
          <nav aria-label="Primary" className="space-y-0.5">
            {PRIMARY_NAV_ITEMS.map((item: NavItem) => {
              const Icon = item.icon;
              const linkContent = (
                <NavLink
                  key={item.id}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center rounded-md text-xs font-medium transition-colors focus-ring",
                      isCollapsed
                        ? "h-9 w-9 mx-auto justify-center p-0"
                        : "h-8 px-2.5 w-full justify-start gap-2.5",
                      isActive
                        ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold shadow-2xs border-l-2 border-[var(--brand-accent-btn-bg)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                    )
                  }
                  end={item.href === "/"}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="flex-1 truncate text-left">{item.label}</span>
                  )}
                </NavLink>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.id} content={item.label} side="right">
                    {linkContent}
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </nav>
        </div>

        {/* Workspaces Section (VS-02C Workspace Switcher) */}
        <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
          {!isCollapsed && (
            <h2 className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Workspaces
            </h2>
          )}
          <WorkspaceSwitcher isCollapsed={isCollapsed} />
        </div>

        {/* Active Workspace Views (VS-04 List & Board Views) */}
        {activeWorkspace && (
          <div className="space-y-1 pt-2 border-t border-[var(--border-subtle)]">
            {!isCollapsed && (
              <h2 className="px-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Views
              </h2>
            )}
            <nav aria-label="Workspace Views" className="space-y-0.5">
              {[
                {
                  id: "list",
                  label: "List",
                  icon: List,
                  href: currentCommunityId
                    ? `/c/${currentCommunityId}/w/${activeWorkspace.id}/list`
                    : `/workspaces/${activeWorkspace.id}/list`,
                },
                {
                  id: "board",
                  label: "Board",
                  icon: LayoutGrid,
                  href: currentCommunityId
                    ? `/c/${currentCommunityId}/w/${activeWorkspace.id}/board`
                    : `/workspaces/${activeWorkspace.id}/board`,
                },
                {
                  id: "calendar",
                  label: "Calendar",
                  icon: Calendar,
                  href: currentCommunityId
                    ? `/c/${currentCommunityId}/w/${activeWorkspace.id}/calendar`
                    : `/workspaces/${activeWorkspace.id}/calendar`,
                },
                {
                  id: "timeline",
                  label: "Timeline",
                  icon: GanttChart,
                  href: currentCommunityId
                    ? `/c/${currentCommunityId}/w/${activeWorkspace.id}/timeline`
                    : `/workspaces/${activeWorkspace.id}/timeline`,
                },
              ].map((viewItem) => {
                const ViewIcon = viewItem.icon;
                const link = (
                  <NavLink
                    key={viewItem.id}
                    to={viewItem.href}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center rounded-md text-xs font-medium transition-colors focus-ring",
                        isCollapsed
                          ? "h-9 w-9 mx-auto justify-center p-0"
                          : "h-8 px-2.5 w-full justify-start gap-2.5",
                        isActive
                          ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold shadow-2xs border-l-2 border-[var(--brand-accent-btn-bg)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                      )
                    }
                  >
                    <ViewIcon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <span className="flex-1 truncate text-left">{viewItem.label}</span>
                    )}
                  </NavLink>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={viewItem.id} content={viewItem.label} side="right">
                      {link}
                    </Tooltip>
                  );
                }
                return link;
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Footer / Sidebar Collapse Control */}
      <div className="p-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Expand rail (Ctrl+B)" : "Collapse rail (Ctrl+B)"}
          className={cn(
            "flex items-center rounded-md text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors focus-ring cursor-pointer",
            isCollapsed
              ? "h-9 w-9 mx-auto justify-center p-0"
              : "h-8 px-2.5 w-full justify-between"
          )}
        >
          {isCollapsed ? (
            <Tooltip content="Expand rail (Ctrl+B)" side="right">
              <PanelLeftOpen className="h-4 w-4" />
            </Tooltip>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse rail</span>
              </span>
              <Kbd className="text-[10px] py-0 px-1">⌘B</Kbd>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

import React, { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  X,
  Sparkles,
  Layers,
  Lock,
  Sun,
  Moon,
  Menu,
  CheckCircle2,
  Inbox,
  LogOut,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  PRIMARY_NAV_ITEMS,
  CANONICAL_WORKSPACE_PREVIEWS,
  type NavItem,
} from "./navigation";
import type { AuthUser } from "./AppHeader";

export interface MobileNavigationProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  user: AuthUser | null;
  communityName: string;
  onLogout: () => void;
  isLoggingOut: boolean;
}

export function MobileNavigation({
  isOpen,
  onClose,
  onOpen,
  user,
  communityName,
  onLogout,
  isLoggingOut,
}: MobileNavigationProps): React.JSX.Element {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const drawerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close drawer automatically on route navigation
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]);

  // Handle Escape key to dismiss drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background body scroll while drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile Drawer Backdrop and Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-200"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
            className="relative w-72 max-w-[85vw] bg-[var(--surface-drawer)] text-[var(--text-primary)] shadow-2xl flex flex-col z-10 h-full border-r border-[var(--border-subtle)] motion-reduce:transition-none"
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-[var(--brand-accent-btn-bg)] flex items-center justify-center text-[var(--brand-accent-btn-text)] shadow-xs">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm tracking-tight text-[var(--brand-accent-text)]">
                  Sonder
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--text-muted)] font-medium border border-[var(--border-subtle)]">
                  v1.5.0
                </span>
              </div>

              <IconButton
                icon={<X className="h-4 w-4" />}
                aria-label="Close navigation menu"
                size="sm"
                variant="ghost"
                onClick={onClose}
              />
            </div>

            {/* Navigation Links with 44px Touch Targets */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              <div>
                <h3 className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Navigation
                </h3>
                <nav aria-label="Mobile Navigation Links" className="space-y-1">
                  {PRIMARY_NAV_ITEMS.map((item: NavItem) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.id}
                        to={item.href}
                        onClick={onClose}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 px-3 rounded-lg text-sm font-medium min-h-[44px] transition-colors focus-ring",
                            isActive
                              ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] font-semibold border-l-3 border-[var(--brand-accent-btn-bg)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                          )
                        }
                        end={item.href === "/"}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="flex-1 text-left">{item.label}</span>
                        {item.badge && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-muted)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>

              {/* Workspaces Section */}
              <div className="pt-2 border-t border-[var(--border-subtle)]">
                <div className="px-2 pb-1.5 flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Workspaces
                  </h3>
                  <span className="text-[9px] text-[var(--text-muted)]">VS-02C</span>
                </div>
                <div className="space-y-1">
                  {CANONICAL_WORKSPACE_PREVIEWS.map((ws) => (
                    <div
                      key={ws.id}
                      className="flex items-center gap-2.5 px-3 rounded-md text-xs min-h-[38px] text-[var(--text-secondary)] cursor-default"
                    >
                      {ws.isPersonal ? (
                        <Lock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      ) : (
                        <Layers className="h-4 w-4 text-[var(--brand-accent-text)] flex-shrink-0" />
                      )}
                      <span className="flex-1 truncate text-left">{ws.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        {ws.prefix}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Profile & Sign Out Footer in Drawer */}
            {user && (
              <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] space-y-3">
                <div className="flex items-center space-x-3">
                  <Avatar name={user.displayName} size="md" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {user.email}
                    </p>
                    <p className="text-[10px] text-[var(--brand-accent-text)] font-medium">
                      Community: {communityName || "Sonder Community"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-ring rounded px-2 py-1 min-h-[44px]"
                    aria-label={`Toggle theme (currently ${theme})`}
                  >
                    {resolvedTheme === "dark" ? (
                      <Sun className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Moon className="h-4 w-4 text-[var(--text-secondary)]" />
                    )}
                    <span>{theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light"}</span>
                  </button>

                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={onLogout}
                    disabled={isLoggingOut}
                    className="text-xs min-h-[44px] px-3"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1" />
                    <span>{isLoggingOut ? "Signing out..." : "Sign out"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 h-14 bg-[var(--surface-card)] border-t border-[var(--border-subtle)] z-30 md:hidden flex items-center justify-around px-2 select-none shadow-lg pb-[env(safe-area-inset-bottom,0px)]"
      >
        <NavLink
          to="/my-work"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors focus-ring",
              isActive
                ? "text-[var(--brand-accent-text)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )
          }
          aria-label="My Work"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">My Work</span>
        </NavLink>

        <NavLink
          to="/inbox"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors focus-ring relative",
              isActive
                ? "text-[var(--brand-accent-text)] font-semibold"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )
          }
          aria-label="Inbox"
        >
          <div className="relative">
            <Inbox className="h-5 w-5" />
            <span className="absolute -top-1 -right-1.5 h-3.5 min-w-[14px] px-0.5 rounded-full bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)] text-[9px] font-bold flex items-center justify-center">
              1
            </span>
          </div>
          <span className="text-[10px] mt-0.5">Inbox</span>
        </NavLink>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
          aria-label={`Toggle theme (current: ${theme})`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span className="text-[10px] mt-0.5">Theme</span>
        </button>

        <button
          type="button"
          onClick={onOpen}
          className="flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)] focus-ring"
          aria-label="Open menu drawer"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] mt-0.5">Menu</span>
        </button>
      </nav>
    </>
  );
}

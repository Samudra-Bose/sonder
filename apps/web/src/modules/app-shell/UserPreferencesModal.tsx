import React from "react";
import { Sun, Moon, Laptop, User, Sliders, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { useTheme } from "@/lib/theme";
import { useWorkspace } from "@/modules/workspace";
import { useTaskViewDensity } from "@/modules/tasks";
import { cn } from "@/lib/utils";
import type { AuthUser } from "./AppHeader";

export interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
}

export function UserPreferencesModal({
  isOpen,
  onClose,
  user,
}: UserPreferencesModalProps): React.JSX.Element {
  const { theme, setTheme } = useTheme();
  const { currentCommunity, activeWorkspace } = useWorkspace();
  const { density, storedPreference, isCompactEligible, setDensity } = useTaskViewDensity();

  const themeOptions = [
    {
      id: "system",
      label: "System",
      description: "Match system setting",
      icon: Laptop,
    },
    {
      id: "light",
      label: "Light",
      description: "High-contrast clean canvas",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark",
      description: "Deep obsidian elevation",
      icon: Moon,
    },
  ] as const;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-w-md w-full p-6 bg-[var(--surface-modal)] border border-[var(--border-strong)] rounded-xl shadow-2xl elevation-4"
        aria-label="User Preferences"
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="h-4 w-4 text-[var(--brand-accent-text)]" />
            <DialogTitle className="text-base font-semibold text-[var(--text-primary)]">
              User Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--text-muted)]">
            Personalize your workspace appearance, view density, and account details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-4">
          {/* Appearance & Theme Selector */}
          <section aria-labelledby="theme-heading" className="space-y-2">
            <h3
              id="theme-heading"
              className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
            >
              Appearance Theme
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center transition-all cursor-pointer focus-ring",
                      isSelected
                        ? "border-[var(--brand-accent)] bg-[var(--surface-muted)] text-[var(--text-primary)] ring-1 ring-[var(--brand-accent)] font-semibold shadow-xs"
                        : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/70 hover:text-[var(--text-primary)]"
                    )}
                  >
                    <div className="relative mb-1.5">
                      <Icon className="h-5 w-5" />
                      {isSelected && (
                        <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)]">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <span className="text-xs">{opt.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* View Density Section */}
          <section aria-labelledby="density-heading" className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <h3
                id="density-heading"
                className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
              >
                View Density
              </h3>
              <span
                data-testid="pref-density-status"
                className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--brand-accent-text)] border border-[var(--border-subtle)] font-medium"
              >
                {!isCompactEligible && storedPreference === "compact"
                  ? "Standard (Touch device forced)"
                  : density === "compact"
                  ? "Compact (38px) Active"
                  : "Standard (44px) Active"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="pref-density-standard"
                onClick={() => setDensity("standard")}
                aria-pressed={storedPreference === "standard"}
                className={cn(
                  "flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer focus-ring",
                  storedPreference === "standard"
                    ? "border-[var(--brand-accent)] bg-[var(--surface-muted)] text-[var(--text-primary)] ring-1 ring-[var(--brand-accent)] font-semibold shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/70 hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold">Standard</span>
                  {storedPreference === "standard" && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-normal">
                  44px visual rows; &ge;44px touch targets.
                </span>
              </button>

              <button
                type="button"
                data-testid="pref-density-compact"
                disabled={!isCompactEligible}
                onClick={() => isCompactEligible && setDensity("compact")}
                aria-pressed={storedPreference === "compact"}
                className={cn(
                  "flex flex-col items-start p-3 rounded-lg border text-left transition-all focus-ring",
                  !isCompactEligible
                    ? "opacity-50 cursor-not-allowed border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-muted)]"
                    : "cursor-pointer",
                  storedPreference === "compact"
                    ? "border-[var(--brand-accent)] bg-[var(--surface-muted)] text-[var(--text-primary)] ring-1 ring-[var(--brand-accent)] font-semibold shadow-xs"
                    : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]/70 hover:text-[var(--text-primary)]"
                )}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-semibold">Compact</span>
                  {storedPreference === "compact" && (
                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)]">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[var(--text-muted)] font-normal">
                  38px rows; mouse/trackpad pointer only.
                </span>
              </button>
            </div>
            {!isCompactEligible && (
              <p
                data-testid="pref-density-touch-notice"
                className="text-[11px] text-[var(--text-muted)] italic"
              >
                Compact mode is unavailable on touch or hybrid devices to ensure comfortable tap targets (WCAG 2.2 AA).
              </p>
            )}
          </section>

          {/* Account Profile Details */}
          {user && (
            <section
              aria-labelledby="account-heading"
              className="space-y-2 pt-2 border-t border-[var(--border-subtle)]"
            >
              <h3
                id="account-heading"
                className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider"
              >
                Account Profile
              </h3>
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--surface-muted)]/60 border border-[var(--border-subtle)] text-xs">
                <div className="h-8 w-8 rounded-full bg-[var(--brand-accent-btn-bg)] text-[var(--brand-accent-btn-text)] flex items-center justify-center font-bold flex-shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--text-primary)] truncate">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {user.email}
                  </p>
                  {(currentCommunity || activeWorkspace) && (
                    <p className="text-[10px] text-[var(--brand-accent-text)] mt-0.5 truncate">
                      {currentCommunity ? currentCommunity.name : ""}
                      {currentCommunity && activeWorkspace ? " • " : ""}
                      {activeWorkspace ? activeWorkspace.name : ""}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

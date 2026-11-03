import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog as BaseDialog,
} from "@base-ui/react";
import {
  Search,
  X,
  Check,
  SearchX,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { DialogBackdrop } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Kbd } from "@/components/ui/KeyboardShortcut";
import { cn } from "@/lib/utils";
import { isMac } from "@/lib/keyboard";
import { useOmnibar } from "./OmnibarContext";
import { useOmnibarCommands } from "./useOmnibarCommands";
import type { CommandItem, CommandGroup } from "./types";

export interface OmnibarModalProps {
  onToggleSidebar?: () => void;
}

export function OmnibarModal({ onToggleSidebar }: OmnibarModalProps): React.JSX.Element {
  const { isOpen, close, searchQuery, setSearchQuery } = useOmnibar();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { groupedCommands } = useOmnibarCommands({
    onClose: close,
    onToggleSidebar,
  });

  // Filter commands based on current search query
  const filteredGroups = useMemo<CommandGroup[]>(() => {
    const trimmed = searchQuery.trim().toLowerCase();
    if (!trimmed) {
      return groupedCommands;
    }

    return groupedCommands
      .map((group) => {
        const matchingItems = group.items.filter((item) => {
          const titleMatch = item.title.toLowerCase().includes(trimmed);
          const descMatch = item.description?.toLowerCase().includes(trimmed);
          const badgeMatch = item.badge?.toLowerCase().includes(trimmed);
          const keywordMatch = item.keywords?.some((k) =>
            k.toLowerCase().includes(trimmed)
          );
          return titleMatch || descMatch || badgeMatch || keywordMatch;
        });

        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedCommands, searchQuery]);

  // Flattened array of all currently visible items for index-based arrow navigation
  const flatVisibleItems = useMemo<CommandItem[]>(() => {
    return filteredGroups.flatMap((group) => group.items);
  }, [filteredGroups]);

  // Ensure active index is within bounds whenever visible items change
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      const focusTimer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(focusTimer);
    }
  }, [isOpen]);

  // Scroll active item into view when activeIndex changes
  useEffect(() => {
    if (!listRef.current || flatVisibleItems.length === 0) return;
    const activeItemEl = listRef.current.querySelector(
      `[data-omnibar-index="${activeIndex}"]`
    );
    if (activeItemEl && "scrollIntoView" in activeItemEl) {
      activeItemEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, flatVisibleItems.length]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flatVisibleItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % flatVisibleItems.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flatVisibleItems.length > 0) {
        setActiveIndex((prev) => (prev - 1 + flatVisibleItems.length) % flatVisibleItems.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = flatVisibleItems[activeIndex];
      if (current) {
        current.onSelect();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const mac = isMac();

  return (
    <BaseDialog.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
        }
      }}
    >
      <BaseDialog.Portal>
        <DialogBackdrop />
        <BaseDialog.Popup
          role="dialog"
          aria-label="Omnibar command palette"
          aria-modal="true"
          className={cn(
            "fixed left-1/2 -translate-x-1/2 z-50",
            "top-4 sm:top-[12%]",
            "w-[calc(100%-1.5rem)] sm:w-full max-w-xl",
            "rounded-xl border border-[var(--border-strong)]",
            "bg-[var(--surface-modal)] text-[var(--text-primary)] shadow-2xl",
            "flex flex-col overflow-hidden max-h-[85vh] sm:max-h-[580px]",
            "focus:outline-none transition-all duration-150"
          )}
        >
          {/* Header & Search Input */}
          <div className="flex items-center px-3.5 py-3 border-b border-[var(--border-subtle)] bg-[var(--surface-modal)] gap-2.5">
            <Search className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={flatVisibleItems.length > 0}
              aria-autocomplete="list"
              aria-controls="omnibar-results-list"
              aria-activedescendant={
                flatVisibleItems[activeIndex]
                  ? flatVisibleItems[activeIndex].id
                  : undefined
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search navigation..."
              className={cn(
                "flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none focus:ring-0 border-none p-0 select-text"
              )}
            />

            {/* Clear button if text entered */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear search input"
                className={cn(
                  "p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]",
                  // 44x44px touch bounding box on mobile
                  "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 sm:after:hidden"
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Esc badge indicator / Close trigger */}
            <BaseDialog.Close
              render={
                <button
                  type="button"
                  aria-label="Close command palette"
                  onClick={close}
                  className={cn(
                    "p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded transition-colors",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-focus)]",
                    // 44x44px touch bounding box on mobile
                    "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 sm:after:hidden"
                  )}
                >
                  <Kbd className="hidden sm:inline-flex text-[10px]">esc</Kbd>
                  <X className="h-4 w-4 sm:hidden" />
                </button>
              }
            />
          </div>

          {/* Results List / Empty State */}
          <div
            ref={listRef}
            id="omnibar-results-list"
            role="listbox"
            aria-label="Commands"
            className="flex-1 overflow-y-auto p-2 space-y-3 overscroll-contain"
          >
            {flatVisibleItems.length === 0 ? (
              <div
                role="status"
                className="py-10 px-4 text-center flex flex-col items-center justify-center space-y-2 select-none"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
                  <SearchX className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No commands or navigation results
                </p>
                <p className="text-xs text-[var(--text-muted)] max-w-xs leading-relaxed">
                  No matching results for &ldquo;{searchQuery}&rdquo;. Try searching for navigation, workspaces, or appearance settings.
                </p>
              </div>
            ) : (
              (() => {
                let currentFlatIndex = 0;
                return filteredGroups.map((group) => {
                  const headingId = `omnibar-group-${group.category}`;
                  return (
                    <div
                      key={group.category}
                      role="group"
                      aria-labelledby={headingId}
                      className="space-y-1"
                    >
                      <div
                        id={headingId}
                        className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] select-none"
                      >
                        {group.label}
                      </div>

                      {group.items.map((item) => {
                        const itemIndex = currentFlatIndex++;
                        const isSelected = itemIndex === activeIndex;
                        const Icon = item.icon;

                        return (
                          <div
                            key={item.id}
                            id={item.id}
                            role="option"
                            aria-selected={isSelected}
                            data-omnibar-index={itemIndex}
                            tabIndex={-1}
                            onClick={() => item.onSelect()}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            className={cn(
                              "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors duration-75",
                              // Enforce minimum 44px touch target height
                              "min-h-[44px]",
                              isSelected
                                ? "bg-[var(--surface-muted)] text-[var(--brand-accent-text)] ring-1 ring-[var(--border-focus)] font-medium"
                                : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]/60"
                            )}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0 flex-1 pr-2">
                              {Icon && (
                                <Icon
                                  className={cn(
                                    "h-4 w-4 flex-shrink-0",
                                    isSelected
                                      ? "text-[var(--brand-accent-text)]"
                                      : "text-[var(--text-muted)]"
                                  )}
                                />
                              )}
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-xs font-medium leading-tight truncate">
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p className="text-[11px] text-[var(--text-muted)] leading-tight truncate">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {item.badge && (
                                <Badge
                                  variant={item.badgeVariant || "outline"}
                                  size="sm"
                                  className="font-mono text-[10px] uppercase tracking-wider px-1.5 py-0"
                                >
                                  {item.badge}
                                </Badge>
                              )}

                              {item.shortcut && (
                                <Kbd className="text-[10px]">
                                  {mac
                                    ? item.shortcut.replace("Mod+", "⌘")
                                    : item.shortcut.replace("Mod+", "Ctrl+")}
                                </Kbd>
                              )}

                              {item.isActive && (
                                <Check
                                  className="h-3.5 w-3.5 text-[var(--brand-accent-text)]"
                                  aria-label="Active selection"
                                />
                              )}

                              {isSelected && !item.shortcut && (
                                <CornerDownLeft
                                  className="h-3 w-3 text-[var(--text-muted)] hidden sm:inline-block"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()
            )}
          </div>

          {/* Footer Navigation Bar */}
          <div className="px-3.5 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
            <span className="truncate max-w-[200px] sm:max-w-none">
              Sonder Commands &amp; Navigation
            </span>
            <div className="hidden sm:flex items-center space-x-3 text-[10px]">
              <span className="inline-flex items-center gap-1">
                <Kbd className="p-0.5 text-[9px]"><ArrowUp className="h-2.5 w-2.5 inline" /></Kbd>
                <Kbd className="p-0.5 text-[9px]"><ArrowDown className="h-2.5 w-2.5 inline" /></Kbd>
                navigate
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd className="px-1 py-0.5 text-[9px]">↵</Kbd>
                select
              </span>
              <span className="inline-flex items-center gap-1">
                <Kbd className="px-1 py-0.5 text-[9px]">esc</Kbd>
                close
              </span>
            </div>
          </div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

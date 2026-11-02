import React, { forwardRef, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./Input";

export interface SearchInputProps extends Omit<InputProps, "leftIcon" | "rightIcon"> {
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { className, value, onChange, onClear, shortcut, disabled, ...props },
  ref
) {
  const internalRef = useRef<HTMLInputElement>(null);
  const inputRef = (ref as React.RefObject<HTMLInputElement>) || internalRef;

  const hasValue = value !== undefined && value !== null && String(value).length > 0;

  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    if (inputRef && "current" in inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="relative w-full" role="search">
      <Input
        ref={inputRef}
        type="search"
        value={value}
        onChange={onChange}
        disabled={disabled}
        leftIcon={<Search className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />}
        rightIcon={
          <div className="flex items-center gap-1.5 pointer-events-auto">
            {hasValue && onClear && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search query"
                className={cn(
                  "p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
                  // touch bounding box
                  "relative after:content-[''] after:absolute after:-inset-2 sm:after:hidden"
                )}
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {shortcut && !hasValue && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded select-none pointer-events-none">
                {shortcut}
              </kbd>
            )}
          </div>
        }
        className={cn(hasValue && onClear ? "pr-8" : shortcut ? "pr-12" : "", className)}
        {...props}
      />
    </div>
  );
});

SearchInput.displayName = "SearchInput";

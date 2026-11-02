import React from "react";
import { cn } from "@/lib/utils";

export interface KeyboardShortcutProps
  extends React.HTMLAttributes<HTMLElement> {
  keys?: string[];
  shortcut?: string;
}

export function KeyboardShortcut({
  children,
  keys,
  shortcut,
  className,
  ...props
}: KeyboardShortcutProps) {
  let displayKeys: string[] = [];

  if (keys && keys.length > 0) {
    displayKeys = keys;
  } else if (shortcut) {
    displayKeys = shortcut.split("+").map((k) => k.trim());
  }

  return (
    <kbd
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[11px] font-medium select-none",
        "px-1.5 py-0.5 rounded",
        "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
        "border border-slate-200 dark:border-slate-700 shadow-2xs",
        className
      )}
      {...props}
    >
      {displayKeys.length > 0
        ? displayKeys.map((key, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-slate-400 dark:text-slate-500 text-[10px]">+</span>}
              <span>{key}</span>
            </React.Fragment>
          ))
        : children}
    </kbd>
  );
}

export const Kbd = KeyboardShortcut;
KeyboardShortcut.displayName = "KeyboardShortcut";

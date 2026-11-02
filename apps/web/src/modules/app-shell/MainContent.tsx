import React from "react";
import { cn } from "@/lib/utils";

export interface MainContentProps {
  children?: React.ReactNode;
  className?: string;
}

export function MainContent({
  children,
  className,
}: MainContentProps): React.JSX.Element {
  return (
    <main
      role="main"
      className={cn(
        "flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--surface-canvas)] text-[var(--text-primary)] focus:outline-none transition-colors duration-150",
        className
      )}
      tabIndex={-1}
    >
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {children}
      </div>
    </main>
  );
}

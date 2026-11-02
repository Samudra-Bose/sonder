import React from "react";
import { Tabs as BaseTabs } from "@base-ui/react";
import { cn } from "@/lib/utils";

export const Tabs = BaseTabs.Root;
export const TabsIndicator = BaseTabs.Indicator;

export interface TabsListProps
  extends React.ComponentPropsWithoutRef<typeof BaseTabs.List> {
  className?: string;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  function TabsList({ className, ...props }, ref) {
    return (
      <BaseTabs.List
        ref={ref}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-lg bg-[var(--surface-muted)] border border-[var(--border-subtle)] p-1 text-[var(--text-muted)] gap-1 select-none",
          className
        )}
        {...props}
      />
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof BaseTabs.Tab> {
  className?: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  function TabsTrigger({ className, ...props }, ref) {
    return (
      <BaseTabs.Tab
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium transition-all select-none",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-canvas)]",
          "disabled:pointer-events-none disabled:opacity-50",
          "data-[active]:bg-[var(--surface-card)] data-[active]:text-[var(--text-primary)] data-[active]:shadow-xs",
          // 44x44px mobile touch bounding box
          "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] after:w-full after:h-full sm:after:hidden",
          className
        )}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

export interface TabsContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseTabs.Panel> {
  className?: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  function TabsContent({ className, ...props }, ref) {
    return (
      <BaseTabs.Panel
        ref={ref}
        className={cn(
          "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded-md",
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

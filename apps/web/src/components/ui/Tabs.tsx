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
          "inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800/80 p-1 text-slate-500 dark:text-slate-400 gap-1 select-none",
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
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          "hover:text-slate-900 dark:hover:text-slate-100",
          "data-[active]:bg-white dark:data-[active]:bg-slate-900 data-[active]:text-slate-900 dark:data-[active]:text-slate-100 data-[active]:shadow-xs",
          // Mobile touch target
          "relative touch-manipulation after:content-[''] after:absolute after:inset-y-0 after:left-1/2 after:-translate-x-1/2 after:min-w-[44px] after:min-h-[44px] sm:after:hidden",
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
          "mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md",
          className
        )}
        {...props}
      />
    );
  }
);
TabsContent.displayName = "TabsContent";

import React, { forwardRef } from "react";
import { Separator as BaseSeparator } from "@base-ui/react";
import { cn } from "@/lib/utils";

export interface SeparatorProps
  extends React.ComponentPropsWithoutRef<typeof BaseSeparator> {
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export const Separator = forwardRef<HTMLDivElement, SeparatorProps>(function Separator(
  { className, orientation = "horizontal", ...props },
  ref
) {
  return (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-slate-200 dark:bg-slate-800",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
      {...props}
    />
  );
});

Separator.displayName = "Separator";

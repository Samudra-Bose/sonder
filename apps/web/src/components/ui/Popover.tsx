import React from "react";
import { Popover as BasePopover } from "@base-ui/react";
import { cn } from "@/lib/utils";

export const Popover = BasePopover.Root;
export const PopoverTrigger = BasePopover.Trigger;
export const PopoverPortal = BasePopover.Portal;
export const PopoverClose = BasePopover.Close;
export const PopoverTitle = BasePopover.Title;
export const PopoverDescription = BasePopover.Description;

export type PopoverSize = "default" | "compact";

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof BasePopover.Popup> {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  size?: PopoverSize;
  className?: string;
}

const sizeStyles: Record<PopoverSize, string> = {
  default: "w-72 p-4 rounded-lg",
  compact: "w-auto min-w-[140px] p-1.5 rounded-md",
};

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  PopoverContentProps
>(function PopoverContent(
  {
    className,
    side = "bottom",
    align = "center",
    sideOffset = 4,
    size = "default",
    children,
    ...props
  },
  ref
) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner side={side} align={align} sideOffset={sideOffset} className="z-[70]">
        <BasePopover.Popup
          ref={ref}
          className={cn(
            "z-[70] border border-[var(--border-strong)]",
            "bg-[var(--surface-drawer)] text-[var(--text-primary)] shadow-lg outline-none",
            "transition-all duration-150",
            sizeStyles[size],
            className
          )}
          {...props}
        >
          {children}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
});
PopoverContent.displayName = "PopoverContent";

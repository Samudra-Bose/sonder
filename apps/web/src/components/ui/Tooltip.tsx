import React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react";
import { cn } from "@/lib/utils";

export const TooltipProvider = BaseTooltip.Provider;
export const TooltipRoot = BaseTooltip.Root;
export const TooltipTrigger = BaseTooltip.Trigger;
export const TooltipPortal = BaseTooltip.Portal;
export const TooltipPositioner = BaseTooltip.Positioner;
export const TooltipPopup = BaseTooltip.Popup;
export const TooltipArrow = BaseTooltip.Arrow;

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delay?: number;
  closeDelay?: number;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  sideOffset = 6,
  delay = 200,
  closeDelay = 100,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) {
    return children;
  }

  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger
        delay={delay}
        closeDelay={closeDelay}
        render={children}
      />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} align={align} sideOffset={sideOffset}>
          <BaseTooltip.Popup
            className={cn(
              "z-50 px-2 py-1 text-xs font-medium rounded-md shadow-md select-none",
              "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900",
              "border border-slate-800 dark:border-slate-200",
              "transition-opacity duration-150 data-[state=delayed-open]:opacity-100 data-[state=closed]:opacity-0"
            )}
          >
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}

Tooltip.Provider = TooltipProvider;
Tooltip.Root = TooltipRoot;
Tooltip.Trigger = TooltipTrigger;
Tooltip.Portal = TooltipPortal;
Tooltip.Positioner = TooltipPositioner;
Tooltip.Popup = TooltipPopup;
Tooltip.Arrow = TooltipArrow;

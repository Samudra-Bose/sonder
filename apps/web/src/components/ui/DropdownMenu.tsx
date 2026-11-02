import React from "react";
import { Menu as BaseMenu } from "@base-ui/react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const DropdownMenu = BaseMenu.Root;
export const DropdownMenuGroup = BaseMenu.Group;
export const DropdownMenuPortal = BaseMenu.Portal;
export const DropdownMenuSub = BaseMenu.SubmenuRoot;
export const DropdownMenuRadioGroup = BaseMenu.RadioGroup;

export interface DropdownMenuTriggerProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger> {
  className?: string;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(function DropdownMenuTrigger({ className, ...props }, ref) {
  return (
    <BaseMenu.Trigger
      ref={ref}
      className={cn("outline-none", className)}
      {...props}
    />
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export interface DropdownMenuContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  className?: string;
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(function DropdownMenuContent(
  { className, side = "bottom", align = "start", sideOffset = 4, children, ...props },
  ref
) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset}>
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800",
            "bg-white dark:bg-slate-900 p-1 text-slate-900 dark:text-slate-100 shadow-md",
            "focus-visible:outline-none",
            className
          )}
          {...props}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
});
DropdownMenuContent.displayName = "DropdownMenuContent";

export interface DropdownMenuItemProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  inset?: boolean;
  destructive?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  DropdownMenuItemProps
>(function DropdownMenuItem(
  { className, inset, destructive, ...props },
  ref
) {
  return (
    <BaseMenu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium outline-none transition-colors",
        "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800 data-[highlighted]:text-slate-900 dark:data-[highlighted]:text-slate-100",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        destructive &&
          "text-red-600 dark:text-red-400 data-[highlighted]:bg-red-50 dark:data-[highlighted]:bg-red-950/50 data-[highlighted]:text-red-700 dark:data-[highlighted]:text-red-300",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export interface DropdownMenuLabelProps
  extends React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel> {
  inset?: boolean;
}

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  DropdownMenuLabelProps
>(function DropdownMenuLabel({ className, inset, ...props }, ref) {
  return (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cn(
        "px-2 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none",
        inset && "pl-8",
        className
      )}
      {...props}
    />
  );
});
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <BaseMenu.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-slate-200 dark:bg-slate-800", className)}
      {...props}
    />
  );
});
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export const DropdownMenuCheckboxItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>
>(function DropdownMenuCheckboxItem(
  { className, children, checked, ...props },
  ref
) {
  return (
    <BaseMenu.CheckboxItem
      ref={ref}
      checked={checked}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-xs font-medium outline-none transition-colors",
        "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <BaseMenu.CheckboxItemIndicator>
          <Check className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseMenu.CheckboxItem>
  );
});
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

export const DropdownMenuSubTrigger = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> & {
    inset?: boolean;
  }
>(function DropdownMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <BaseMenu.SubmenuTrigger
      ref={ref}
      className={cn(
        "flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 text-xs font-medium outline-none",
        "data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-800",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
    </BaseMenu.SubmenuTrigger>
  );
});
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger";

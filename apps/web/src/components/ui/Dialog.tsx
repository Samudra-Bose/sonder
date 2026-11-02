import React from "react";
import { Dialog as BaseDialog } from "@base-ui/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogPortal = BaseDialog.Portal;
export const DialogClose = BaseDialog.Close;

export interface DialogBackdropProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop> {
  className?: string;
}

export const DialogBackdrop = React.forwardRef<
  HTMLDivElement,
  DialogBackdropProps
>(function DialogBackdrop({ className, ...props }, ref) {
  return (
    <BaseDialog.Backdrop
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity duration-150",
        className
      )}
      {...props}
    />
  );
});
DialogBackdrop.displayName = "DialogBackdrop";

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  className?: string;
  showCloseButton?: boolean;
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  DialogContentProps
>(function DialogContent(
  { className, children, showCloseButton = true, ...props },
  ref
) {
  return (
    <BaseDialog.Portal>
      <DialogBackdrop />
      <BaseDialog.Popup
        ref={ref}
        className={cn(
          "fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
          "w-full max-w-lg rounded-xl border border-[var(--border-strong)]",
          "bg-[var(--surface-modal)] p-6 text-[var(--text-primary)] shadow-2xl transition-all duration-150",
          "focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <BaseDialog.Close
            aria-label="Close dialog"
            className={cn(
              "absolute right-4 top-4 rounded-sm p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
              // 44x44px mobile touch bounding box
              "relative touch-manipulation after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 sm:after:hidden"
            )}
          >
            <X className="h-4 w-4" />
          </BaseDialog.Close>
        )}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
});
DialogContent.displayName = "DialogContent";

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 text-left mb-4", className)}
      {...props}
    />
  );
}
DialogHeader.displayName = "DialogHeader";

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 gap-2 mt-6",
        className
      )}
      {...props}
    />
  );
}
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(function DialogTitle({ className, ...props }, ref) {
  return (
    <BaseDialog.Title
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-[var(--text-primary)]",
        className
      )}
      {...props}
    />
  );
});
DialogTitle.displayName = "DialogTitle";

export const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(function DialogDescription({ className, ...props }, ref) {
  return (
    <BaseDialog.Description
      ref={ref}
      className={cn("text-sm text-[var(--text-muted)] mt-1", className)}
      {...props}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

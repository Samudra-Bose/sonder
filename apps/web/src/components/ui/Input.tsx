import React, { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: InputSize;
}

const sizeStyles: Record<InputSize, { input: string; icon: string }> = {
  sm: { input: "h-8 px-2.5 text-xs", icon: "w-3.5 h-3.5" },
  md: { input: "h-9 px-3 text-sm", icon: "w-4 h-4" },
  lg: { input: "h-10 px-3.5 text-base", icon: "w-5 h-5" },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    className,
    type = "text",
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    inputSize = "md",
    id: customId,
    disabled,
    "aria-describedby": customDescribedBy,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = customId || (label ? `input-${generatedId}` : undefined);
  const errorId = error ? `error-${generatedId}` : undefined;
  const helperId = helperText ? `helper-${generatedId}` : undefined;

  const describedBy =
    [errorId, helperId, customDescribedBy].filter(Boolean).join(" ") || undefined;

  const currentSize = sizeStyles[inputSize];

  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-[var(--text-secondary)] select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span
            className={cn(
              "absolute left-3 flex items-center pointer-events-none text-[var(--text-muted)]",
              currentSize.icon
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-md border bg-[var(--surface-card)] text-[var(--text-primary)]",
            "placeholder:text-[var(--text-muted)]",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--surface-canvas)]",
            // Semantic boundary contrast per SC 1.4.11
            error
              ? "border-[var(--feedback-danger-text)] focus:border-[var(--feedback-danger-text)] focus-visible:ring-[var(--feedback-danger-text)]"
              : "border-[var(--border-control)] focus:border-[var(--brand-accent-text)] focus-visible:ring-[var(--border-focus)]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[var(--surface-muted)]",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            currentSize.input,
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div
            className="absolute right-3 flex items-center text-[var(--text-muted)]"
          >
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-[var(--feedback-danger-text)]">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-[var(--text-muted)]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

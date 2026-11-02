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
          className="text-xs font-medium text-slate-700 dark:text-slate-300 select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {leftIcon && (
          <span
            className={cn(
              "absolute left-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400",
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
            "w-full rounded-md border bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
            "placeholder:text-slate-400 dark:placeholder:text-slate-500",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
            // 3.0:1 component boundary contrast per SC 1.4.11
            error
              ? "border-red-600 focus:border-red-600 focus-visible:ring-red-500"
              : "border-slate-500 dark:border-slate-400 focus:border-sky-600 dark:focus:border-sky-400",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100 dark:disabled:bg-slate-800",
            leftIcon ? "pl-9" : "",
            rightIcon ? "pr-9" : "",
            currentSize.input,
            className
          )}
          {...props}
        />

        {rightIcon && (
          <div
            className="absolute right-3 flex items-center text-slate-500 dark:text-slate-400"
          >
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

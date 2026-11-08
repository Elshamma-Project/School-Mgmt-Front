"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { controlBase, controlDisabled } from "@/lib/ui/classes";
import { cn } from "@/lib/utils/cn";

export type IconInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  invalid?: boolean;
};

/** Champ de saisie avec icône intégrée à gauche. */
export const IconInput = forwardRef<HTMLInputElement, IconInputProps>(
  function IconInput({ className, type = "text", icon, invalid, disabled, ...props }, ref) {
    return (
      <div
        className={cn(
          "group relative flex h-[var(--control-height-md)] w-full items-center bg-[var(--ios-fill)]",
          controlBase,
          !disabled && "focus-within:bg-[var(--ios-card)] focus-within:shadow-[var(--focus-ring)]",
          invalid && "shadow-[0_0_0_3px_color-mix(in_srgb,var(--ios-danger)_28%,transparent)]",
          disabled && "opacity-45",
        )}
      >
        <span
          className={cn(
            "pointer-events-none absolute left-3.5 inline-flex text-[var(--ios-secondary-label)] transition-colors",
            !disabled && "group-focus-within:text-[var(--ios-blue)]",
          )}
          aria-hidden
        >
          {icon}
        </span>
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-full w-full bg-transparent py-0 pl-11 pr-3.5 text-[var(--text-body)] text-[var(--ios-label)] outline-none placeholder:text-[var(--ios-tertiary-label)] focus-visible:outline-none",
            controlDisabled,
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

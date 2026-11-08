"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
};

/** Interrupteur iOS. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    { checked, onCheckedChange, label, disabled, className, id, ...props },
    ref,
  ) {
    return (
      <div className={cn("inline-flex items-center gap-2.5", className)}>
        {label ? (
          <label
            htmlFor={id}
            className={cn(
              "text-[var(--text-body)] text-[var(--ios-label)]",
              disabled ? "opacity-45" : "cursor-pointer",
            )}
          >
            {label}
          </label>
        ) : null}
        <button
          ref={ref}
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onCheckedChange(!checked)}
          className={cn(
            "relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45",
            checked ? "bg-[var(--ios-success)]" : "bg-[var(--ios-fill-tertiary)]",
          )}
          {...props}
        >
          <span
            aria-hidden
            className={cn(
              "absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[var(--ios-shadow-sm)] transition-transform duration-[var(--duration-normal)] ease-[var(--ease-emphasized)]",
              checked && "translate-x-[20px]",
            )}
          />
        </button>
      </div>
    );
  },
);

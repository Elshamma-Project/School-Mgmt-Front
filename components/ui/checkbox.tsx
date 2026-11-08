"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, label, id, disabled, ...props }, ref) {
    return (
      <label
        htmlFor={id}
        className={cn(
          "inline-flex items-center gap-2.5 select-none",
          disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer",
          className,
        )}
      >
        <span className="relative inline-flex size-5 shrink-0">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            disabled={disabled}
            className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            {...props}
          />
          <span
            aria-hidden
            className="pointer-events-none flex size-5 items-center justify-center rounded-[var(--radius-xs)] border border-[var(--ios-fill-tertiary)] bg-[var(--ios-card)] transition-colors peer-checked:border-[var(--ios-blue)] peer-checked:bg-[var(--ios-blue)] peer-focus-visible:shadow-[var(--focus-ring)] peer-checked:[&>svg]:opacity-100"
          >
            <Check className="size-3 stroke-[2.5] text-white opacity-0 transition-opacity" />
          </span>
        </span>
        {label ? (
          <span className="text-[var(--text-body)] text-[var(--ios-label)]">{label}</span>
        ) : null}
      </label>
    );
  },
);

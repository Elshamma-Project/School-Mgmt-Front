"use client";

import { cn } from "@/lib/utils/cn";

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  className?: string;
};

/** Contrôle segmenté style iOS (FR|EN, filtres, etc.). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-[var(--radius-sm)] bg-[var(--ios-fill)] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "pressable min-w-10 shrink-0 whitespace-nowrap rounded-[var(--radius-xs)] px-2.5 py-1.5 text-[var(--text-footnote)] font-semibold transition-colors focus-visible:shadow-[var(--focus-ring)]",
              active
                ? "bg-[var(--ios-card)] text-[var(--ios-label)] shadow-[var(--ios-shadow-sm)]"
                : "text-[var(--ios-secondary-label)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

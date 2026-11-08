"use client";

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export type StatTone = "blue" | "green" | "amber" | "slate";

type StatCardProps = {
  label: string;
  value: number;
  icon: ReactNode;
  tone: StatTone;
  loading?: boolean;
  active?: boolean;
  onSelect?: () => void;
};

const toneStyles: Record<StatTone, { icon: string; value: string; ring: string }> = {
  blue: {
    icon: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
    value: "text-[var(--ios-blue)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-blue)_35%,transparent)]",
  },
  green: {
    icon: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
    value: "text-[var(--ios-success)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-success)_35%,transparent)]",
  },
  amber: {
    icon: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
    value: "text-[var(--ios-warning)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-warning)_35%,transparent)]",
  },
  slate: {
    icon: "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
    value: "text-[var(--ios-label)]",
    ring: "ring-[color-mix(in_srgb,var(--ios-fill-tertiary)_55%,transparent)]",
  },
};

export function StatCard({
  label,
  value,
  icon,
  tone,
  loading,
  active = false,
  onSelect,
}: StatCardProps) {
  const styles = toneStyles[tone];
  const interactive = Boolean(onSelect);

  return (
    <button
      type="button"
      disabled={!interactive || loading}
      aria-pressed={interactive ? active : undefined}
      onClick={onSelect}
      className={cn(
        "group relative w-full overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--ios-card)] text-left shadow-[var(--ios-shadow)] transition-[box-shadow,border-color,transform] duration-[var(--duration-fast)]",
        active
          ? cn("border-transparent ring-2", styles.ring)
          : "border-[var(--ios-separator)]/55",
        interactive &&
          !loading &&
          "pressable hover:border-[var(--ios-separator)] hover:shadow-[var(--ios-shadow-md)] focus-visible:shadow-[var(--focus-ring)]",
        (!interactive || loading) && "cursor-default",
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3.5 sm:gap-3.5 sm:px-4 sm:py-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-11",
            styles.icon,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)] sm:text-[11px]">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-14" />
          ) : (
            <p
              className={cn(
                "mt-1 text-[26px] font-semibold leading-none tracking-[-0.03em] tabular-nums sm:text-[28px]",
                active ? styles.value : "text-[var(--ios-label)]",
              )}
            >
              {value}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

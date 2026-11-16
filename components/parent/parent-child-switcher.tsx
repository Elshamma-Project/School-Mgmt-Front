"use client";

import { useTranslations } from "next-intl";
import { childInitials } from "@/lib/parent/use-parent-children";
import type { StudentResponse } from "@/lib/api/student";
import { cn } from "@/lib/utils/cn";

type Props = {
  childrenList: StudentResponse[];
  selectedId: string;
  onSelect: (id: string) => void;
  className?: string;
};

/** Puces de sélection d’enfant — une seule composition, sans cards décoratives. */
export function ParentChildSwitcher({
  childrenList,
  selectedId,
  onSelect,
  className,
}: Props) {
  const t = useTranslations("parentSpace");

  if (childrenList.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
        {t("childSwitcherLabel")}
      </p>
      <div
        role="tablist"
        aria-label={t("childSwitcherLabel")}
        className="flex flex-wrap gap-2"
      >
        {childrenList.map((child) => {
          const active = child.id === selectedId;
          return (
            <button
              key={child.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(child.id)}
              className={cn(
                "pressable inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1.5 text-left transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
                active
                  ? "border-[color-mix(in_srgb,var(--ios-blue)_35%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-label)]"
                  : "border-[var(--ios-separator)]/60 bg-[var(--ios-card)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]",
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  active
                    ? "bg-[var(--ios-blue)] text-white"
                    : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
                )}
                aria-hidden
              >
                {childInitials(child)}
              </span>
              <span className="min-w-0 truncate text-[13px] font-medium tracking-[-0.01em]">
                {child.fullName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

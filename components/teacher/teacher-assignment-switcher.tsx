"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  localizedLabel,
  type TeacherAssignmentResponse,
} from "@/lib/api/academic";
import { formatCoefficient } from "@/lib/grading/marks";
import { cn } from "@/lib/utils/cn";

type Props = {
  assignments: TeacherAssignmentResponse[];
  selectedId: string | null;
  onSelect: (classSubjectId: string) => void;
  className?: string;
};

function classInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const token = trimmed.split(/\s+/)[0] ?? trimmed;
  return token.slice(0, 2).toUpperCase();
}

/** Sélecteur matière / classe — même langage que le sélecteur d’enfant parent. */
export function TeacherAssignmentSwitcher({
  assignments,
  selectedId,
  onSelect,
  className,
}: Props) {
  const t = useTranslations("teacherSpace");
  const locale = useLocale();

  if (assignments.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-tertiary-label)]">
        {t("assignmentSwitcherLabel")}
      </p>
      <div
        role="tablist"
        aria-label={t("assignmentSwitcherLabel")}
        className="flex flex-wrap gap-2"
      >
        {assignments.map((item) => {
          const active = item.classSubjectId === selectedId;
          const subject = localizedLabel(item.subjectName, locale);
          return (
            <button
              key={item.classSubjectId}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(item.classSubjectId)}
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
                {classInitial(item.className)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium tracking-[-0.01em]">
                  {item.className}
                  <span className="text-[var(--ios-tertiary-label)]"> · </span>
                  {subject}
                </span>
              </span>
              <Badge tone={active ? "blue" : "neutral"} className="shrink-0">
                {formatCoefficient(item.coefficient, locale)}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}

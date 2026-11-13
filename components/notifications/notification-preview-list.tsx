"use client";

import { ChevronRight, FileWarning } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type {
  InAppNotificationResponse,
  NotificationCategory,
  NotificationSeverity,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";

function localized(
  text: { fr: string | null; en: string | null },
  locale: string,
): string {
  if (locale.startsWith("en")) return text.en || text.fr || "—";
  return text.fr || text.en || "—";
}

type Accent = {
  chip: string;
};

function accentFor(
  category: NotificationCategory,
  severity: NotificationSeverity,
): Accent {
  if (category === "SESSION_CLOSED" || severity === "URGENT") {
    return {
      chip: "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
    };
  }
  if (category === "CORRECTION_REQUESTED" || category === "STAFF_SIGNAL") {
    return {
      chip: "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
    };
  }
  if (category === "CORRECTION_DECIDED" || severity === "SUCCESS") {
    return {
      chip: "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
    };
  }
  if (category === "REPORT_SHEET_REJECTED") {
    return {
      chip: "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
    };
  }
  return {
    chip: "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
  };
}

type Props = {
  rows: InAppNotificationResponse[];
  loading?: boolean;
  emptyLabel: string;
  onSelect: (row: InAppNotificationResponse) => void;
};

/** Liste compacte pour le menu cloche (aperçu). */
export function NotificationPreviewList({
  rows,
  loading = false,
  emptyLabel,
  onSelect,
}: Props) {
  const t = useTranslations("notifications");
  const locale = useLocale();

  const formatWhen = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="space-y-2.5 px-3 py-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[72px] animate-pulse rounded-[var(--radius-md)] bg-[var(--ios-fill)]/70"
          />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]">
          <FileWarning className="size-5 stroke-[1.5]" aria-hidden />
        </span>
        <p className="text-[12px] leading-snug text-[var(--ios-secondary-label)]">
          {emptyLabel}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2 px-2.5 py-2.5">
      {rows.map((row) => {
        const accent = accentFor(row.category, row.severity);
        return (
          <li key={row.id}>
            <button
              type="button"
              onClick={() => onSelect(row)}
              className={cn(
                "pressable group flex w-full rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-[background-color,border-color,box-shadow] duration-150",
                "focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                row.unread
                  ? "border-[color-mix(in_srgb,var(--ios-blue)_22%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_7%,var(--ios-card))] shadow-[var(--ios-shadow-sm)]"
                  : "border-[var(--ios-separator)]/50 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] hover:border-[var(--ios-separator)] hover:bg-[var(--ios-fill)]/80",
              )}
            >
              <span className="min-w-0 flex-1 space-y-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="inline-flex max-w-full items-center gap-1.5">
                    <span
                      className={cn(
                        "truncate rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em]",
                        accent.chip,
                      )}
                    >
                      {t(`category.${row.category}`)}
                    </span>
                    {row.unread ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-blue)]">
                        <span className="size-1.5 rounded-full bg-[var(--ios-blue)]" aria-hidden />
                        {t("badge.unread")}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight
                    className="mt-0.5 size-3.5 shrink-0 stroke-[1.75] text-[var(--ios-tertiary-label)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ios-secondary-label)]"
                    aria-hidden
                  />
                </span>

                <span className="block text-[13px] font-bold leading-snug tracking-[-0.01em] text-[var(--ios-label)]">
                  {localized(row.title, locale)}
                </span>
                <span className="line-clamp-2 overflow-hidden break-words text-[11.5px] leading-snug text-[var(--ios-label)]/80">
                  {localized(row.body, locale)}
                </span>
                <span className="block pt-0.5 text-[10px] tabular-nums text-[var(--ios-secondary-label)]">
                  {formatWhen(row.createdAt)}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

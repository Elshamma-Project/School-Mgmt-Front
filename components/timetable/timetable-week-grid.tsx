"use client";

import { useLocale, useTranslations } from "next-intl";
import type {
  DayOfWeek,
  GridPeriodDto,
  TimeSlotGridResponse,
  TimetableEntryResponse,
} from "@/lib/api/timetable";
import { entryDisplayLabel, formatTimeRange, sortDays } from "@/lib/timetable/format";
import { cn } from "@/lib/utils/cn";

type Props = {
  grid: TimeSlotGridResponse;
  entries: TimetableEntryResponse[];
  canEdit: boolean;
  /** Affiche le nom de classe sous le libellé (vue enseignant multi-classes). */
  classNameById?: Record<string, string>;
  onCellClick?: (args: {
    day: DayOfWeek;
    startPeriod: number | null;
    entries: TimetableEntryResponse[];
  }) => void;
};

function coversPeriod(entry: TimetableEntryResponse, periodNumber: number): boolean {
  if (entry.startPeriod == null) return false;
  const last = entry.startPeriod + Math.max(1, entry.periodCount) - 1;
  return periodNumber >= entry.startPeriod && periodNumber <= last;
}

export function TimetableWeekGrid({
  grid,
  entries,
  canEdit,
  classNameById,
  onCellClick,
}: Props) {
  const t = useTranslations("timetableHub");
  const locale = useLocale();
  const days = sortDays(grid.days);
  const periods = grid.periods;
  const interactive = Boolean(onCellClick);

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--ios-separator)] bg-[var(--ios-card)]">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
            <th className="sticky left-0 z-[1] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))] px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
              {t("grid.period")}
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="px-2 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]"
              >
                {t(`days.${day}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((period, rowIndex) => {
            const isLesson = period.kind === "LESSON" && period.number != null;
            const rowLabel = isLesson
              ? `P${period.number}`
              : period.label
                ? locale.startsWith("en")
                  ? period.label.en || period.label.fr
                  : period.label.fr || period.label.en
                : period.kind;
            return (
              <tr
                key={`${period.kind}-${period.number ?? rowIndex}-${period.start}`}
                className={cn(
                  "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                  !isLesson && "bg-[color-mix(in_srgb,var(--ios-fill)_35%,transparent)]",
                )}
              >
                <td className="sticky left-0 z-[1] bg-[var(--ios-card)] px-3 py-2 align-top">
                  <div className="text-[12px] font-semibold text-[var(--ios-label)]">{rowLabel}</div>
                  <div className="text-[10px] tabular-nums text-[var(--ios-secondary-label)]">
                    {formatTimeRange(period.start, period.end)}
                  </div>
                </td>
                {days.map((day) => {
                  if (!isLesson) {
                    return (
                      <td
                        key={`${day}-${rowIndex}`}
                        className="px-1.5 py-1.5 text-center text-[10px] text-[var(--ios-tertiary-label)]"
                      >
                        —
                      </td>
                    );
                  }
                  const cellEntries = entries.filter(
                    (e) => e.day === day && coversPeriod(e, period.number!),
                  );
                  const starters = cellEntries.filter((e) => e.startPeriod === period.number);
                  const isContinuation = cellEntries.length > 0 && starters.length === 0;
                  return (
                    <td key={`${day}-${period.number}`} className="p-1 align-top">
                      <button
                        type="button"
                        disabled={!interactive || (!canEdit && starters.length === 0)}
                        onClick={() =>
                          onCellClick?.({
                            day,
                            startPeriod: period.number,
                            entries: starters.length ? starters : cellEntries,
                          })
                        }
                        className={cn(
                          "flex min-h-[52px] w-full flex-col gap-0.5 rounded-xl border px-1.5 py-1 text-left transition",
                          starters.length > 0
                            ? "border-[color-mix(in_srgb,var(--ios-blue)_35%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))]"
                            : isContinuation
                              ? "border-transparent bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)]"
                              : "border-dashed border-[var(--ios-separator)]",
                          interactive && canEdit && "hover:bg-[var(--ios-fill)] cursor-pointer",
                          interactive && !canEdit && starters.length > 0 && "cursor-pointer",
                        )}
                      >
                        {starters.length === 0 ? (
                          <span className="text-[10px] text-[var(--ios-tertiary-label)]">
                            {isContinuation ? "" : canEdit ? t("grid.add") : ""}
                          </span>
                        ) : (
                          starters.map((item) => (
                            <span key={item.id} className="block leading-tight">
                              <span className="block text-[11px] font-semibold text-[var(--ios-label)]">
                                {entryDisplayLabel({
                                  subjectLabel: item.subjectLabel,
                                  label: item.label,
                                  optionCode: item.optionCode,
                                  locale,
                                })}
                              </span>
                              {classNameById?.[item.classId] ? (
                                <span className="block text-[10px] text-[var(--ios-secondary-label)]">
                                  {classNameById[item.classId]}
                                </span>
                              ) : item.teacherLabel ? (
                                <span className="block text-[10px] text-[var(--ios-secondary-label)]">
                                  {item.teacherLabel}
                                </span>
                              ) : null}
                              {item.periodCount > 1 ? (
                                <span className="block text-[9px] text-[var(--ios-tertiary-label)]">
                                  ×{item.periodCount}
                                </span>
                              ) : null}
                            </span>
                          ))
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {entries.some((e) => e.startPeriod == null) ? (
        <div className="border-t border-[var(--ios-separator)] px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
            {t("grid.offGrid")}
          </p>
          <div className="flex flex-wrap gap-2">
            {entries
              .filter((e) => e.startPeriod == null)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onCellClick({ day: item.day, startPeriod: null, entries: [item] })
                  }
                  className="rounded-xl border border-[var(--ios-separator)] bg-[var(--ios-fill)] px-3 py-2 text-left"
                >
                  <div className="text-[11px] font-semibold text-[var(--ios-label)]">
                    {t(`days.${item.day}`)} · {item.customStart?.slice(0, 5)}–
                    {item.customEnd?.slice(0, 5)}
                  </div>
                  <div className="text-[11px] text-[var(--ios-secondary-label)]">
                    {entryDisplayLabel({
                      subjectLabel: item.subjectLabel,
                      label: item.label,
                      optionCode: item.optionCode,
                      locale,
                    })}
                  </div>
                </button>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Aide TypeScript — période utilisée dans le map. */
export type { GridPeriodDto };

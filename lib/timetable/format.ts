import type { LocalizedTextDto } from "@/lib/api/academic";
import type { DayOfWeek } from "@/lib/api/timetable";

const DAY_ORDER: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function sortDays(days: DayOfWeek[]): DayOfWeek[] {
  return [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
}

/** Affiche « 7:35 – 8:25 » (données stockées, pas le format EN imprimé). */
export function formatTimeRange(start: string, end: string): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    const hh = String(Number(h));
    return `${hh}:${m}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

export function resolveLocalized(
  text: LocalizedTextDto | null | undefined,
  locale: string,
): string {
  if (!text) return "";
  const primary = locale.startsWith("en") ? text.en : text.fr;
  const fallback = locale.startsWith("en") ? text.fr : text.en;
  return (primary || fallback || "").trim();
}

export function entryDisplayLabel(options: {
  subjectLabel?: string | null;
  label?: LocalizedTextDto | null;
  optionCode?: string;
  locale: string;
}): string {
  const base =
    options.subjectLabel?.trim() ||
    resolveLocalized(options.label, options.locale) ||
    "—";
  if (options.optionCode && options.optionCode.trim()) {
    return `${base} (${options.optionCode.trim()})`;
  }
  return base;
}

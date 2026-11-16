import type { CreateTimeSlotGridRequest, DayOfWeek, GridPeriodDto } from "@/lib/api/timetable";

/** Grille observée 2026-2027 (fixtures/timetable-grid.json). */
export const WEEKDAYS: DayOfWeek[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
];

export const DEFAULT_GRID_PERIODS: GridPeriodDto[] = [
  { number: 1, kind: "LESSON", start: "07:35", end: "08:25", label: null },
  { number: 2, kind: "LESSON", start: "08:25", end: "09:15", label: null },
  { number: 3, kind: "LESSON", start: "09:15", end: "10:05", label: null },
  {
    number: null,
    kind: "BREAK",
    start: "10:05",
    end: "10:20",
    label: { fr: "PREMIÈRE PAUSE", en: "FIRST BREAK" },
  },
  { number: 4, kind: "LESSON", start: "10:20", end: "11:10", label: null },
  { number: 5, kind: "LESSON", start: "11:10", end: "12:00", label: null },
  { number: 6, kind: "LESSON", start: "12:00", end: "12:50", label: null },
  {
    number: null,
    kind: "BREAK",
    start: "12:50",
    end: "13:20",
    label: { fr: "DEUXIÈME PAUSE", en: "SECOND BREAK" },
  },
  { number: 7, kind: "LESSON", start: "13:20", end: "14:20", label: null },
  { number: 8, kind: "LESSON", start: "14:20", end: "15:10", label: null },
  {
    number: null,
    kind: "CLEANUP",
    start: "15:10",
    end: "15:30",
    label: { fr: "NETTOYAGE GÉNÉRAL", en: "GENERAL CLEAN UP" },
  },
  {
    number: null,
    kind: "CLOSING",
    start: "15:30",
    end: "15:35",
    label: { fr: "RENTRÉE", en: "CLOSING" },
  },
];

export function buildDefaultGridRequest(
  academicYearId: string,
  schoolId?: string | null,
): CreateTimeSlotGridRequest {
  return {
    academicYearId,
    name: "Grille standard (lun–ven)",
    days: [...WEEKDAYS],
    periods: DEFAULT_GRID_PERIODS.map((p) => ({ ...p, label: p.label ? { ...p.label } : null })),
    active: true,
    schoolId: schoolId ?? null,
  };
}

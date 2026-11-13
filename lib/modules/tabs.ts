/** Onglets des hubs modules — navigation `?tab=` + sous-menus sidebar. */

export const STUDENT_TABS = ["all", "active", "inactive", "enrollments"] as const;
export type StudentTab = (typeof STUDENT_TABS)[number];

export const REPORTING_TABS = ["templates", "bulletins", "reviews"] as const;
export type ReportingTab = (typeof REPORTING_TABS)[number];

export const GRADES_TABS = [
  "sessions",
  "schemes",
  "audits",
  "reportSheets",
  "corrections",
] as const;
export type GradesTab = (typeof GRADES_TABS)[number];

export const TIMETABLE_TABS = ["overview", "rooms"] as const;
export type TimetableTab = (typeof TIMETABLE_TABS)[number];

function parseTab<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value && (allowed as readonly string[]).includes(value)) return value as T;
  return fallback;
}

export function parseStudentTab(value: string | null | undefined): StudentTab {
  return parseTab(value, STUDENT_TABS, "all");
}

export function parseReportingTab(value: string | null | undefined): ReportingTab {
  return parseTab(value, REPORTING_TABS, "templates");
}

export function parseGradesTab(value: string | null | undefined): GradesTab {
  return parseTab(value, GRADES_TABS, "sessions");
}

export function parseTimetableTab(value: string | null | undefined): TimetableTab {
  return parseTab(value, TIMETABLE_TABS, "overview");
}

export function moduleListPath(
  workspaceHome: `/${string}`,
  module: string,
  tab?: string | null,
  defaultTab?: string,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  if (!tab || (defaultTab && tab === defaultTab)) {
    return `${base}/${module}` as `/${string}`;
  }
  return `${base}/${module}?tab=${encodeURIComponent(tab)}` as `/${string}`;
}

import {
  ACADEMIC_DEFAULT_TAB,
  parseAcademicTab,
  type AcademicTab,
} from "@/lib/academic/tabs";
import type { NavChildItem, NavHref, NavItemKey } from "@/lib/auth/nav-config";
import {
  parseGradesTab,
  parseReportingTab,
  parseStudentTab,
  parseTimetableTab,
  type GradesTab,
  type ReportingTab,
  type StudentTab,
  type TimetableTab,
} from "@/lib/modules/tabs";
import type { StaffListTab } from "@/lib/staff/functions";
import { isStaffTypeSlug, parseStaffListTab } from "@/lib/staff/routes";

function moduleTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
  marker: string,
  parse: (value: string | null) => string,
): string | null {
  const idx = pathname.indexOf(marker);
  if (idx < 0) return null;
  const rest = pathname.slice(idx + marker.length);
  if (rest === "" || rest === "/") {
    return parse(searchParams.get("tab"));
  }
  return null;
}

/** Onglet académique actif d’après le pathname + query `tab`. */
export function academicTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): AcademicTab | null {
  const marker = "/academic";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return null;

  const rest = pathname.slice(idx + marker.length);
  const createMatch = rest.match(/^\/([^/]+)\/create\/?$/);
  if (createMatch) {
    return parseAcademicTab(createMatch[1]);
  }

  if (rest === "" || rest === "/") {
    return parseAcademicTab(searchParams.get("tab")) ?? ACADEMIC_DEFAULT_TAB;
  }

  return null;
}

/** Onglet personnel actif d’après le pathname + query `tab`. */
export function staffTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): StaffListTab | null {
  const marker = "/staff";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return null;

  const rest = pathname.slice(idx + marker.length);
  if (rest === "/create" || rest.startsWith("/create/")) {
    return "all";
  }

  const typeMatch = rest.match(/^\/([^/]+)(?:\/|$)/);
  if (typeMatch && isStaffTypeSlug(typeMatch[1]!)) {
    return typeMatch[1] as StaffListTab;
  }

  if (rest === "" || rest === "/") {
    return parseStaffListTab(searchParams.get("tab")) ?? "all";
  }

  return null;
}

export function studentTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): StudentTab | null {
  return moduleTabFromLocation(pathname, searchParams, "/students", parseStudentTab) as
    | StudentTab
    | null;
}

export function reportingTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): ReportingTab | null {
  const marker = "/reporting";
  const idx = pathname.indexOf(marker);
  if (idx < 0) return null;
  const rest = pathname.slice(idx + marker.length);
  // /reporting/ANNUAL_STANDARD → détail gabarit
  if (rest.length > 1 && rest.startsWith("/") && !rest.slice(1).includes("/")) {
    return "templates";
  }
  return moduleTabFromLocation(
    pathname,
    searchParams,
    "/reporting",
    parseReportingTab,
  ) as ReportingTab | null;
}

export function gradesTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): GradesTab | null {
  if (pathname.includes("/sequences")) {
    return moduleTabFromLocation(
      pathname,
      searchParams,
      "/sequences",
      parseGradesTab,
    ) as GradesTab | null;
  }
  return moduleTabFromLocation(pathname, searchParams, "/grades", parseGradesTab) as
    | GradesTab
    | null;
}

export function timetableTabFromLocation(
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): TimetableTab | null {
  return moduleTabFromLocation(
    pathname,
    searchParams,
    "/timetable",
    parseTimetableTab,
  ) as TimetableTab | null;
}

export function isNavItemActive(
  key: NavItemKey,
  href: NavHref,
  pathname: string,
): boolean {
  if (key === "home") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavChildActive(
  child: NavChildItem,
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): boolean {
  switch (child.kind) {
    case "academic":
      return academicTabFromLocation(pathname, searchParams) === child.tab;
    case "staff":
      return staffTabFromLocation(pathname, searchParams) === child.tab;
    case "students":
      return studentTabFromLocation(pathname, searchParams) === child.tab;
    case "reporting":
      return reportingTabFromLocation(pathname, searchParams) === child.tab;
    case "grades":
      return gradesTabFromLocation(pathname, searchParams) === child.tab;
    case "timetable":
      return timetableTabFromLocation(pathname, searchParams) === child.tab;
    default:
      return false;
  }
}

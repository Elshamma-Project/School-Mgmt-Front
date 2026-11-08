import { parseAcademicTab, type AcademicTab } from "@/lib/academic/tabs";
import type { NavChildItem, NavHref, NavItemKey } from "@/lib/auth/nav-config";
import type { StaffListTab } from "@/lib/staff/functions";
import { isStaffTypeSlug, parseStaffListTab } from "@/lib/staff/routes";

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
    return parseAcademicTab(searchParams.get("tab")) ?? "levels";
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
  if (child.kind === "academic") {
    return academicTabFromLocation(pathname, searchParams) === child.tab;
  }
  return staffTabFromLocation(pathname, searchParams) === child.tab;
}

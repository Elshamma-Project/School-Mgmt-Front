import { parseAcademicTab, type AcademicTab } from "@/lib/academic/tabs";
import type { NavHref, NavItemKey } from "@/lib/auth/nav-config";

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

export function isNavItemActive(
  key: NavItemKey,
  href: NavHref,
  pathname: string,
): boolean {
  if (key === "home") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isAcademicChildActive(
  tab: AcademicTab,
  pathname: string,
  searchParams: { get: (key: string) => string | null },
): boolean {
  return academicTabFromLocation(pathname, searchParams) === tab;
}

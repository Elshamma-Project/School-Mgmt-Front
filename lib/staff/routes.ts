import {
  matchesStaffTab,
  type StaffListTab,
} from "@/lib/staff/functions";

export type StaffTypeSlug = Exclude<StaffListTab, "all">;

const TYPE_ORDER: StaffTypeSlug[] = ["teachers", "leadership", "support", "other"];

/** Type d’URL dérivé des fonctions RH (une seule catégorie prioritaire). */
export function staffTypeSlug(functions: string[]): StaffTypeSlug {
  for (const tab of TYPE_ORDER) {
    if (matchesStaffTab(functions, tab)) return tab;
  }
  return "other";
}

export function isStaffTypeSlug(value: string): value is StaffTypeSlug {
  return (TYPE_ORDER as readonly string[]).includes(value);
}

/** Chemin relatif workspace : `/administration/staff/teachers/{id}`. */
export function staffDetailPath(
  workspaceHome: `/${string}`,
  type: StaffTypeSlug,
  id: string,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  return `${base}/staff/${type}/${encodeURIComponent(id)}` as `/${string}`;
}

export function staffListPath(
  workspaceHome: `/${string}`,
  tab?: StaffListTab | null,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  if (!tab || tab === "all") {
    return `${base}/staff` as `/${string}`;
  }
  return `${base}/staff?tab=${encodeURIComponent(tab)}` as `/${string}`;
}

export function parseStaffListTab(value: string | null | undefined): StaffListTab | null {
  if (!value) return null;
  if (value === "all" || isStaffTypeSlug(value)) return value;
  return null;
}

/** Onglets du hub Académique — alignés sur le module `academic` (docs/03). */

export const ACADEMIC_TABS = [
  "levels",
  "classes",
  "subjects",
  "groups",
  "rooms",
] as const;

export type AcademicTab = (typeof ACADEMIC_TABS)[number];

export function parseAcademicTab(value: string | null | undefined): AcademicTab | null {
  if (!value) return null;
  return (ACADEMIC_TABS as readonly string[]).includes(value) ? (value as AcademicTab) : null;
}

export function academicListPath(
  workspaceHome: `/${string}`,
  tab?: AcademicTab | null,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  if (!tab || tab === "levels") {
    return `${base}/academic` as `/${string}`;
  }
  return `${base}/academic?tab=${encodeURIComponent(tab)}` as `/${string}`;
}

export function academicCreatePath(
  workspaceHome: `/${string}`,
  tab: AcademicTab,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  return `${base}/academic/${tab}/create` as `/${string}`;
}

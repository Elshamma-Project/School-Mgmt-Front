/** Onglets du hub Académique — alignés sur le module `academic` (docs/03). */

/** Ordre UI : Classes → Matières → Groupes → Salles → Niveaux. */
export const ACADEMIC_TABS = [
  "classes",
  "subjects",
  "groups",
  "rooms",
  "levels",
] as const;

export type AcademicTab = (typeof ACADEMIC_TABS)[number];

export const ACADEMIC_DEFAULT_TAB: AcademicTab = "classes";

export function parseAcademicTab(value: string | null | undefined): AcademicTab | null {
  if (!value) return null;
  return (ACADEMIC_TABS as readonly string[]).includes(value) ? (value as AcademicTab) : null;
}

export function academicListPath(
  workspaceHome: `/${string}`,
  tab?: AcademicTab | null,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  if (!tab || tab === ACADEMIC_DEFAULT_TAB) {
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

/** Slug lisible + id stable : `6eme-a--class-demo-6a`. */
export function academicEntitySlug(label: string, id: string): string {
  const base =
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item";
  return `${base}--${id}`;
}

/** Extrait l’id Mongo / seed depuis le slug (ou renvoie le segment brut). */
export function parseAcademicEntityId(slug: string): string {
  const idx = slug.lastIndexOf("--");
  if (idx >= 0 && idx + 2 < slug.length) {
    return decodeURIComponent(slug.slice(idx + 2));
  }
  return decodeURIComponent(slug);
}

export function academicDetailPath(
  workspaceHome: `/${string}`,
  tab: AcademicTab,
  label: string,
  id: string,
): `/${string}` {
  const base = workspaceHome.replace(/\/$/, "") as `/${string}`;
  return `${base}/academic/${tab}/${encodeURIComponent(academicEntitySlug(label, id))}` as `/${string}`;
}

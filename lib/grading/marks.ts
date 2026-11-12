import type { GradeStatus } from "@/lib/api/grading";

/** Convertit une valeur décimale API (string | number) en nombre, `null` si vide / invalide. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Affiche une note (ex. « 14,50 ») selon la langue ; chaîne vide si absente. */
export function formatMark(
  value: string | number | null | undefined,
  locale: string,
  decimals = 2,
): string {
  const n = toNumber(value);
  if (n === null) return "";
  return n.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Coefficient : « 4 » pour un entier, « 1,5 » pour un décimal. */
export function formatCoefficient(
  value: string | number | null | undefined,
  locale: string,
): string {
  const n = toNumber(value);
  if (n === null) return "";
  return n.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Valeur de champ de saisie (« 14,5 » ou « 14.5 ») depuis une note API ; vide si absente. */
export function markToInput(value: string | number | null | undefined): string {
  const n = toNumber(value);
  if (n === null) return "";
  return String(n).replace(".", ",");
}

export type ParsedMark =
  | { ok: true; value: string | null }
  | { ok: false };

/**
 * Valide une saisie « Comp. /20 » : vide = non saisi (jamais 0), sinon 0–max avec ≤ 2 décimales.
 * Renvoie la valeur au format API (point décimal).
 */
export function parseMarkInput(raw: string, max = 20): ParsedMark {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return { ok: true, value: null };
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(cleaned)) return { ok: false };
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > max) return { ok: false };
  return { ok: true, value: cleaned };
}

/** Libellé court d’une cellule de fiche de report selon le statut de la note. */
export function markCellText(
  mark: string | number | null | undefined,
  status: GradeStatus,
  locale: string,
  shortLabels: { absent: string; exempted: string },
): string {
  if (status === "SCORED") return formatMark(mark, locale);
  if (status === "ABSENT" || status === "ABSENT_EXCUSED") return shortLabels.absent;
  if (status === "EXEMPTED") return shortLabels.exempted;
  return "";
}

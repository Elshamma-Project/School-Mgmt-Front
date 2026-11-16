import type { AppRole } from "@/types/auth";
import { canRoleAccessPath, getRoleHomePath, isSharedAppPath } from "@/lib/auth/workspaces";

export type ParsedDeepLink = {
  pathname: string;
  query: Record<string, string>;
  /** Chemin + query prêts pour `router.push` / `Link` (sans locale). */
  href: string;
};

/** Parse un deepLink relatif stocké par l’API (`/teacher/grades?term=2`). */
export function parseNotificationDeepLink(raw: string | null | undefined): ParsedDeepLink | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) return null;

  const withoutHash = trimmed.split("#")[0] ?? trimmed;
  const qIndex = withoutHash.indexOf("?");
  const pathPart = (qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash).trim();
  const queryPart = qIndex >= 0 ? withoutHash.slice(qIndex + 1) : "";
  if (!pathPart.startsWith("/")) return null;

  const query: Record<string, string> = {};
  if (queryPart) {
    const params = new URLSearchParams(queryPart);
    params.forEach((value, key) => {
      if (key) query[key] = value;
    });
  }

  const qs = new URLSearchParams(query).toString();
  return {
    pathname: pathPart,
    query,
    href: qs ? `${pathPart}?${qs}` : pathPart,
  };
}

function withPreservedQuery(
  pathname: string,
  query: Record<string, string>,
): ParsedDeepLink {
  const qs = new URLSearchParams(query).toString();
  return {
    pathname,
    query,
    href: qs ? `${pathname}?${qs}` : pathname,
  };
}

/** Rôles qui ont une page EDT dans leur espace. */
const TIMETABLE_ROLES: ReadonlySet<AppRole> = new Set([
  "STUDENT",
  "PARENT",
  "TEACHER",
  "SURVEILLANT_GENERAL",
  "ADMINISTRATION",
  "DIRECTOR",
]);

/**
 * Réécrit un deepLink pour l’espace du rôle courant.
 * Ex. `/teacher/grades` reste ; un admin n’est pas renvoyé vers l’espace enseignant.
 * Chemins logiques (`/timetable`) et chemins d’un autre espace sont mappés.
 */
export function resolveNotificationDeepLink(
  raw: string | null | undefined,
  role: AppRole | null,
): ParsedDeepLink | null {
  const parsed = parseNotificationDeepLink(raw);
  if (!parsed) return null;
  if (!role) return isSharedAppPath(parsed.pathname) ? parsed : null;

  if (canRoleAccessPath(role, parsed.pathname)) {
    return parsed;
  }

  // EDT : `/timetable` (logique broadcast) ou `/{autreEspace}/timetable` → espace du rôle.
  const timetableLogical = parsed.pathname === "/timetable";
  const timetableMatch = parsed.pathname.match(
    /^\/(?:student|parent|teacher|administration|director|surveillant-general)\/timetable\/?$/,
  );
  if (timetableLogical || timetableMatch) {
    if (!TIMETABLE_ROLES.has(role)) {
      return parseNotificationDeepLink("/notifications");
    }
    return withPreservedQuery(`${getRoleHomePath(role)}/timetable`, parsed.query);
  }

  // Chemins métier « grades / sequences » : mapper vers l’espace du rôle.
  const gradesMatch = parsed.pathname.match(
    /^\/(?:teacher|administration|director|surveillant-general)\/(grades|sequences)\/?$/,
  );
  if (gradesMatch) {
    const home = getRoleHomePath(role);
    if (role === "SUPER_ADMIN" || role === "STUDENT" || role === "PARENT") {
      return parseNotificationDeepLink("/notifications");
    }
    const segment = role === "DIRECTOR" ? "sequences" : "grades";
    return withPreservedQuery(`${home}/${segment}`, parsed.query);
  }

  if (isSharedAppPath(parsed.pathname)) return parsed;
  return parseNotificationDeepLink("/notifications");
}

/** Fusionne des query params dans un href relatif. */
export function withQuery(
  pathname: string,
  query: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

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

/**
 * Réécrit un deepLink pour l’espace du rôle courant.
 * Ex. `/teacher/grades` reste ; un admin n’est pas renvoyé vers l’espace enseignant.
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

  // Chemins métier « grades / sequences » : mapper vers l’espace du rôle.
  const gradesMatch = parsed.pathname.match(/^\/(?:teacher|administration|director)\/(grades|sequences)\/?$/);
  if (gradesMatch) {
    const home = getRoleHomePath(role);
    const segment =
      role === "DIRECTOR" ? "sequences" : role === "TEACHER" ? "grades" : "grades";
    if (role === "SUPER_ADMIN" || role === "STUDENT" || role === "PARENT") {
      // Pas d’équivalent : rester sur la boîte de réception.
      return parseNotificationDeepLink("/notifications");
    }
    const pathname = `${home}/${segment}`;
    const qs = new URLSearchParams(parsed.query).toString();
    return {
      pathname,
      query: parsed.query,
      href: qs ? `${pathname}?${qs}` : pathname,
    };
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

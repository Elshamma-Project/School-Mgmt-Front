/**
 * Navigation auth : URL de retour, redirection post-login, expiration de session dure.
 */

import { LOGOUT_FLAG_KEY, LOGOUT_QUERY } from "@/lib/auth/constants";
import { clearLocalAuthState } from "@/lib/auth/session-cache";
import { canRoleAccessPath, getRoleHomePath } from "@/lib/auth/workspaces";
import type { AppRole } from "@/types/auth";

const RETURN_PATH_KEY = "bee-sm-auth-return";

let sessionExpiredRedirecting = false;

/** Chemins qu’on ne mémorise pas comme cible post-login. */
function isAuthOnlyPath(pathname: string): boolean {
  return (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/change-password" ||
    pathname.startsWith("/change-password/")
  );
}

/**
 * Mémorise l’URL app demandée avant un redirect vers /login
 * (deep-link notifications, F5 sur une page protégée, etc.).
 */
export function saveReturnPath(pathname: string, search = ""): void {
  if (typeof window === "undefined") return;
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return;
  if (isAuthOnlyPath(pathname)) return;

  const full = `${pathname}${search}`;
  try {
    window.sessionStorage.setItem(RETURN_PATH_KEY, full);
  } catch {
    /* ignore */
  }
}

export function peekReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(RETURN_PATH_KEY);
  } catch {
    return null;
  }
}

export function consumeReturnPath(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(RETURN_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
    return value;
  } catch {
    return null;
  }
}

export function clearReturnPath(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    /* ignore */
  }
}

/** Destination après login / restauration : return URL si autorisée pour le rôle. */
export function resolvePostLoginDestination(role: AppRole): string {
  const raw = consumeReturnPath();
  if (!raw) return getRoleHomePath(role);
  const pathOnly = raw.split("?")[0] || raw;
  if (!pathOnly.startsWith("/") || pathOnly.startsWith("//")) {
    return getRoleHomePath(role);
  }
  if (isAuthOnlyPath(pathOnly)) return getRoleHomePath(role);
  if (!canRoleAccessPath(role, pathOnly)) return getRoleHomePath(role);
  return raw;
}

function detectLocale(): "fr" | "en" {
  if (typeof window === "undefined") return "fr";
  const first = window.location.pathname.split("/").filter(Boolean)[0];
  return first === "en" ? "en" : "fr";
}

/**
 * Session morte (401 refresh définitif) : purge caches + navigation dure vers /login.
 * Évite le Retour navigateur vers une page app zombie.
 */
export function forceSessionExpiredRedirect(): void {
  if (typeof window === "undefined" || sessionExpiredRedirecting) return;
  sessionExpiredRedirecting = true;
  try {
    clearLocalAuthState();
  } catch {
    /* ignore */
  }
  try {
    window.sessionStorage.setItem(LOGOUT_FLAG_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  clearReturnPath();
  const locale = detectLocale();
  window.location.replace(`/${locale}/login?${LOGOUT_QUERY}=1`);
}

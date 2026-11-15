import type { AppRole } from "@/types/auth";

/** Préfixe d’URL de l’espace UI par rôle. */
export const ROLE_WORKSPACE: Record<AppRole, `/${string}`> = {
  STUDENT: "/student",
  PARENT: "/parent",
  TEACHER: "/teacher",
  /** Espace dédié SG — focus visa fiches de report (Q-38 v1). */
  SURVEILLANT_GENERAL: "/surveillant-general",
  ADMINISTRATION: "/administration",
  DIRECTOR: "/director",
  SUPER_ADMIN: "/super-admin",
};

export function getRoleHomePath(role: AppRole): `/${string}` {
  return ROLE_WORKSPACE[role];
}

export function getWorkspaceRoleFromPath(pathname: string): AppRole | null {
  const entry = (Object.entries(ROLE_WORKSPACE) as [AppRole, string][]).find(
    ([, prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  return entry?.[0] ?? null;
}

/** Routes partagées accessibles à tout rôle authentifié. */
export function isSharedAppPath(pathname: string): boolean {
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/") ||
    pathname === "/"
  );
}

export function canRoleAccessPath(role: AppRole, pathname: string): boolean {
  if (isSharedAppPath(pathname)) return true;
  const prefix = ROLE_WORKSPACE[role];
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

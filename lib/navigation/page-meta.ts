import type { NavItemKey } from "@/lib/auth/nav-config";

const PATH_TO_NAV: Record<string, NavItemKey> = {
  "/": "home",
  "/staff": "staff",
  "/students": "students",
  "/academic": "academic",
  "/notifications": "notifications",
  "/settings": "settings",
};

/** Clé i18n `nav.*` pour le titre du header selon le pathname (sans locale). */
export function getNavKeyFromPathname(pathname: string): NavItemKey {
  if (PATH_TO_NAV[pathname]) return PATH_TO_NAV[pathname];

  const match = Object.keys(PATH_TO_NAV)
    .filter((path) => path !== "/")
    .find((path) => pathname === path || pathname.startsWith(`${path}/`));

  return match ? PATH_TO_NAV[match] : "home";
}

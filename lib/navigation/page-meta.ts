import type { NavItemKey } from "@/lib/auth/nav-config";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import type { AppRole } from "@/types/auth";

const SHARED: Record<string, NavItemKey> = {
  "/notifications": "notifications",
  "/settings": "settings",
  "/profile": "profile",
};

/** Titre header : d’abord match exact nav du rôle, sinon préfixe, sinon home. */
export function getNavKeyFromPathname(
  pathname: string,
  role: AppRole | null = null,
): NavItemKey {
  if (SHARED[pathname]) return SHARED[pathname];

  const sharedPrefix = Object.keys(SHARED).find(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  if (sharedPrefix) return SHARED[sharedPrefix];

  const items = getNavItemsForRole(role);
  const exact = items.find((item) => item.href === pathname);
  if (exact) return exact.key;

  const nested = items
    .filter((item) => item.href !== "/" && pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (nested) return nested.key;

  const home = items.find((item) => item.key === "home");
  return home?.key ?? "home";
}

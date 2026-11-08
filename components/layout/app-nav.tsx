"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type SidebarNavProps = {
  collapsed?: boolean;
};

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = getNavItemsForRole(primaryRole(user));

  return (
    <nav
      aria-label={t("main")}
      className={cn(
        "flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-2",
        collapsed ? "items-center" : "",
      )}
    >
      {items.map(({ href, key, icon: Icon }) => {
        const active =
          key === "home"
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        const label = t(key);

        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            aria-label={collapsed ? label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "pressable flex items-center rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
              collapsed ? "size-9 justify-center" : "gap-2 px-2 py-1.5",
              active
                ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
            )}
          >
            <Icon className="size-3.5 shrink-0 stroke-[1.75]" aria-hidden />
            {!collapsed ? <span className="truncate">{label}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = getNavItemsForRole(primaryRole(user));

  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-card)_85%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, key, icon: Icon }) => {
          const active =
            key === "home"
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "pressable flex flex-col items-center gap-0.5 px-1 py-2 text-[var(--text-caption)] font-medium focus-visible:shadow-[var(--focus-ring)]",
                  active ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]",
                )}
              >
                <Icon className="size-5 stroke-[1.75]" aria-hidden />
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

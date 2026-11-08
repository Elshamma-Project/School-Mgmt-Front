"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { getNavItemsForRole } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

export function SidebarNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = getNavItemsForRole(primaryRole(user));

  return (
    <nav aria-label={t("main")} className="hidden md:flex md:w-[220px] md:flex-col md:gap-1 md:p-3">
      {items.map(({ href, key, icon: Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium transition-colors duration-150",
              active
                ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
            )}
          >
            <Icon className="size-[18px] stroke-[1.75]" aria-hidden />
            {t(key)}
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-card)_82%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, key, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium",
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

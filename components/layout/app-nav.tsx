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
            className={cn(
              "flex items-center rounded-[10px] text-[13px] font-medium transition-colors duration-150",
              collapsed ? "size-9 justify-center" : "gap-2.5 px-2.5 py-2",
              active
                ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
            )}
          >
            <span className="relative shrink-0">
              <Icon className="size-[17px] stroke-[1.75]" aria-hidden />
              {key === "notifications" ? (
                <span
                  className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--ios-danger)]"
                  aria-hidden
                />
              ) : null}
            </span>
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-card)_82%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
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
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2 text-[10px] font-medium",
                  active ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]",
                )}
              >
                <span className="relative">
                  <Icon className="size-5 stroke-[1.75]" aria-hidden />
                  {key === "notifications" ? (
                    <span
                      className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-[var(--ios-danger)]"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

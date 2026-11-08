"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import {
  isAcademicChildActive,
  isNavItemActive,
} from "@/lib/auth/nav-active";
import { getNavItemsForRole, type NavItem } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type SidebarNavProps = {
  collapsed?: boolean;
};

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const t = useTranslations("nav");
  const tAcademic = useTranslations("academic");
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
      {items.map((entry) => (
        <NavEntry
          key={entry.href}
          entry={entry}
          collapsed={collapsed}
          pathname={pathname}
          searchParams={searchParams}
          label={t(entry.key)}
          childLabel={(tab) => tAcademic(`tabs.${tab}`)}
        />
      ))}
    </nav>
  );
}

type NavEntryProps = {
  entry: NavItem;
  collapsed: boolean;
  pathname: string;
  searchParams: { get: (key: string) => string | null };
  label: string;
  childLabel: (tab: string) => string;
};

function NavEntry({
  entry,
  collapsed,
  pathname,
  searchParams,
  label,
  childLabel,
}: NavEntryProps) {
  const { href, key, icon: Icon, children } = entry;
  const active = isNavItemActive(key, href, pathname);
  const hasChildren = Boolean(children?.length) && !collapsed;
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!hasChildren) {
    return (
      <Link
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
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={href}
          aria-current={active && !children?.some((c) => isAcademicChildActive(c.tab, pathname, searchParams)) ? "page" : undefined}
          className={cn(
            "pressable flex min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
            active
              ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
              : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
          )}
        >
          <Icon className="size-3.5 shrink-0 stroke-[1.75]" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "pressable flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]",
            active && "text-[var(--ios-blue)]",
          )}
        >
          <ChevronDown
            className={cn(
              "size-3.5 stroke-[1.75] transition-transform duration-[var(--duration-fast)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>

      {open ? (
        <ul className="ml-2 flex flex-col gap-0.5 border-l border-[var(--ios-separator)] pl-2">
          {children!.map((child) => {
            const childActive = isAcademicChildActive(
              child.tab,
              pathname,
              searchParams,
            );
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={childActive ? "page" : undefined}
                  className={cn(
                    "pressable flex items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
                    childActive
                      ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                      : "text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)]",
                  )}
                >
                  <span className="truncate">{childLabel(child.tab)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { NotificationCountBadge } from "@/components/notifications/notification-count-badge";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavChildActive, isNavItemActive } from "@/lib/auth/nav-active";
import { getNavItemsForRole, type NavChildItem, type NavItem } from "@/lib/auth/nav-config";
import { useUnreadNotificationCount } from "@/lib/notifications/use-unread-count";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

type SidebarNavProps = {
  collapsed?: boolean;
};

export function SidebarNav({ collapsed = false }: SidebarNavProps) {
  const t = useTranslations("nav");
  const tAcademic = useTranslations("academic");
  const tStaff = useTranslations("staff");
  const tStudents = useTranslations("students");
  const tReporting = useTranslations("reportingHub");
  const tGrades = useTranslations("gradesHub");
  const tTimetable = useTranslations("timetableHub");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const items = getNavItemsForRole(primaryRole(user));
  const unreadNotifications = useUnreadNotificationCount();

  function childLabel(child: NavChildItem): string {
    switch (child.kind) {
      case "academic":
        return tAcademic(`tabs.${child.tab}`);
      case "staff":
        return tStaff(`tabs.${child.tab}`);
      case "students":
        return tStudents(`tabs.${child.tab}`);
      case "reporting":
        return tReporting(`tabs.${child.tab}`);
      case "grades":
        return tGrades(`tabs.${child.tab}`);
      case "timetable":
        return tTimetable(`tabs.${child.tab}`);
      default:
        return String(child.tab);
    }
  }

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
          childLabel={childLabel}
          unreadNotifications={unreadNotifications}
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
  childLabel: (child: NavChildItem) => string;
  unreadNotifications: number;
};

function NavEntry({
  entry,
  collapsed,
  pathname,
  searchParams,
  label,
  childLabel,
  unreadNotifications,
}: NavEntryProps) {
  const { href, key, icon: Icon, children } = entry;
  const active = isNavItemActive(key, href, pathname);
  const hasChildren = Boolean(children?.length) && !collapsed;
  const [open, setOpen] = useState(active);
  const showNotifBadge = key === "notifications" && unreadNotifications > 0;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!hasChildren) {
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        aria-label={
          collapsed
            ? showNotifBadge
              ? `${label} (${unreadNotifications})`
              : label
            : undefined
        }
        aria-current={active ? "page" : undefined}
        className={cn(
          "pressable relative flex items-center rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
          collapsed ? "size-9 justify-center" : "gap-2 px-2 py-1.5",
          active
            ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
            : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
        )}
      >
        <Icon className="size-3.5 shrink-0 stroke-[1.75]" aria-hidden />
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {showNotifBadge ? (
              <NotificationCountBadge count={unreadNotifications} />
            ) : null}
          </>
        ) : showNotifBadge ? (
          <NotificationCountBadge
            count={unreadNotifications}
            className="absolute -right-0.5 -top-0.5"
          />
        ) : null}
      </Link>
    );
  }

  const childActive = children!.some((c) =>
    isNavChildActive(c, pathname, searchParams),
  );

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-0.5">
        <Link
          href={href}
          aria-current={active && !childActive ? "page" : undefined}
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
            const isActive = isNavChildActive(child, pathname, searchParams);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "pressable flex items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-[11px] font-medium transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)]",
                    isActive
                      ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
                      : "text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)]",
                  )}
                >
                  <span className="truncate">{childLabel(child)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

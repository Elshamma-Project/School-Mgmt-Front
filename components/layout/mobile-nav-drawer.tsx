"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { BrandMark } from "@/components/layout/brand-mark";
import { Link, usePathname } from "@/i18n/navigation";
import { isNavChildActive, isNavItemActive } from "@/lib/auth/nav-active";
import { getNavItemsForRole, type NavChildItem, type NavItem } from "@/lib/auth/nav-config";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";
import { primaryRole } from "@/types/auth";

type MobileNavDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Menu navigation mobile (drawer) — remplace la tab bar trop dense.
 */
export function MobileNavDrawer({ open, onOpenChange }: MobileNavDrawerProps) {
  const t = useTranslations("nav");
  const tAcademic = useTranslations("academic");
  const tStaff = useTranslations("staff");
  const tStudents = useTranslations("students");
  const tReporting = useTranslations("reportingHub");
  const tGrades = useTranslations("gradesHub");
  const tTimetable = useTranslations("timetableHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const schoolName = useSchoolBrandStore((s) => s.displayName(locale));
  const items = getNavItemsForRole(primaryRole(user));
  const titleId = useId();

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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onOpenChange, open]);

  if (typeof document === "undefined" || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        aria-label={t("closeMenu")}
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] flex-col bg-[var(--ios-card)] shadow-[var(--ios-shadow-lg)] slide-up"
      >
        <div className="flex h-[var(--app-topbar-height)] shrink-0 items-center gap-2.5 border-b border-[var(--ios-separator)] px-3 pt-[env(safe-area-inset-top)]">
          <BrandMark size="sm" alt={schoolName || tCommon("schoolName")} />
          <div className="min-w-0 flex-1 leading-tight">
            <p
              id={titleId}
              className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]"
            >
              {schoolName || tCommon("schoolName")}
            </p>
            <p className="truncate text-[12px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
              {tCommon("appName")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={t("closeMenu")}
            className="pressable flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <X className="size-4 stroke-[1.75]" aria-hidden />
          </button>
        </div>

        <nav
          aria-label={t("main")}
          className="flex-1 overflow-y-auto overscroll-contain px-2 py-3"
        >
          <ul className="flex flex-col gap-0.5">
            {items.map((entry) => (
              <MobileNavEntry
                key={entry.href}
                entry={entry}
                pathname={pathname}
                searchParams={searchParams}
                label={t(entry.key)}
                childLabel={childLabel}
                onNavigate={() => onOpenChange(false)}
              />
            ))}
          </ul>
        </nav>

        <div className="shrink-0 border-t border-[var(--ios-separator)] p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <Link
            href="/profile"
            onClick={() => onOpenChange(false)}
            className="pressable flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-subhead)] font-medium text-[var(--ios-label)] hover:bg-[var(--ios-fill)] focus-visible:shadow-[var(--focus-ring)]"
          >
            <span className="truncate">{t("profile")}</span>
          </Link>
        </div>
      </aside>
    </div>,
    document.body,
  );
}

type MobileNavEntryProps = {
  entry: NavItem;
  pathname: string;
  searchParams: { get: (key: string) => string | null };
  label: string;
  childLabel: (child: NavChildItem) => string;
  onNavigate: () => void;
};

function MobileNavEntry({
  entry,
  pathname,
  searchParams,
  label,
  childLabel,
  onNavigate,
}: MobileNavEntryProps) {
  const { href, key, icon: Icon, children } = entry;
  const active = isNavItemActive(key, href, pathname);
  const hasChildren = Boolean(children?.length);
  const [open, setOpen] = useState(active);

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (!hasChildren) {
    return (
      <li>
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "pressable flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-subhead)] font-medium transition-colors focus-visible:shadow-[var(--focus-ring)]",
            active
              ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
              : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
          )}
        >
          <Icon className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
      </li>
    );
  }

  return (
    <li>
      <div className="flex items-center gap-0.5">
        <Link
          href={href}
          onClick={onNavigate}
          className={cn(
            "pressable flex min-w-0 flex-1 items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-[var(--text-subhead)] font-medium transition-colors focus-visible:shadow-[var(--focus-ring)]",
            active
              ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]"
              : "text-[var(--ios-label)] hover:bg-[var(--ios-fill)]",
          )}
        >
          <Icon className="size-4 shrink-0 stroke-[1.75]" aria-hidden />
          <span className="truncate">{label}</span>
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-label={label}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "pressable flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--ios-secondary-label)] hover:bg-[var(--ios-fill)] focus-visible:shadow-[var(--focus-ring)]",
            active && "text-[var(--ios-blue)]",
          )}
        >
          <ChevronDown
            className={cn(
              "size-4 stroke-[1.75] transition-transform duration-[var(--duration-fast)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </button>
      </div>
      {open ? (
        <ul className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--ios-separator)] pl-2">
          {children!.map((child) => {
            const isActive = isNavChildActive(child, pathname, searchParams);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "pressable flex items-center rounded-[var(--radius-md)] px-3 py-2 text-[12px] font-medium transition-colors focus-visible:shadow-[var(--focus-ring)]",
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
    </li>
  );
}

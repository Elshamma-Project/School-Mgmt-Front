"use client";

import type { ReactNode } from "react";
import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconInput } from "@/components/ui/icon-input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/cn";

export type HubTabItem = {
  key: string;
  label: string;
};

type YearBannerProps = {
  label: string;
  yearLabel?: string | null;
  yearStatus?: string | null;
  yearStatusLabel?: string | null;
  yearLocked?: boolean;
  lockedLabel?: string | null;
  hint?: string;
  loading?: boolean;
  emptyLabel?: string;
};

export function HubYearBanner({
  label,
  yearLabel,
  yearStatus,
  yearStatusLabel,
  yearLocked,
  lockedLabel,
  hint,
  loading,
  emptyLabel,
}: YearBannerProps) {
  const displayHint = yearLocked
    ? (lockedLabel ?? hint)
    : hint;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border bg-[var(--ios-card)] px-4 py-3 shadow-[var(--ios-shadow)]",
        yearLocked
          ? "border-[var(--ios-orange)]/40"
          : "border-[var(--ios-separator)]/55",
      )}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
          {label}
        </p>
        {loading ? (
          <Skeleton className="mt-1.5 h-5 w-40" />
        ) : yearLabel ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="truncate text-[15px] font-semibold tracking-[-0.015em] text-[var(--ios-label)]">
              {yearLabel}
            </p>
            {yearStatusLabel ? (
              <Badge
                tone={
                  yearLocked
                    ? "warning"
                    : yearStatus === "ACTIVE"
                      ? "success"
                      : "neutral"
                }
              >
                {yearStatusLabel}
              </Badge>
            ) : null}
            {yearLocked && lockedLabel ? (
              <Badge tone="warning">{lockedLabel}</Badge>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">{emptyLabel}</p>
        )}
      </div>
      {displayHint ? (
        <p className="max-w-[280px] text-right text-[11px] leading-relaxed text-[var(--ios-secondary-label)]">
          {displayHint}
        </p>
      ) : null}
    </div>
  );
}

type HubToolbarProps = {
  tabs: HubTabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  tabsAriaLabel: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Masque le champ recherche (ex. déjà dans une carte d’action). */
  hideSearch?: boolean;
  addLabel?: string;
  onAdd?: () => void;
  trailing?: ReactNode;
};

export function HubToolbar({
  tabs,
  activeTab,
  onTabChange,
  tabsAriaLabel,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  hideSearch = false,
  addLabel,
  onAdd,
  trailing,
}: HubToolbarProps) {
  const tCommon = useTranslations("common");
  const showAside = !hideSearch || Boolean(trailing) || Boolean(addLabel && onAdd);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
      <nav
        aria-label={tabsAriaLabel}
        className="flex min-w-0 items-stretch gap-0 overflow-x-auto border-b border-[var(--ios-separator)] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative shrink-0 px-3 py-2.5 text-[12px] font-medium tracking-[-0.01em] transition-colors duration-[var(--duration-fast)] focus-visible:shadow-[var(--focus-ring)] sm:px-3.5",
                active
                  ? "text-[var(--ios-label)]"
                  : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]",
              )}
            >
              {tab.label}
              {active ? (
                <span
                  className="absolute inset-x-2 bottom-[-1px] h-[2px] rounded-full bg-[var(--ios-blue)]"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {showAside ? (
        <div className="flex items-center gap-2 sm:gap-2.5">
          {!hideSearch ? (
            <div className="min-w-0 flex-1 lg:w-[220px] lg:flex-none">
              <IconInput
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                icon={<Search className="size-4 stroke-[1.75]" />}
                aria-label={tCommon("search")}
              />
            </div>
          ) : null}
          {trailing}
          {addLabel && onAdd ? (
            <Button
              type="button"
              className="shrink-0"
              leadingIcon={<Plus className="size-4 stroke-[1.75]" aria-hidden />}
              onClick={onAdd}
            >
              {addLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function HubTableShell({
  children,
  countLabel,
}: {
  children: ReactNode;
  countLabel: string;
}) {
  return (
    <div className="hidden overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)] md:block">
      <div className="overflow-x-auto">{children}</div>
      <div className="flex items-center justify-between border-t border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-5 py-2.5">
        <p className="text-[11px] text-[var(--ios-secondary-label)]">{countLabel}</p>
      </div>
    </div>
  );
}

export function HubStatusPill({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active
          ? "bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
          : "bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

export function HubLoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-[var(--ios-separator)]/55 px-5 py-3.5 last:border-b-0"
        >
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

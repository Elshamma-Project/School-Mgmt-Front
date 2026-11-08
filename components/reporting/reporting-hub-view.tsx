"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, FileSpreadsheet, Layers3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import {
  HubLoadingRows,
  HubStatusPill,
  HubTableShell,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { useRouter } from "@/i18n/navigation";
import { listAcademicYears, localizedLabel } from "@/lib/api/academic";
import { listReportTemplates, type ReportTemplateResponse } from "@/lib/api/reporting";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  moduleListPath,
  parseReportingTab,
  REPORTING_TABS,
  type ReportingTab,
} from "@/lib/modules/tabs";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

export function ReportingHubView() {
  const t = useTranslations("reportingHub");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tab = parseReportingTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ReportTemplateResponse[]>([]);

  const selectTab = (next: ReportingTab) => {
    router.replace(moduleListPath(workspaceHome, "reporting", next, "templates"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [years, templateRows] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listReportTemplates(schoolId),
      ]);
      const year =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYearLabel(year?.label ?? null);
      setYearStatus(year?.status ?? null);
      setTemplates(templateRows);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();
  const filteredTemplates = useMemo(() => {
    if (!q) return templates;
    return templates.filter((item) => {
      const name = localizedLabel(item.name, locale).toLowerCase();
      return item.code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [locale, q, templates]);

  const stats = useMemo(
    () => ({
      templates: templates.length,
      active: templates.filter((x) => x.active).length,
      annual: templates.filter((x) => x.periodType === "ANNUAL").length,
      term: templates.filter((x) => x.periodType === "TERM").length,
    }),
    [templates],
  );

  return (
    <div className="space-y-5 slide-up">
      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={yearLabel}
        yearStatus={yearStatus}
        yearStatusLabel={
          yearStatus && t.has(`yearStatus.${yearStatus}`)
            ? t(`yearStatus.${yearStatus}`)
            : yearStatus
        }
        hint={t("yearHint")}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard
          label={t("stats.templates")}
          value={stats.templates}
          loading={loading}
          tone="blue"
          active={tab === "templates"}
          onSelect={() => selectTab("templates")}
          icon={<FileSpreadsheet className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.active")}
          value={stats.active}
          loading={loading}
          tone="green"
          icon={<Layers3 className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.annual")}
          value={stats.annual}
          loading={loading}
          tone="amber"
          icon={<FileSpreadsheet className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.term")}
          value={stats.term}
          loading={loading}
          tone="slate"
          icon={<ClipboardList className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <HubToolbar
        tabs={REPORTING_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as ReportingTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
      />

      {loading ? (
        <HubLoadingRows />
      ) : tab !== "templates" ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          description={t(`empty.${tab}.description`)}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          title={t("empty.templates.title")}
          description={t("empty.templates.description")}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredTemplates.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {localizedLabel(item.name, locale)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code} · {item.periodType}
                    </p>
                  </div>
                  <HubStatusPill
                    active={item.active}
                    activeLabel={t("statusActive")}
                    inactiveLabel={t("inactive")}
                  />
                </div>
              </li>
            ))}
          </ul>
          <HubTableShell countLabel={t("tableCount", { count: filteredTemplates.length })}>
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.name")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.code")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.period")}
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 &&
                        "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                      !item.active && "opacity-70",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                      {localizedLabel(item.name, locale)}
                    </td>
                    <td className="px-3 py-3.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                      {item.periodType}
                    </td>
                    <td className="px-5 py-3.5">
                      <HubStatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}
    </div>
  );
}

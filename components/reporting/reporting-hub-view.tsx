"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Layers3,
  School2,
  Sparkles,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { StatCard } from "@/components/ui/stat-card";
import {
  HubLoadingRows,
  HubStatusPill,
  HubTableShell,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import { Link, useRouter } from "@/i18n/navigation";
import {
  listAcademicYears,
  listClasses,
  localizedLabel,
  type SchoolClassResponse,
} from "@/lib/api/academic";
import {
  downloadReportCardPdf,
  generateReportCards,
  listReportCardsForStudent,
  listReportTemplates,
  type ReportCardSummaryResponse,
  type ReportTemplateResponse,
} from "@/lib/api/reporting";
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

/** Élève démo seedé — utilisé pour lister les bulletins déjà générés. */
const DEMO_STUDENT_ID = "student-demo-01";

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
  const [generating, setGenerating] = useState(false);
  const [yearId, setYearId] = useState<string | null>(null);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [yearLocked, setYearLocked] = useState(false);
  const [templates, setTemplates] = useState<ReportTemplateResponse[]>([]);
  const [classes, setClasses] = useState<SchoolClassResponse[]>([]);
  const [classId, setClassId] = useState("");
  const [cards, setCards] = useState<ReportCardSummaryResponse[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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
      setYearLocked(Boolean(year?.locked));
      setYearId(year?.id ?? null);
      setTemplates(templateRows);

      if (year) {
        const classPage = await listClasses({
          academicYearId: year.id,
          page: 0,
          size: 100,
          schoolId,
        });
        setClasses(classPage.content);
        setClassId((prev) => prev || classPage.content[0]?.id || "");
      } else {
        setClasses([]);
        setClassId("");
      }

      try {
        const existing = await listReportCardsForStudent(DEMO_STUDENT_ID, {
          academicYearId: year?.id,
          schoolId,
        });
        setCards(existing);
      } catch {
        setCards([]);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setTemplates([]);
      setClasses([]);
      setCards([]);
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

  const filteredCards = useMemo(() => {
    if (!q) return cards;
    return cards.filter((c) =>
      [c.id, c.status, c.periodType, c.verificationCode].join(" ").toLowerCase().includes(q),
    );
  }, [cards, q]);

  const stats = useMemo(
    () => ({
      templates: templates.length,
      active: templates.filter((x) => x.active).length,
      annual: templates.filter((x) => x.periodType === "ANNUAL").length,
      cards: cards.length,
    }),
    [cards.length, templates],
  );

  async function onGenerate() {
    if (!classId) {
      notify.error(t("generate.noClass"));
      return;
    }
    setGenerating(true);
    try {
      const created = await generateReportCards({
        classId,
        periodType: "ANNUAL",
        language: "FR",
        schoolId,
      });
      setCards(created);
      notify.success(t("generate.success", { count: created.length }));
      selectTab("bulletins");
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("generate.error"));
    } finally {
      setGenerating(false);
    }
  }

  async function onDownload(cardId: string) {
    setDownloadingId(cardId);
    try {
      const blob = await downloadReportCardPdf(cardId, schoolId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulletin-${cardId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      notify.success(t("download.success"));
    } catch (error) {
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("download.error"));
    } finally {
      setDownloadingId(null);
    }
  }

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
        yearLocked={yearLocked}
        lockedLabel={yearLocked ? t("yearLockedBadge") : null}
        hint={yearLocked ? t("yearLockedHint") : undefined}
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
          label={t("stats.cards")}
          value={stats.cards}
          loading={loading}
          tone="slate"
          active={tab === "bulletins"}
          onSelect={() => selectTab("bulletins")}
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

      {tab === "bulletins" ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                aria-hidden
              >
                <School2 className="size-[18px] stroke-[1.75]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                    {t("generate.class")}
                  </p>
                  <Badge tone="blue">{t("generate.periodBadge")}</Badge>
                </div>
                <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                  {classes.length === 0 ? t("generate.noClassHint") : t("generate.classHint")}
                </p>
                <Select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="max-w-md"
                  disabled={classes.length === 0 || loading}
                  aria-label={t("generate.class")}
                >
                  {classes.length === 0 ? (
                    <option value="">{t("generate.noClass")}</option>
                  ) : (
                    classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </Select>
              </div>
            </div>
            <Button
              type="button"
              className="w-full shrink-0 sm:w-auto"
              disabled={generating || !classId || !yearId || yearLocked}
              onClick={() => void onGenerate()}
              leadingIcon={<Sparkles className="size-3.5" aria-hidden />}
              aria-label={t("generate.actionFull")}
            >
              {generating ? t("generate.running") : t("generate.action")}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <HubLoadingRows />
      ) : tab === "reviews" ? (
        <EmptyState
          title={t("empty.reviews.title")}
          description={t("empty.reviews.description")}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : tab === "bulletins" ? (
        filteredCards.length === 0 ? (
          <EmptyState
            title={t("empty.bulletins.title")}
            description={t("empty.bulletins.description")}
            icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
            action={
              <Button type="button" disabled={generating || !classId} onClick={() => void onGenerate()}>
                {t("generate.action")}
              </Button>
            }
          />
        ) : (
          <HubTableShell countLabel={t("cardsCount", { count: filteredCards.length })}>
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.period")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.average")}
                  </th>
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.rank")}
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCards.map((item, index) => (
                  <tr
                    key={item.id}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 &&
                        "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.periodType}
                      {item.periodNumber != null ? ` · ${item.periodNumber}` : ""}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">{item.status}</td>
                    <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                      {item.average ?? "—"}
                    </td>
                    <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                      {item.rank ?? "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={downloadingId === item.id}
                        onClick={() => void onDownload(item.id)}
                      >
                        <Download className="size-3.5" aria-hidden />
                        {t("download.action")}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        )
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          title={t("empty.templates.title")}
          description={t("empty.templates.description")}
          icon={<FileSpreadsheet className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredTemplates.map((item) => {
              const href = `${workspaceHome}/reporting/${encodeURIComponent(item.code)}`;
              const isAnnual = item.periodType === "ANNUAL";
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)] pressable"
                  >
                    <span
                      className={cn(
                        "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                        isAnnual
                          ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                          : "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
                      )}
                      aria-hidden
                    >
                      {isAnnual ? (
                        <FileSpreadsheet className="size-[18px] stroke-[1.75]" />
                      ) : (
                        <CalendarRange className="size-[18px] stroke-[1.75]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                        {localizedLabel(item.name, locale)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ios-secondary-label)]">
                        {t("templateMeta", {
                          code: item.code,
                          count: item.sequenceColumns.length,
                        })}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge tone={isAnnual ? "blue" : "warning"}>
                          {isAnnual
                            ? t("periodAnnual")
                            : item.periodType === "TERM"
                              ? t("periodTerm")
                              : t("periodOther", { type: item.periodType })}
                        </Badge>
                        <HubStatusPill
                          active={item.active}
                          activeLabel={t("statusActive")}
                          inactiveLabel={t("inactive")}
                        />
                      </div>
                    </div>
                    <ChevronRight
                      className="size-4 shrink-0 text-[var(--ios-tertiary-label)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <HubTableShell countLabel={t("tableCount", { count: filteredTemplates.length })}>
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_36%,var(--ios-card))]">
                  <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.name")}
                  </th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.period")}
                  </th>
                  <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                  <th className="w-12 px-4 py-3">
                    <span className="sr-only">{t("openTemplate")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((item, index) => {
                  const href = `${workspaceHome}/reporting/${encodeURIComponent(item.code)}`;
                  const isAnnual = item.periodType === "ANNUAL";
                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      role="link"
                      onClick={() => router.push(href)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(href);
                        }
                      }}
                      className={cn(
                        "group cursor-pointer border-b border-[var(--ios-separator)]/45 last:border-b-0 transition-colors duration-[var(--duration-fast)] hover:bg-[color-mix(in_srgb,var(--ios-blue)_7%,transparent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                        index % 2 === 1 &&
                          "bg-[color-mix(in_srgb,var(--ios-fill)_18%,transparent)]",
                        !item.active && "opacity-75",
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] transition-transform duration-[var(--duration-fast)] group-hover:scale-[1.03]",
                              isAnnual
                                ? "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                                : "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
                            )}
                            aria-hidden
                          >
                            {isAnnual ? (
                              <FileSpreadsheet className="size-[18px] stroke-[1.75]" />
                            ) : (
                              <CalendarRange className="size-[18px] stroke-[1.75]" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                              {localizedLabel(item.name, locale)}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--ios-secondary-label)]">
                              {t("templateMeta", {
                                code: item.code,
                                count: item.sequenceColumns.length,
                              })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge tone={isAnnual ? "blue" : "warning"}>
                          {isAnnual
                            ? t("periodAnnual")
                            : item.periodType === "TERM"
                              ? t("periodTerm")
                              : t("periodOther", { type: item.periodType })}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5">
                        <HubStatusPill
                          active={item.active}
                          activeLabel={t("statusActive")}
                          inactiveLabel={t("inactive")}
                        />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <ChevronRight
                          className="ml-auto size-4 text-[var(--ios-tertiary-label)] transition-transform duration-[var(--duration-fast)] group-hover:translate-x-0.5 group-hover:text-[var(--ios-blue)]"
                          aria-hidden
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}
    </div>
  );
}

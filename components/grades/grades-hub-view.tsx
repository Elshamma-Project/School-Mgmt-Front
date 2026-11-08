"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Scale, Shield } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import {
  listEvaluationSessions,
  listGradeAudits,
  listGradingSchemes,
  type EvaluationSessionResponse,
  type GradeAuditEntryResponse,
  type GradingSchemeResponse,
} from "@/lib/api/grading";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import {
  GRADES_TABS,
  moduleListPath,
  parseGradesTab,
  type GradesTab,
} from "@/lib/modules/tabs";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";
import { primaryRole } from "@/types/auth";

type GradesHubViewProps = {
  /** Chemin module URL : grades (admin) ou sequences (directeur). */
  modulePath?: "grades" | "sequences";
};

export function GradesHubView({ modulePath = "grades" }: GradesHubViewProps) {
  const t = useTranslations("gradesHub");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const role = primaryRole(useAuthStore((s) => s.user));
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";

  const tab = parseGradesTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<EvaluationSessionResponse[]>([]);
  const [schemes, setSchemes] = useState<GradingSchemeResponse[]>([]);
  const [audits, setAudits] = useState<GradeAuditEntryResponse[]>([]);

  const selectTab = (next: GradesTab) => {
    router.replace(moduleListPath(workspaceHome, modulePath, next, "sessions"));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [years, schemeRows, auditRows] = await Promise.all([
        listAcademicYears({ page: 0, size: 20, schoolId }),
        listGradingSchemes(schoolId),
        listGradeAudits({ page: 0, size: 50, schoolId }),
      ]);
      const year =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYearLabel(year?.label ?? null);
      setYearStatus(year?.status ?? null);
      setSchemes(schemeRows);
      setAudits(auditRows);

      if (year) {
        const sessionRows = await listEvaluationSessions({
          academicYearId: year.id,
          schoolId,
        });
        setSessions(sessionRows);
      } else {
        setSessions([]);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
      setSessions([]);
      setSchemes([]);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const q = query.trim().toLowerCase();

  const filteredSessions = useMemo(() => {
    if (!q) return sessions;
    return sessions.filter((s) => {
      const name = localizedLabel(s.name, locale).toLowerCase();
      return (
        s.shortLabel.toLowerCase().includes(q) ||
        name.includes(q) ||
        s.status.toLowerCase().includes(q)
      );
    });
  }, [locale, q, sessions]);

  const filteredSchemes = useMemo(() => {
    if (!q) return schemes;
    return schemes.filter((s) => {
      const name = localizedLabel(s.name, locale).toLowerCase();
      return s.code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [locale, q, schemes]);

  const filteredAudits = useMemo(() => {
    if (!q) return audits;
    return audits.filter((a) =>
      [a.action, a.target, a.changedBy, a.reason ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [audits, q]);

  const stats = useMemo(
    () => ({
      sessions: sessions.length,
      open: sessions.filter((s) => s.status === "OPEN").length,
      schemes: schemes.filter((s) => s.active).length,
      audits: audits.length,
    }),
    [audits.length, schemes, sessions],
  );

  const rows =
    tab === "sessions"
      ? filteredSessions
      : tab === "schemes"
        ? filteredSchemes
        : filteredAudits;

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
          label={t("stats.sessions")}
          value={stats.sessions}
          loading={loading}
          tone="blue"
          active={tab === "sessions"}
          onSelect={() => selectTab("sessions")}
          icon={<ClipboardList className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.open")}
          value={stats.open}
          loading={loading}
          tone="green"
          icon={<Shield className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.schemes")}
          value={stats.schemes}
          loading={loading}
          tone="amber"
          active={tab === "schemes"}
          onSelect={() => selectTab("schemes")}
          icon={<Scale className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
        <StatCard
          label={t("stats.audits")}
          value={stats.audits}
          loading={loading}
          tone="slate"
          active={tab === "audits"}
          onSelect={() => selectTab("audits")}
          icon={<ClipboardList className="size-[18px] stroke-[1.75]" aria-hidden />}
        />
      </div>

      <HubToolbar
        tabs={GRADES_TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as GradesTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
      />

      {loading ? (
        <HubLoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          description={t(`empty.${tab}.description`)}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : tab === "sessions" ? (
        <HubTableShell countLabel={t("tableCount", { count: filteredSessions.length })}>
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.session")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.term")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.status")}
                </th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.examDate")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                    index % 2 === 1 &&
                      "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                  )}
                >
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.shortLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                      {localizedLabel(item.name, locale)}
                    </p>
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ios-label)]">
                    {item.termNumber}
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge
                      tone={
                        item.status === "OPEN"
                          ? "success"
                          : item.status === "CLOSED"
                            ? "neutral"
                            : "blue"
                      }
                    >
                      {t.has(`sessionStatus.${item.status}`)
                        ? t(`sessionStatus.${item.status}`)
                        : item.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                    {item.examDate ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HubTableShell>
      ) : tab === "schemes" ? (
        <HubTableShell countLabel={t("tableCount", { count: filteredSchemes.length })}>
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
                  {t("columns.passMark")}
                </th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredSchemes.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                    index % 2 === 1 &&
                      "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                  )}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {localizedLabel(item.name, locale)}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                    {item.code}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                    {String(item.passMark)} / {String(item.maxScore)}
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
      ) : (
        <HubTableShell countLabel={t("tableCount", { count: filteredAudits.length })}>
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.action")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.target")}
                </th>
                <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.actor")}
                </th>
                <th className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                  {t("columns.when")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAudits.map((item, index) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                    index % 2 === 1 &&
                      "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                  )}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                    {item.action}
                    {item.afterSessionClosed ? (
                      <span className="ml-2 text-[10px] font-medium text-[var(--ios-warning)]">
                        {t("afterClosed")}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                    {item.target}
                  </td>
                  <td className="px-3 py-3.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                    {item.changedBy}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[var(--ios-label)]">
                    {new Date(item.changedAt).toLocaleString(locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HubTableShell>
      )}
    </div>
  );
}

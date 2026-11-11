"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ClipboardList,
  Lock,
  LockOpen,
  Scale,
  Shield,
  Unlock,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { GradingSchemePanel } from "@/components/grades/grading-scheme-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { StatCard } from "@/components/ui/stat-card";
import { Textarea } from "@/components/ui/textarea";
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
  closeEvaluationSession,
  listEvaluationSessions,
  listGradeAudits,
  listGradingSchemes,
  openEvaluationSession,
  reopenEvaluationSession,
  type EvaluationSessionResponse,
  type GradeAuditEntryResponse,
  type GradingSchemeResponse,
} from "@/lib/api/grading";
import { userHasCapability } from "@/lib/auth/permissions";
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
import { primaryRole, type AppRole } from "@/types/auth";

type SessionActionKind = "open" | "close" | "reopen";

const SESSION_MANAGERS: readonly AppRole[] = [
  "ADMINISTRATION",
  "DIRECTOR",
  "SUPER_ADMIN",
];

type GradesHubViewProps = {
  /** Chemin module URL : grades (admin) ou sequences (directeur). */
  modulePath?: "grades" | "sequences";
};

export function GradesHubView({ modulePath = "grades" }: GradesHubViewProps) {
  const t = useTranslations("gradesHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  const roles = user?.roles ?? [];
  const role = primaryRole(user);
  const workspaceHome = role ? getRoleHomePath(role) : "/administration";
  const canOpenClose = roles.some((r) => SESSION_MANAGERS.includes(r));
  const canReopen = userHasCapability(roles, "reopenClosedSequence");
  const canManageSchemes = userHasCapability(roles, "manageGradeTemplates");

  const tab = parseGradesTab(searchParams.get("tab"));
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<EvaluationSessionResponse[]>([]);
  const [schemes, setSchemes] = useState<GradingSchemeResponse[]>([]);
  const [audits, setAudits] = useState<GradeAuditEntryResponse[]>([]);
  const [pending, setPending] = useState<{
    session: EvaluationSessionResponse;
    kind: SessionActionKind;
  } | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenInvalid, setReopenInvalid] = useState(false);
  const [acting, setActing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [schemePanel, setSchemePanel] = useState<{
    mode: "create" | "view" | "edit";
    schemeId: string | null;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const clearPending = useCallback(() => {
    setPending(null);
    setReopenReason("");
    setReopenInvalid(false);
  }, []);

  const requestSessionAction = useCallback(
    (session: EvaluationSessionResponse) => {
      if (session.status === "PLANNED") {
        if (!canOpenClose) {
          notify.error(t("sessionAction.forbidden"));
          return;
        }
        setPending({ session, kind: "open" });
        return;
      }
      if (session.status === "OPEN") {
        if (!canOpenClose) {
          notify.error(t("sessionAction.forbidden"));
          return;
        }
        setPending({ session, kind: "close" });
        return;
      }
      if (!canReopen) {
        notify.error(t("sessionAction.reopenForbidden"));
        return;
      }
      setReopenReason("");
      setReopenInvalid(false);
      setPending({ session, kind: "reopen" });
    },
    [canOpenClose, canReopen, t],
  );

  const runSessionAction = useCallback(async () => {
    if (!pending || acting) return;
    const { session, kind } = pending;
    if (kind === "reopen" && !reopenReason.trim()) {
      setReopenInvalid(true);
      notify.error(t("sessionAction.reasonRequired"));
      return;
    }

    setActing(true);
    try {
      let updated: EvaluationSessionResponse;
      if (kind === "open") {
        updated = await openEvaluationSession(session.id, schoolId);
        notify.success(t("sessionAction.openSuccess"));
      } else if (kind === "close") {
        updated = await closeEvaluationSession(session.id, { schoolId });
        notify.success(t("sessionAction.closeSuccess"));
      } else {
        updated = await reopenEvaluationSession(session.id, {
          reason: reopenReason,
          schoolId,
        });
        notify.success(t("sessionAction.reopenSuccess"));
      }
      setSessions((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      clearPending();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("sessionAction.error"));
    } finally {
      setActing(false);
    }
  }, [acting, clearPending, pending, reopenReason, schoolId, t]);

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
        addLabel={tab === "schemes" && canManageSchemes ? t("schemeAdd") : undefined}
        onAdd={
          tab === "schemes" && canManageSchemes
            ? () => setSchemePanel({ mode: "create", schemeId: null })
            : undefined
        }
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
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredSessions.map((item) => {
              const interactive =
                (item.status === "PLANNED" && canOpenClose) ||
                (item.status === "OPEN" && canOpenClose) ||
                (item.status === "CLOSED" && canReopen);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => requestSessionAction(item)}
                    className={cn(
                      "flex w-full items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 text-left shadow-[var(--ios-shadow)]",
                      interactive
                        ? "pressable cursor-pointer hover:bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))]"
                        : "cursor-default",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                        {item.shortLabel}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                        {localizedLabel(item.name, locale)} · T{item.termNumber}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">
                        {item.examDate ?? "—"}
                      </p>
                    </div>
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
                  </button>
                </li>
              );
            })}
          </ul>
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
                {filteredSessions.map((item, index) => {
                  const interactive =
                    (item.status === "PLANNED" && canOpenClose) ||
                    (item.status === "OPEN" && canOpenClose) ||
                    (item.status === "CLOSED" && canReopen) ||
                    canOpenClose ||
                    canReopen;
                  return (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      role="button"
                      onClick={() => requestSessionAction(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          requestSessionAction(item);
                        }
                      }}
                      className={cn(
                        "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                        index % 2 === 1 &&
                          "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                        interactive
                          ? "cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          : "cursor-default",
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
                  );
                })}
              </tbody>
            </table>
          </HubTableShell>
        </>
      ) : tab === "schemes" ? (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredSchemes.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSchemePanel({ mode: "view", schemeId: item.id })}
                  className="pressable flex w-full items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 text-left shadow-[var(--ios-shadow)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {localizedLabel(item.name, locale)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--ios-secondary-label)]">
                      {item.code} · {String(item.passMark)} / {String(item.maxScore)}
                    </p>
                  </div>
                  <HubStatusPill
                    active={item.active}
                    activeLabel={t("statusActive")}
                    inactiveLabel={t("inactive")}
                  />
                </button>
              </li>
            ))}
          </ul>
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
                    tabIndex={0}
                    role="button"
                    onClick={() => setSchemePanel({ mode: "view", schemeId: item.id })}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSchemePanel({ mode: "view", schemeId: item.id });
                      }
                    }}
                    className={cn(
                      "cursor-pointer border-b border-[var(--ios-separator)]/55 last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
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
        </>
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

      <GradingSchemePanel
        open={schemePanel !== null}
        mode={schemePanel?.mode ?? "view"}
        schemeId={schemePanel?.schemeId ?? null}
        schoolId={schoolId}
        canManage={canManageSchemes}
        onClose={() => setSchemePanel(null)}
        onSaved={(scheme) => {
          setSchemes((prev) => {
            const idx = prev.findIndex((row) => row.id === scheme.id);
            if (idx < 0) return [scheme, ...prev];
            const next = [...prev];
            next[idx] = scheme;
            return next;
          });
        }}
      />

      {mounted && pending
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label={tCommon("cancel")}
                className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
                onClick={() => {
                  if (!acting) clearPending();
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-action-title"
                className="relative z-10 w-full max-w-md overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-4 pt-5">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "inline-flex size-11 shrink-0 items-center justify-center rounded-full ring-1",
                        pending.kind === "open" &&
                          "bg-[var(--ios-success-soft)] text-[var(--ios-success)] ring-[color-mix(in_srgb,var(--ios-success)_22%,transparent)]",
                        pending.kind === "close" &&
                          "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)] ring-[color-mix(in_srgb,var(--ios-danger)_22%,transparent)]",
                        pending.kind === "reopen" &&
                          "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)] ring-[color-mix(in_srgb,var(--ios-warning)_22%,transparent)]",
                      )}
                      aria-hidden
                    >
                      {pending.kind === "open" ? (
                        <LockOpen className="size-4 stroke-[1.75]" />
                      ) : pending.kind === "close" ? (
                        <Lock className="size-4 stroke-[1.75]" />
                      ) : (
                        <Unlock className="size-4 stroke-[1.75]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="session-action-title"
                        className="text-[16px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]"
                      >
                        {pending.kind === "open"
                          ? t("sessionAction.openTitle")
                          : pending.kind === "close"
                            ? t("sessionAction.closeTitle")
                            : t("sessionAction.reopenTitle")}
                      </h2>
                      <p className="mt-0.5 text-[12px] text-[var(--ios-secondary-label)]">
                        {yearLabel
                          ? t("sessionAction.panelHint", { year: yearLabel })
                          : t("yearEmpty")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={tCommon("cancel")}
                    disabled={acting}
                    onClick={() => clearPending()}
                    className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--ios-secondary-label)] transition-colors hover:bg-[var(--ios-fill)] hover:text-[var(--ios-label)] disabled:opacity-50"
                  >
                    <X className="size-4 stroke-[1.75]" aria-hidden />
                  </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                  <div className="rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                          {pending.session.shortLabel}
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--ios-secondary-label)]">
                          {localizedLabel(pending.session.name, locale)}
                        </p>
                      </div>
                      <Badge
                        tone={
                          pending.session.status === "OPEN"
                            ? "success"
                            : pending.session.status === "CLOSED"
                              ? "neutral"
                              : "blue"
                        }
                      >
                        {t.has(`sessionStatus.${pending.session.status}`)
                          ? t(`sessionStatus.${pending.session.status}`)
                          : pending.session.status}
                      </Badge>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <dt className="text-[var(--ios-tertiary-label)]">
                          {t("sessionAction.statusLabel")}
                        </dt>
                        <dd className="mt-0.5 font-medium text-[var(--ios-label)]">
                          {t.has(`sessionStatus.${pending.session.status}`)
                            ? t(`sessionStatus.${pending.session.status}`)
                            : pending.session.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--ios-tertiary-label)]">
                          {t("columns.term")}
                        </dt>
                        <dd className="mt-0.5 font-medium text-[var(--ios-label)]">
                          {t("sessionAction.termLabel", {
                            term: pending.session.termNumber,
                          })}
                        </dd>
                      </div>
                      <div className="col-span-2 flex items-center gap-1.5">
                        <CalendarDays
                          className="size-3.5 text-[var(--ios-tertiary-label)]"
                          aria-hidden
                        />
                        <span className="text-[var(--ios-tertiary-label)]">
                          {t("sessionAction.examLabel")}
                        </span>
                        <span className="font-medium text-[var(--ios-label)]">
                          {pending.session.examDate ?? "—"}
                        </span>
                      </div>
                    </dl>
                  </div>

                  <p className="text-[13px] leading-relaxed text-[var(--ios-secondary-label)]">
                    {pending.kind === "open"
                      ? t("sessionAction.openDescription")
                      : pending.kind === "close"
                        ? t("sessionAction.closeDescription")
                        : t("sessionAction.reopenDescription")}
                  </p>

                  {pending.kind === "reopen" ? (
                    <Field
                      label={t("sessionAction.reasonLabel")}
                      error={
                        reopenInvalid
                          ? t("sessionAction.reasonRequired")
                          : undefined
                      }
                    >
                      <Textarea
                        value={reopenReason}
                        onChange={(event) => {
                          setReopenReason(event.target.value);
                          if (reopenInvalid && event.target.value.trim()) {
                            setReopenInvalid(false);
                          }
                        }}
                        placeholder={t("sessionAction.reasonPlaceholder")}
                        invalid={reopenInvalid}
                        rows={3}
                        disabled={acting}
                        autoFocus
                      />
                    </Field>
                  ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-4 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={acting}
                    onClick={() => clearPending()}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant={pending.kind === "close" ? "destructive" : "primary"}
                    disabled={
                      acting ||
                      (pending.kind === "reopen" && !reopenReason.trim())
                    }
                    onClick={() => void runSessionAction()}
                  >
                    {acting
                      ? tCommon("loading")
                      : pending.kind === "open"
                        ? t("sessionAction.openConfirm")
                        : pending.kind === "close"
                          ? t("sessionAction.closeConfirm")
                          : t("sessionAction.reopenConfirm")}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

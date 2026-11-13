"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  ClipboardList,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Scale,
  ScrollText,
  Search,
  Settings,
  Shield,
  Unlock,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { GradeCorrectionsPanel } from "@/components/grades/grade-corrections-panel";
import { GradingSchemePanel } from "@/components/grades/grading-scheme-panel";
import { ReportSheetsPanel } from "@/components/grades/report-sheets-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { IconInput } from "@/components/ui/icon-input";
import { Input } from "@/components/ui/input";
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
  ensureEvaluationSessions,
  listEvaluationSessions,
  listGradeAudits,
  listGradingSchemes,
  openEvaluationSession,
  reopenEvaluationSession,
  updateEvaluationSessionSchedule,
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

type SessionActionKind = "open" | "close" | "reopen" | "examDate";

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

  const canReviewReportSheets = userHasCapability(roles, "reviewReportSheets");
  const canVisaPrincipal = userHasCapability(roles, "visaPrincipalReportSheet");
  const canApproveCorrections = userHasCapability(roles, "approveGradeCorrections");

  const requestedTab = parseGradesTab(searchParams.get("tab"));
  // SG : atterrir sur les fiches de report (visas), pas sur les séances.
  const preferredDefault: GradesTab =
    role === "SURVEILLANT_GENERAL" && canReviewReportSheets ? "reportSheets" : "sessions";
  const resolvedTab: GradesTab =
    !searchParams.get("tab") ? preferredDefault : requestedTab;
  const tab: GradesTab =
    resolvedTab === "reportSheets" && !canReviewReportSheets
      ? "sessions"
      : resolvedTab === "corrections" && !canApproveCorrections
        ? preferredDefault
        : resolvedTab === "schemes" && !canManageSchemes
          ? preferredDefault
          : resolvedTab;
  const visibleTabs = GRADES_TABS.filter((key) => {
    if (key === "reportSheets") return canReviewReportSheets;
    if (key === "corrections") return canApproveCorrections;
    if (key === "schemes") return canManageSchemes;
    if (role === "SURVEILLANT_GENERAL") return key === "reportSheets";
    return true;
  });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [ensuring, setEnsuring] = useState(false);
  const [yearId, setYearId] = useState<string | null>(null);
  const [yearLabel, setYearLabel] = useState<string | null>(null);
  const [yearStatus, setYearStatus] = useState<string | null>(null);
  const [yearLocked, setYearLocked] = useState(false);
  const [sessions, setSessions] = useState<EvaluationSessionResponse[]>([]);
  const [schemes, setSchemes] = useState<GradingSchemeResponse[]>([]);
  const [audits, setAudits] = useState<GradeAuditEntryResponse[]>([]);
  const [detailSession, setDetailSession] = useState<EvaluationSessionResponse | null>(
    null,
  );
  const [pending, setPending] = useState<{
    session: EvaluationSessionResponse;
    kind: SessionActionKind;
  } | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopenInvalid, setReopenInvalid] = useState(false);
  const [examDateDraft, setExamDateDraft] = useState("");
  const [startDateDraft, setStartDateDraft] = useState("");
  const [endDateDraft, setEndDateDraft] = useState("");
  const [entryDeadlineDraft, setEntryDeadlineDraft] = useState("");
  const [examDateInvalid, setExamDateInvalid] = useState(false);
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
      setYearId(year?.id ?? null);
      setYearLabel(year?.label ?? null);
      setYearStatus(year?.status ?? null);
      setYearLocked(Boolean(year?.locked));
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
      setYearId(null);
      setSessions([]);
      setSchemes([]);
      setAudits([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  async function onEnsureSessions() {
    if (!yearId || ensuring || yearLocked) return;
    setEnsuring(true);
    try {
      const rows = await ensureEvaluationSessions({
        academicYearId: yearId,
        schoolId,
      });
      setSessions(rows);
      notify.success(t("sessionEnsureSuccess", { count: rows.length }));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("sessionEnsureError"));
    } finally {
      setEnsuring(false);
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const clearPending = useCallback(() => {
    setPending(null);
    setReopenReason("");
    setReopenInvalid(false);
    setExamDateDraft("");
    setStartDateDraft("");
    setEndDateDraft("");
    setEntryDeadlineDraft("");
    setExamDateInvalid(false);
  }, []);

  function formatSessionDate(value: string | null | undefined): string {
    if (!value) return "—";
    const iso = value.includes("T") ? value : `${value}T12:00:00`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  const requestSessionAction = useCallback(
    (session: EvaluationSessionResponse, kind: SessionActionKind) => {
      if (yearLocked) {
        notify.error(t("sessionAction.yearLocked"));
        return;
      }
      if (kind === "open" || kind === "close" || kind === "examDate") {
        if (!canOpenClose) {
          notify.error(t("sessionAction.forbidden"));
          return;
        }
      }
      if (kind === "reopen" && !canReopen) {
        notify.error(t("sessionAction.reopenForbidden"));
        return;
      }
      if (kind === "reopen") {
        setReopenReason("");
        setReopenInvalid(false);
      }
      if (kind === "examDate") {
        setExamDateDraft(session.examDate ?? "");
        setStartDateDraft(session.startDate ?? "");
        setEndDateDraft(session.endDate ?? "");
        setEntryDeadlineDraft(session.entryDeadline ?? "");
        setExamDateInvalid(false);
      }
      setPending({ session, kind });
    },
    [canOpenClose, canReopen, t, yearLocked],
  );

  const runSessionAction = useCallback(async () => {
    if (!pending || acting) return;
    const { session, kind } = pending;
    const sessionLabel = session.shortLabel || localizedLabel(session.name, locale);
    if (kind === "reopen" && !reopenReason.trim()) {
      setReopenInvalid(true);
      notify.error(t("sessionAction.reasonRequired"));
      return;
    }
    if (
      kind === "examDate" &&
      !examDateDraft.trim() &&
      !startDateDraft.trim() &&
      !endDateDraft.trim() &&
      !entryDeadlineDraft.trim()
    ) {
      setExamDateInvalid(true);
      notify.error(t("sessionAction.examDateRequired"));
      return;
    }

    setActing(true);
    try {
      let updated: EvaluationSessionResponse;
      if (kind === "open") {
        updated = await openEvaluationSession(session.id, schoolId);
        notify.success(t("sessionAction.openSuccess"), {
          description: sessionLabel,
        });
      } else if (kind === "close") {
        updated = await closeEvaluationSession(session.id, { schoolId });
        notify.success(t("sessionAction.closeSuccess"), {
          description: sessionLabel,
        });
      } else if (kind === "examDate") {
        updated = await updateEvaluationSessionSchedule(session.id, {
          examDate: examDateDraft.trim() || null,
          startDate: startDateDraft.trim() || null,
          endDate: endDateDraft.trim() || null,
          entryDeadline: entryDeadlineDraft.trim() || null,
          schoolId,
        });
        notify.success(t("sessionAction.examDateSuccess"), {
          description: sessionLabel,
        });
      } else {
        updated = await reopenEvaluationSession(session.id, {
          reason: reopenReason,
          schoolId,
        });
        notify.success(t("sessionAction.reopenSuccess"), {
          description: sessionLabel,
        });
      }
      setSessions((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setDetailSession((prev) => (prev?.id === updated.id ? updated : prev));
      clearPending();
    } catch (error) {
      if (isAuthFailure(error)) {
        notify.error(t("sessionAction.error"), {
          description: t("sessionAction.authFailed"),
        });
        return;
      }
      if (error instanceof ApiError) {
        const code = (error.code ?? "").toUpperCase();
        if (code === "TOO_MANY_OPEN_SESSIONS") {
          notify.error(t("sessionAction.tooManyOpen"), { description: sessionLabel });
        } else if (code === "OPEN_TERM_CONFLICT") {
          notify.error(t("sessionAction.openTermConflict"), { description: sessionLabel });
        } else if (error.status === 0 || code === "NETWORK") {
          notify.error(t("sessionAction.networkError"), { description: sessionLabel });
        } else {
          notify.error(t("sessionAction.error"), {
            description: error.message?.trim() || sessionLabel,
          });
        }
      } else {
        notify.error(t("sessionAction.error"), { description: sessionLabel });
      }
    } finally {
      setActing(false);
    }
  }, [
    acting,
    clearPending,
    endDateDraft,
    entryDeadlineDraft,
    examDateDraft,
    locale,
    pending,
    reopenReason,
    schoolId,
    startDateDraft,
    t,
  ]);

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

  /** BR-25 : trimestre des séquences OPEN (un seul à la fois). */
  const activeOpenTerm = useMemo((): 1 | 2 | 3 | null => {
    const openTerm = sessions.find((s) => s.status === "OPEN")?.termNumber;
    return openTerm === 1 || openTerm === 2 || openTerm === 3 ? openTerm : null;
  }, [sessions]);

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
        yearLocked={yearLocked}
        lockedLabel={yearLocked ? t("yearLockedBadge") : null}
        hint={yearLocked ? t("yearLockedHint") : undefined}
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
        tabs={visibleTabs.map((key) => ({ key, label: t(`tabs.${key}`) }))}
        activeTab={tab}
        onTabChange={(key) => selectTab(key as GradesTab)}
        tabsAriaLabel={t("tabsNav")}
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder={t(`search.${tab}`)}
        hideSearch={tab === "audits"}
      />

      {tab === "audits" ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-fill)] text-[var(--ios-secondary-label)]"
                aria-hidden
              >
                <ScrollText className="size-[18px] stroke-[1.75]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                    {t("auditCardTitle")}
                  </p>
                  <Badge tone="neutral">{t("tabs.audits")}</Badge>
                </div>
                <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                  {t("auditCardHint")}
                </p>
              </div>
            </div>
            <div className="w-full min-w-0 sm:max-w-[260px]">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                {t("auditSearchLabel")}
              </p>
              <IconInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search.audits")}
                icon={<Search className="size-4 stroke-[1.75]" />}
                aria-label={tCommon("search")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "schemes" ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]"
                aria-hidden
              >
                <Scale className="size-[18px] stroke-[1.75]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                    {t("schemeCardTitle")}
                  </p>
                  <Badge tone="warning">{t("tabs.schemes")}</Badge>
                </div>
                <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                  {canManageSchemes ? t("schemeCardHint") : t("schemeManageHint")}
                </p>
              </div>
            </div>
            {canManageSchemes ? (
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                leadingIcon={<Plus className="size-3.5" aria-hidden />}
                aria-label={t("schemeAddFull")}
                onClick={() => setSchemePanel({ mode: "create", schemeId: null })}
              >
                {t("schemeAdd")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "sessions" ? (
        <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span
                className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                aria-hidden
              >
                <ClipboardList className="size-[18px] stroke-[1.75]" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                    {t("sessionCardTitle")}
                  </p>
                  <Badge tone="blue">{t("tabs.sessions")}</Badge>
                </div>
                <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                  {!canOpenClose
                    ? t("sessionManageHint")
                    : sessions.length === 0
                      ? t("sessionEnsureHint")
                      : t("sessionCardHint")}
                </p>
              </div>
            </div>
            {canOpenClose && sessions.length === 0 ? (
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                leadingIcon={<Plus className="size-3.5" aria-hidden />}
                aria-label={t("sessionEnsureFull")}
                disabled={ensuring || !yearId || yearLocked || loading}
                onClick={() => void onEnsureSessions()}
              >
                {ensuring ? t("sessionEnsureRunning") : t("sessionEnsure")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "reportSheets" ? (
        <ReportSheetsPanel
          schoolId={schoolId}
          academicYearId={yearId}
          yearLabel={yearLabel}
          defaultTerm={activeOpenTerm ?? 1}
          activeTerm={activeOpenTerm}
          query={query}
          canVisaSupervisor={canReviewReportSheets}
          canVisaPrincipal={canVisaPrincipal}
        />
      ) : tab === "corrections" ? (
        <GradeCorrectionsPanel schoolId={schoolId} query={query} />
      ) : loading ? (
        <HubLoadingRows />
      ) : rows.length === 0 ? (
        <EmptyState
          title={t(`empty.${tab}.title`)}
          description={t(`empty.${tab}.description`)}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
          action={
            tab === "sessions" && canOpenClose ? (
              <Button
                type="button"
                leadingIcon={<Plus className="size-3.5" aria-hidden />}
                disabled={ensuring || !yearId || yearLocked}
                onClick={() => void onEnsureSessions()}
              >
                {ensuring ? t("sessionEnsureRunning") : t("sessionEnsure")}
              </Button>
            ) : undefined
          }
        />
      ) : tab === "sessions" ? (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredSessions.map((item) => (
              <li
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailSession(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setDetailSession(item);
                  }
                }}
                className="cursor-pointer rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)] transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <div className="flex w-full items-start justify-between gap-3 text-left">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {item.shortLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                      {localizedLabel(item.name, locale)} · T{item.termNumber}
                    </p>
                    <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">
                      {formatSessionDate(item.examDate)}
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
                </div>
                <div
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <SessionRowActions
                    item={item}
                    yearLocked={yearLocked}
                    canOpenClose={canOpenClose}
                    canReopen={canReopen}
                    busy={acting}
                    labels={{
                      open: t("sessionAction.openConfirm"),
                      close: t("sessionAction.closeConfirm"),
                      reopen: t("sessionAction.reopenConfirm"),
                      examDate: t("sessionAction.examDateEdit"),
                      none: t("sessionAction.noAction"),
                    }}
                    onAction={requestSessionAction}
                  />
                </div>
              </li>
            ))}
          </ul>
          <HubTableShell countLabel={t("tableCount", { count: filteredSessions.length })}>
            <table className="w-full min-w-[820px] border-collapse text-left">
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
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.examDate")}
                  </th>
                  <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((item, index) => (
                  <tr
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setDetailSession(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailSession(item);
                      }
                    }}
                    className={cn(
                      "cursor-pointer border-b border-[var(--ios-separator)]/55 last:border-b-0 transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
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
                    <td className="px-3 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                      {formatSessionDate(item.examDate)}
                    </td>
                    <td
                      className="px-5 py-3.5"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <SessionRowActions
                        item={item}
                        yearLocked={yearLocked}
                        canOpenClose={canOpenClose}
                        canReopen={canReopen}
                        dense
                        busy={acting}
                        labels={{
                          open: t("sessionAction.openConfirm"),
                          close: t("sessionAction.closeConfirm"),
                          reopen: t("sessionAction.reopenConfirm"),
                          examDate: t("sessionAction.examDateEdit"),
                          none: t("sessionAction.noAction"),
                        }}
                        onAction={requestSessionAction}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      ) : tab === "schemes" ? (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filteredSchemes.map((item) => (
              <li
                key={item.id}
                className="rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <button
                  type="button"
                  onClick={() => setSchemePanel({ mode: "view", schemeId: item.id })}
                  className="pressable flex w-full items-start justify-between gap-3 text-left"
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
                {canManageSchemes ? (
                  <div className="mt-2.5 flex justify-end border-t border-[var(--ios-separator)]/45 pt-2.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      leadingIcon={<Pencil className="size-3.5" aria-hidden />}
                      onClick={() => setSchemePanel({ mode: "edit", schemeId: item.id })}
                    >
                      {tCommon("edit")}
                    </Button>
                  </div>
                ) : null}
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
                  <th className="px-3 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.status")}
                  </th>
                  {canManageSchemes ? (
                    <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                      {t("columns.actions")}
                    </th>
                  ) : null}
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
                    <td className="px-3 py-3.5">
                      <HubStatusPill
                        active={item.active}
                        activeLabel={t("statusActive")}
                        inactiveLabel={t("inactive")}
                      />
                    </td>
                    {canManageSchemes ? (
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          leadingIcon={<Pencil className="size-3.5" aria-hidden />}
                          aria-label={tCommon("edit")}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSchemePanel({ mode: "edit", schemeId: item.id });
                          }}
                        >
                          {tCommon("edit")}
                        </Button>
                      </td>
                    ) : null}
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

      {mounted && detailSession
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label={tCommon("cancel")}
                className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
                onClick={() => setDetailSession(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="session-detail-title"
                className="relative z-10 flex max-h-[min(90dvh,560px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-3.5 pt-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-info-soft)] text-[var(--ios-blue)]"
                      aria-hidden
                    >
                      <ClipboardList className="size-4 stroke-[1.75]" />
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="session-detail-title"
                        className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]"
                      >
                        {t("sessionAction.detailTitle")}
                      </h2>
                      <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">
                        {yearLabel
                          ? t("sessionAction.panelHint", { year: yearLabel })
                          : t("yearEmpty")}
                      </p>
                    </div>
                  </div>
                  <DialogCloseButton
                    aria-label={t("sessionAction.detailClose")}
                    onClick={() => setDetailSession(null)}
                  />
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--ios-fill)]/70 px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[12px] font-semibold",
                        detailSession.status === "OPEN" &&
                          "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
                        detailSession.status === "CLOSED" &&
                          "bg-[var(--ios-card)] text-[var(--ios-secondary-label)]",
                        detailSession.status === "PLANNED" &&
                          "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
                      )}
                      aria-hidden
                    >
                      {detailSession.shortLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                        {localizedLabel(detailSession.name, locale)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                        {t("sessionAction.numberLabel")} {detailSession.number}
                        {" · "}
                        {t("sessionAction.termLabel", {
                          term: detailSession.termNumber,
                        })}
                      </p>
                    </div>
                    <Badge
                      tone={
                        detailSession.status === "OPEN"
                          ? "success"
                          : detailSession.status === "CLOSED"
                            ? "neutral"
                            : "blue"
                      }
                    >
                      {t.has(`sessionStatus.${detailSession.status}`)
                        ? t(`sessionStatus.${detailSession.status}`)
                        : detailSession.status}
                    </Badge>
                  </div>

                  <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55">
                    {(
                      [
                        [t("sessionAction.examLabel"), formatSessionDate(detailSession.examDate)],
                        [
                          t("sessionAction.startDateLabel"),
                          formatSessionDate(detailSession.startDate),
                        ],
                        [t("sessionAction.endDateLabel"), formatSessionDate(detailSession.endDate)],
                        [
                          t("sessionAction.entryDeadlineLabel"),
                          formatSessionDate(detailSession.entryDeadline),
                        ],
                        [
                          t("sessionAction.openedAtLabel"),
                          formatSessionDate(detailSession.openedAt),
                        ],
                        [
                          t("sessionAction.closedAtLabel"),
                          formatSessionDate(detailSession.closedAt),
                        ],
                      ] as const
                    ).map(([label, value], index, rows) => (
                      <div
                        key={label}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3.5 py-2.5",
                          index < rows.length - 1 &&
                            "border-b border-[var(--ios-separator)]/55",
                        )}
                      >
                        <span className="text-[12px] text-[var(--ios-secondary-label)]">
                          {label}
                        </span>
                        <span className="text-[12px] font-medium tabular-nums text-[var(--ios-label)]">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-3.5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghostDestructive"
                    onClick={() => setDetailSession(null)}
                  >
                    {t("sessionAction.detailClose")}
                  </Button>
                  {canOpenClose && !yearLocked ? (
                    <Button
                      type="button"
                      variant="primary"
                      leadingIcon={<Settings className="size-3.5" aria-hidden />}
                      onClick={() => {
                        const session = detailSession;
                        setDetailSession(null);
                        requestSessionAction(session, "examDate");
                      }}
                      >
                      {t("sessionAction.examDateEdit")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                aria-busy={acting || undefined}
                aria-labelledby="session-action-title"
                className="relative z-10 flex max-h-[min(90dvh,620px)] w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-3.5 pt-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                        pending.kind === "open" &&
                          "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
                        pending.kind === "close" &&
                          "bg-[var(--ios-danger-soft)] text-[var(--ios-danger)]",
                        pending.kind === "reopen" &&
                          "bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]",
                        pending.kind === "examDate" &&
                          "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
                      )}
                      aria-hidden
                    >
                      {pending.kind === "open" ? (
                        <LockOpen className="size-4 stroke-[1.75]" />
                      ) : pending.kind === "close" ? (
                        <Lock className="size-4 stroke-[1.75]" />
                      ) : pending.kind === "examDate" ? (
                        <CalendarDays className="size-4 stroke-[1.75]" />
                      ) : (
                        <Unlock className="size-4 stroke-[1.75]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <h2
                        id="session-action-title"
                        className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]"
                      >
                        {pending.kind === "open"
                          ? t("sessionAction.openTitle")
                          : pending.kind === "close"
                            ? t("sessionAction.closeTitle")
                            : pending.kind === "examDate"
                              ? t("sessionAction.examDateTitle")
                              : t("sessionAction.reopenTitle")}
                      </h2>
                      <p className="mt-1 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                        {pending.kind === "open"
                          ? t("sessionAction.openDescription")
                          : pending.kind === "close"
                            ? t("sessionAction.closeDescription")
                            : pending.kind === "examDate"
                              ? t("sessionAction.examDateDescription")
                              : t("sessionAction.reopenDescription")}
                      </p>
                    </div>
                  </div>
                  <DialogCloseButton
                    aria-label={tCommon("cancel")}
                    disabled={acting}
                    onClick={() => clearPending()}
                  />
                </div>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-[var(--ios-fill)]/70 px-3 py-2.5">
                    <span
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[12px] font-semibold tracking-[-0.01em]",
                        pending.session.status === "OPEN" &&
                          "bg-[var(--ios-success-soft)] text-[var(--ios-success)]",
                        pending.session.status === "CLOSED" &&
                          "bg-[var(--ios-card)] text-[var(--ios-secondary-label)]",
                        pending.session.status === "PLANNED" &&
                          "bg-[var(--ios-info-soft)] text-[var(--ios-blue)]",
                      )}
                      aria-hidden
                    >
                      {pending.session.shortLabel}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                        {localizedLabel(pending.session.name, locale)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-[var(--ios-secondary-label)]">
                        {t("sessionAction.termLabel", {
                          term: pending.session.termNumber,
                        })}
                        {yearLabel ? ` · ${yearLabel}` : ""}
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

                  {pending.kind === "examDate" ? (
                    <div className="space-y-3">
                      <Field
                        label={t("sessionAction.examLabel")}
                        error={
                          examDateInvalid
                            ? t("sessionAction.examDateRequired")
                            : undefined
                        }
                      >
                        <Input
                          type="date"
                          value={examDateDraft}
                          onChange={(event) => {
                            setExamDateDraft(event.target.value);
                            if (examDateInvalid && event.target.value.trim()) {
                              setExamDateInvalid(false);
                            }
                          }}
                          invalid={examDateInvalid}
                          disabled={acting}
                          autoFocus
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label={t("sessionAction.startDateLabel")}>
                          <Input
                            type="date"
                            value={startDateDraft}
                            onChange={(event) => setStartDateDraft(event.target.value)}
                            disabled={acting}
                          />
                        </Field>
                        <Field label={t("sessionAction.endDateLabel")}>
                          <Input
                            type="date"
                            value={endDateDraft}
                            onChange={(event) => setEndDateDraft(event.target.value)}
                            disabled={acting}
                          />
                        </Field>
                      </div>
                      <Field label={t("sessionAction.entryDeadlineLabel")}>
                        <Input
                          type="date"
                          value={entryDeadlineDraft}
                          onChange={(event) => setEntryDeadlineDraft(event.target.value)}
                          disabled={acting}
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-3.5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={acting}
                    onClick={() => clearPending()}
                    className="pressable inline-flex h-[var(--control-height-md)] cursor-pointer items-center justify-center rounded-[var(--radius-md)] px-4 text-[12px] font-semibold text-[var(--ios-danger)] transition-colors hover:bg-[var(--ios-danger-soft)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {tCommon("cancel")}
                  </button>
                  <Button
                    type="button"
                    variant={pending.kind === "close" ? "destructive" : "primary"}
                    loading={acting}
                    disabled={
                      acting ||
                      (pending.kind === "reopen" && !reopenReason.trim()) ||
                      (pending.kind === "examDate" &&
                        !examDateDraft.trim() &&
                        !startDateDraft.trim() &&
                        !endDateDraft.trim() &&
                        !entryDeadlineDraft.trim())
                    }
                    onClick={() => void runSessionAction()}
                  >
                    {acting
                      ? t("sessionAction.working")
                      : pending.kind === "open"
                        ? t("sessionAction.openConfirm")
                        : pending.kind === "close"
                          ? t("sessionAction.closeConfirm")
                          : pending.kind === "examDate"
                            ? t("sessionAction.examDateConfirm")
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

function SessionRowActions({
  item,
  yearLocked,
  canOpenClose,
  canReopen,
  dense = false,
  busy = false,
  labels,
  onAction,
}: {
  item: EvaluationSessionResponse;
  yearLocked: boolean;
  canOpenClose: boolean;
  canReopen: boolean;
  dense?: boolean;
  /** Désactive les boutons pendant un appel API (dialog de confirmation). */
  busy?: boolean;
  labels: {
    open: string;
    close: string;
    reopen: string;
    examDate: string;
    none: string;
  };
  onAction: (session: EvaluationSessionResponse, kind: SessionActionKind) => void;
}) {
  const canLifecycle =
    !yearLocked &&
    ((item.status === "PLANNED" && canOpenClose) ||
      (item.status === "OPEN" && canOpenClose) ||
      (item.status === "CLOSED" && canReopen));
  const canEditDate = !yearLocked && canOpenClose;

  if (!canLifecycle && !canEditDate) {
    return (
      <p
        className={cn(
          "text-[11px] text-[var(--ios-tertiary-label)]",
          dense ? "text-right" : "mt-2.5 border-t border-[var(--ios-separator)]/45 pt-2.5",
        )}
      >
        {labels.none}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        dense ? "justify-end" : "mt-2.5 justify-end border-t border-[var(--ios-separator)]/45 pt-2.5",
      )}
    >
      {item.status === "PLANNED" && canOpenClose && !yearLocked ? (
        <Button
          type="button"
          size="sm"
          disabled={busy}
          leadingIcon={<LockOpen className="size-3.5" aria-hidden />}
          onClick={() => onAction(item, "open")}
        >
          {labels.open}
        </Button>
      ) : null}
      {item.status === "OPEN" && canOpenClose && !yearLocked ? (
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          leadingIcon={<Lock className="size-3.5" aria-hidden />}
          onClick={() => onAction(item, "close")}
        >
          {labels.close}
        </Button>
      ) : null}
      {item.status === "CLOSED" && canReopen && !yearLocked ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          leadingIcon={<Unlock className="size-3.5" aria-hidden />}
          onClick={() => onAction(item, "reopen")}
        >
          {labels.reopen}
        </Button>
      ) : null}
      {canEditDate ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          leadingIcon={<Settings className="size-3.5" aria-hidden />}
          onClick={() => onAction(item, "examDate")}
        >
          {labels.examDate}
        </Button>
      ) : null}
    </div>
  );
}

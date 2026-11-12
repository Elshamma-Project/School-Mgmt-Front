"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Download, FilePlus2, FileText, RefreshCw, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ReportSheetPaper, REPORT_SHEET_DEADLINE_HOURS } from "@/components/teacher/report-sheet-paper";
import { SequenceEntryPanel } from "@/components/teacher/sequence-entry-panel";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  HubLoadingRows,
  HubToolbar,
  HubYearBanner,
} from "@/components/workspace/hub-chrome";
import {
  listAcademicYears,
  listTeacherAssignments,
  localizedLabel,
  type AcademicYearResponse,
  type TeacherAssignmentResponse,
} from "@/lib/api/academic";
import {
  downloadGradeReportSheetPdf,
  generateGradeReportSheet,
  listEvaluationSessions,
  listGradeReportSheets,
  regenerateGradeReportSheet,
  submitGradeReportSheet,
  type EvaluationSessionResponse,
  type GradeReportSheetResponse,
} from "@/lib/api/grading";
import { formatCoefficient } from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError, isAuthFailure } from "@/types/api";

type Term = 1 | 2 | 3;
type TeacherTab = "report" | "entry";
type PendingAction = "regenerate" | "blank" | "submit" | null;

const TERMS: Term[] = [1, 2, 3];
const TABS: TeacherTab[] = ["report", "entry"];

function apiMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

/** Espace enseignant : fiche de report de notes (vue principale) + saisie des séquences. */
export function TeacherGradesView() {
  const t = useTranslations("teacherGrades");
  const tReport = useTranslations("teacherGrades.report");
  const tCommon = useTranslations("common");
  const tHub = useTranslations("gradesHub");
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const schoolId = user?.schoolId;
  // L’identifiant de fiche personnel (Staff.id) est le profileId du compte de type STAFF.
  const staffProfileId = user?.profileType === "STAFF" ? user.profileId : null;

  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState<AcademicYearResponse | null>(null);
  const [sessions, setSessions] = useState<EvaluationSessionResponse[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [term, setTerm] = useState<Term>(1);
  const [tab, setTab] = useState<TeacherTab>("report");

  const [sheets, setSheets] = useState<GradeReportSheetResponse[]>([]);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [acting, setActing] = useState<"generate" | "blank" | "submit" | "pdf" | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const yearId = year?.id ?? null;

  // ── Chargement initial : année courante, séquences, affectations ─────────
  const loadBase = useCallback(async () => {
    if (!staffProfileId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const years = await listAcademicYears({ page: 0, size: 20, schoolId });
      const current =
        years.content.find((y) => y.current) ??
        years.content.find((y) => y.status === "ACTIVE") ??
        years.content[0] ??
        null;
      setYear(current);
      if (!current) {
        setSessions([]);
        setAssignments([]);
        return;
      }
      const [sessionRows, assignmentRows] = await Promise.all([
        listEvaluationSessions({ academicYearId: current.id, schoolId }),
        listTeacherAssignments(staffProfileId, { schoolId, academicYearId: current.id }),
      ]);
      const active = assignmentRows.filter((a) => a.active);
      setSessions(sessionRows);
      setAssignments(active);
      setSelectedId((prev) =>
        prev && active.some((a) => a.classSubjectId === prev) ? prev : (active[0]?.classSubjectId ?? null),
      );
      const open = sessionRows.find((s) => s.status === "OPEN");
      if (open && (open.termNumber === 1 || open.termNumber === 2 || open.termNumber === 3)) {
        setTerm(open.termNumber);
      }
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(apiMessage(error, t("loadError")));
    } finally {
      setLoading(false);
    }
  }, [schoolId, staffProfileId, t]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  // ── Fiches de report du trimestre ───────────────────────────────────────
  const loadSheets = useCallback(async () => {
    if (!yearId) return;
    setSheetsLoading(true);
    try {
      setSheets(await listGradeReportSheets(yearId, term, schoolId));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(apiMessage(error, tReport("loadError")));
      setSheets([]);
    } finally {
      setSheetsLoading(false);
    }
  }, [schoolId, term, tReport, yearId]);

  useEffect(() => {
    void loadSheets();
  }, [loadSheets]);

  const assignment = useMemo(
    () => assignments.find((a) => a.classSubjectId === selectedId) ?? null,
    [assignments, selectedId],
  );
  const sheet = useMemo(
    () => sheets.find((s) => s.classSubjectId === selectedId) ?? null,
    [sheets, selectedId],
  );
  const termSessions = useMemo(
    () => sessions.filter((s) => s.termNumber === term),
    [sessions, term],
  );

  function upsertSheet(next: GradeReportSheetResponse) {
    setSheets((prev) => {
      const index = prev.findIndex((s) => s.id === next.id || s.classSubjectId === next.classSubjectId);
      if (index < 0) return [...prev, next];
      const copy = [...prev];
      copy[index] = next;
      return copy;
    });
  }

  async function runGenerate(blank: boolean) {
    if (!assignment || acting) return;
    setActing(blank ? "blank" : "generate");
    try {
      const result = sheet
        ? await regenerateGradeReportSheet(sheet.id, { blank, schoolId })
        : await generateGradeReportSheet({
            classSubjectId: assignment.classSubjectId,
            termNumber: term,
            blank,
            schoolId,
          });
      upsertSheet(result);
      notify.success(
        blank
          ? tReport("blankSuccess")
          : sheet
            ? tReport("regenerateSuccess")
            : tReport("generateSuccess"),
      );
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(apiMessage(error, tReport("generateError")));
    } finally {
      setActing(null);
    }
  }

  async function runSubmit() {
    if (!sheet || acting) return;
    setActing("submit");
    try {
      upsertSheet(await submitGradeReportSheet(sheet.id, schoolId));
      notify.success(tReport("submitSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(apiMessage(error, tReport("submitError")));
    } finally {
      setActing(null);
    }
  }

  async function runPdf() {
    if (!sheet || acting) return;
    setActing("pdf");
    try {
      const blob = await downloadGradeReportSheetPdf(sheet.id, {
        schoolId,
        language: locale.toLowerCase().startsWith("fr") ? "FR" : "EN",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fiche-report-T${sheet.termNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(tReport("pdfError"));
    } finally {
      setActing(null);
    }
  }

  function confirmPending() {
    const action = pending;
    setPending(null);
    if (action === "regenerate") void runGenerate(false);
    else if (action === "blank") void runGenerate(true);
    else if (action === "submit") void runSubmit();
  }

  const yearStatus = year?.status ?? null;
  const yearStatusText =
    yearStatus && tHub.has(`yearStatus.${yearStatus}`) ? tHub(`yearStatus.${yearStatus}`) : yearStatus;

  // ── États sans données ──────────────────────────────────────────────────
  if (!staffProfileId) {
    return (
      <div className="space-y-5 slide-up">
        <PageHeader description={t("description")} />
        <EmptyState
          title={t("noStaffProfileTitle")}
          description={t("noStaffProfileDescription")}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
        />
      </div>
    );
  }

  const canSubmit = sheet && (sheet.status === "DRAFT" || sheet.status === "REJECTED");
  const canRegenerate = sheet ? sheet.status !== "VISA_PRINCIPAL" : true;

  return (
    <div className="space-y-5 slide-up">
      <PageHeader description={t("description")} />

      <HubYearBanner
        label={t("yearLabel")}
        yearLabel={year?.label ?? null}
        yearStatus={yearStatus}
        yearStatusLabel={yearStatusText}
        yearLocked={Boolean(year?.locked)}
        lockedLabel={year?.locked ? tHub("yearLockedBadge") : null}
        loading={loading}
        emptyLabel={t("yearEmpty")}
      />

      {loading ? (
        <HubLoadingRows rows={3} />
      ) : assignments.length === 0 ? (
        <EmptyState
          title={t("emptyAssignmentsTitle")}
          description={t("emptyAssignmentsDescription")}
          icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <section className="space-y-2.5" aria-label={t("assignmentsTitle")}>
            <div>
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                {t("assignmentsTitle")}
              </h2>
              <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                {t("assignmentsHint")}
              </p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {assignments.map((item) => {
                const active = item.classSubjectId === selectedId;
                return (
                  <li key={item.classSubjectId}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(item.classSubjectId)}
                      className={cn(
                        "pressable flex w-full items-start justify-between gap-3 rounded-[var(--radius-lg)] border bg-[var(--ios-card)] p-3.5 text-left shadow-[var(--ios-shadow)] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]",
                        active
                          ? "border-[var(--ios-blue)] bg-[color-mix(in_srgb,var(--ios-blue)_6%,var(--ios-card))]"
                          : "border-[var(--ios-separator)]/55 hover:bg-[var(--ios-fill)]/50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-[var(--ios-label)]">
                          {item.className} · {localizedLabel(item.subjectName, locale)}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--ios-secondary-label)]">
                          {item.subjectCode}
                        </span>
                      </span>
                      <Badge tone={active ? "blue" : "neutral"}>
                        {t("coefficient", { coef: formatCoefficient(item.coefficient, locale) })}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                {t("termLabel")}
              </p>
              <SegmentedControl<string>
                ariaLabel={t("termLabel")}
                value={String(term)}
                onChange={(value) => setTerm(Number(value) as Term)}
                options={TERMS.map((n) => ({ value: String(n), label: t("termOption", { number: n }) }))}
              />
            </div>
            <ul className="flex flex-wrap items-center gap-1.5" aria-label={t("entry.sequenceLabel")}>
              {termSessions
                .slice()
                .sort((a, b) => a.number - b.number)
                .map((s) => (
                  <li key={s.id}>
                    <Badge tone={s.status === "OPEN" ? "success" : s.status === "CLOSED" ? "neutral" : "blue"}>
                      {t("entry.sequenceOption", { number: s.number })} · {t(`entry.sequenceStatus.${s.status}`)}
                    </Badge>
                  </li>
                ))}
            </ul>
          </div>

          <HubToolbar
            tabs={TABS.map((key) => ({ key, label: t(`tabs.${key}`) }))}
            activeTab={tab}
            onTabChange={(key) => setTab(key as TeacherTab)}
            tabsAriaLabel={t("tabsAria")}
            searchValue=""
            onSearchChange={() => undefined}
            searchPlaceholder=""
            hideSearch
          />

          {!assignment ? (
            <EmptyState
              title={t("assignmentsTitle")}
              description={t("selectAssignment")}
              icon={<ClipboardList className="size-9 stroke-[1.5]" aria-hidden />}
            />
          ) : tab === "report" ? (
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  loading={acting === "generate"}
                  disabled={acting !== null || !canRegenerate || sheetsLoading}
                  leadingIcon={
                    sheet ? (
                      <RefreshCw className="size-3.5" aria-hidden />
                    ) : (
                      <FilePlus2 className="size-3.5" aria-hidden />
                    )
                  }
                  onClick={() => (sheet ? setPending("regenerate") : void runGenerate(false))}
                >
                  {sheet ? tReport("regenerate") : tReport("generate")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  loading={acting === "blank"}
                  disabled={acting !== null || !canRegenerate || sheetsLoading}
                  leadingIcon={<FileText className="size-3.5" aria-hidden />}
                  onClick={() => (sheet ? setPending("blank") : void runGenerate(true))}
                >
                  {tReport("generateBlank")}
                </Button>
                {canSubmit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={acting === "submit"}
                    disabled={acting !== null}
                    leadingIcon={<Send className="size-3.5" aria-hidden />}
                    onClick={() => setPending("submit")}
                  >
                    {tReport("submit")}
                  </Button>
                ) : null}
                {sheet ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="sm:ml-auto"
                    loading={acting === "pdf"}
                    disabled={acting !== null}
                    leadingIcon={<Download className="size-3.5" aria-hidden />}
                    onClick={() => void runPdf()}
                  >
                    {tReport("downloadPdf")}
                  </Button>
                ) : null}
              </div>

              {sheet?.status === "REJECTED" ? (
                <Alert
                  tone="danger"
                  title={tReport("rejectedTitle")}
                  description={sheet.rejectionReason?.trim() || tReport("rejectedFallback")}
                />
              ) : null}
              {sheet?.deadlineWarning ? (
                <Alert
                  tone="warning"
                  title={tReport("deadlineTitle")}
                  description={tReport("deadlineDescription", { hours: REPORT_SHEET_DEADLINE_HOURS })}
                />
              ) : null}
              {sheet?.sexCountWarning ? (
                <Alert
                  tone="warning"
                  title={tReport("sexWarningTitle")}
                  description={tReport("sexWarningDescription")}
                />
              ) : null}

              {sheetsLoading && !sheet ? (
                <HubLoadingRows rows={5} />
              ) : sheet ? (
                <ReportSheetPaper sheet={sheet} />
              ) : (
                <EmptyState
                  title={tReport("emptyTitle")}
                  description={tReport("emptyDescription")}
                  icon={<FileText className="size-9 stroke-[1.5]" aria-hidden />}
                />
              )}
            </div>
          ) : (
            <SequenceEntryPanel
              schoolId={schoolId}
              assignment={assignment}
              termSessions={termSessions}
              rosterLines={sheet ? sheet.lines : null}
              rosterLoading={acting === "blank"}
              onLoadRoster={() => void runGenerate(true)}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        tone="default"
        title={
          pending === "submit"
            ? tReport("submitConfirmTitle")
            : pending === "blank"
              ? tReport("blankConfirmTitle")
              : tReport("regenerateConfirmTitle")
        }
        description={
          pending === "submit"
            ? tReport("submitConfirmDescription")
            : pending === "blank"
              ? tReport("blankConfirmDescription")
              : tReport("regenerateConfirmDescription")
        }
        confirmLabel={tReport("confirm")}
        cancelLabel={tCommon("cancel")}
        onConfirm={confirmPending}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ClipboardList, Pencil, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { GradeCorrectionDialog } from "@/components/teacher/grade-correction-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { localizedLabel } from "@/lib/api/academic";
import {
  listSheetGradeCorrections,
  regenerateGradeReportSheet,
  type EvaluationSessionResponse,
  type GradeCorrectionRequestResponse,
  type GradeReportSheetLineDto,
  type GradeReportSheetResponse,
  type ReportSheetSequenceCellDto,
  type ReportSheetStatus,
} from "@/lib/api/grading";
import {
  saveCompMarks,
  sessionForSequenceNumber,
  type CompSaveItem,
} from "@/lib/grading/save-comp-marks";
import {
  formatCoefficient,
  formatMark,
  markCellText,
  markToInput,
  parseMarkInput,
} from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

/** Délai de dépôt affiché sur la fiche papier (72 h) ; la valeur effective vient du barème. */
export const REPORT_SHEET_DEADLINE_HOURS = 72;

/** Pause avant enregistrement auto des Comp. /20 (ms). */
const AUTO_SAVE_MS = 750;

const STATUS_TONE: Record<ReportSheetStatus, "neutral" | "blue" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "blue",
  VISA_SG: "warning",
  VISA_PRINCIPAL: "success",
  REJECTED: "danger",
};

const th =
  "border border-[var(--ios-separator)]/70 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]";
const td =
  "border border-[var(--ios-separator)]/55 px-2 py-2 text-center text-[12px] tabular-nums text-[var(--ios-label)]";

type Props = {
  sheet: GradeReportSheetResponse;
  /** Séquences du trimestre (pour savoir lesquelles sont OPEN et saisissables). */
  termSessions?: EvaluationSessionResponse[];
  schoolId?: string | null;
  /** Après enregistrement Comp./20 + régénération. */
  onSheetUpdated?: (sheet: GradeReportSheetResponse) => void;
  /** Raccourci vers l’onglet saisie complète (bonus / malus). */
  onOpenFullEntry?: () => void;
};

type MetaField = { label: string; value: string; emphasize?: boolean };

type DraftMap = Record<string, string>;
/** Une séquence à la fois par défaut ; « both » = vue papier complète (optionnelle). */
type SeqView = "1" | "2" | "both";
/** Tri d’affichage des lignes (n° d’appel figé inchangé). */
type SortMode = "roll" | "alpha" | "sex" | "merit";

function draftKey(sequenceNumber: number, studentId: string): string {
  return `${sequenceNumber}:${studentId}`;
}

function defaultSeqView(seq1Open: boolean, seq2Open: boolean): SeqView {
  if (seq2Open && !seq1Open) return "2";
  return "1";
}

function cellToDraft(cell: ReportSheetSequenceCellDto): string {
  if (cell.markStatus === "SCORED") return markToInput(cell.mark);
  return "";
}

function meritRank(line: GradeReportSheetLineDto, preferSeq2: boolean): number | null {
  const primary = preferSeq2 ? line.sequence2 : line.sequence1;
  const fallback = preferSeq2 ? line.sequence1 : line.sequence2;
  return primary.rank ?? fallback.rank;
}

function sortReportLines(
  lines: GradeReportSheetLineDto[],
  mode: SortMode,
  locale: string,
  preferSeq2ForMerit: boolean,
): GradeReportSheetLineDto[] {
  const next = [...lines];
  const byName = (a: GradeReportSheetLineDto, b: GradeReportSheetLineDto) =>
    a.studentLabel.localeCompare(b.studentLabel, locale, { sensitivity: "base" });

  switch (mode) {
    case "alpha":
      return next.sort(byName);
    case "sex":
      return next.sort((a, b) => {
        const sa = a.sex ?? "";
        const sb = b.sex ?? "";
        if (sa !== sb) return sa.localeCompare(sb);
        return byName(a, b);
      });
    case "merit":
      return next.sort((a, b) => {
        const ra = meritRank(a, preferSeq2ForMerit);
        const rb = meritRank(b, preferSeq2ForMerit);
        if (ra == null && rb == null) return byName(a, b);
        if (ra == null) return 1;
        if (rb == null) return -1;
        if (ra !== rb) return ra - rb;
        return byName(a, b);
      });
    case "roll":
    default:
      return next.sort(
        (a, b) =>
          (a.rollNumber ?? Number.MAX_SAFE_INTEGER) - (b.rollNumber ?? Number.MAX_SAFE_INTEGER) ||
          byName(a, b),
      );
  }
}

/** Fiche de report de notes : disposition proche de la fiche papier ; Comp./20 saisissable si séquence OPEN. */
export function ReportSheetPaper({
  sheet,
  termSessions = [],
  schoolId,
  onSheetUpdated,
  onOpenFullEntry,
}: Props) {
  const t = useTranslations("teacherGrades.report");
  const tEntry = useTranslations("teacherGrades.entry");
  const tCorrection = useTranslations("teacherGrades.correction");
  const locale = useLocale();

  const canEditSheet = sheet.status === "DRAFT" || sheet.status === "REJECTED";
  const seq1 = sessionForSequenceNumber(termSessions, sheet.sequence1Number ?? 1);
  const seq2 = sessionForSequenceNumber(termSessions, sheet.sequence2Number ?? 2);
  const seq1Editable = canEditSheet && seq1?.status === "OPEN";
  const seq2Editable = canEditSheet && seq2?.status === "OPEN";
  const anyEditable = seq1Editable || seq2Editable;
  const seq1Closed = seq1?.status === "CLOSED";
  const seq2Closed = seq2?.status === "CLOSED";

  const [seqView, setSeqView] = useState<SeqView>(() =>
    defaultSeqView(Boolean(seq1?.status === "OPEN"), Boolean(seq2?.status === "OPEN")),
  );
  const [sortMode, setSortMode] = useState<SortMode>("roll");
  /** Séquence dont le rang sert pour le tri « mérite ». */
  const [meritFocus, setMeritFocus] = useState<1 | 2>(1);
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savePulse, setSavePulse] = useState(false);
  const [pendingByStudent, setPendingByStudent] = useState<Record<string, GradeCorrectionRequestResponse>>(
    {},
  );
  const [correctionTarget, setCorrectionTarget] = useState<{
    sessionId: string;
    studentId: string;
    studentLabel: string;
    currentMarkLabel: string;
  } | null>(null);
  const savingLockRef = useRef(false);
  const resaveRef = useRef(false);
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const showSeq1 = seqView === "1" || seqView === "both";
  const showSeq2 = seqView === "2" || seqView === "both";
  const showCorr1 = showSeq1 && seq1Closed && Boolean(seq1?.id);
  const showCorr2 = showSeq2 && seq2Closed && Boolean(seq2?.id);
  const visibleColCount =
    3 + (showSeq1 ? 5 : 0) + (showCorr1 ? 1 : 0) + (showSeq2 ? 5 : 0) + (showCorr2 ? 1 : 0);

  useEffect(() => {
    let cancelled = false;
    const loadPending = async () => {
      const sessions = [
        showCorr1 && seq1 ? seq1 : null,
        showCorr2 && seq2 ? seq2 : null,
      ].filter(Boolean) as EvaluationSessionResponse[];
      if (sessions.length === 0) {
        setPendingByStudent({});
        return;
      }
      try {
        const rows = (
          await Promise.all(
            sessions.map((session) =>
              listSheetGradeCorrections(session.id, sheet.classSubjectId, schoolId),
            ),
          )
        ).flat();
        if (cancelled) return;
        const map: Record<string, GradeCorrectionRequestResponse> = {};
        for (const row of rows) {
          map[`${row.sessionId}:${row.studentId}`] = row;
        }
        setPendingByStudent(map);
      } catch {
        if (!cancelled) setPendingByStudent({});
      }
    };
    void loadPending();
    return () => {
      cancelled = true;
    };
  }, [schoolId, seq1, seq2, sheet.classSubjectId, showCorr1, showCorr2]);
  const sortedLines = useMemo(
    () => sortReportLines(sheet.lines, sortMode, locale, meritFocus === 2),
    [locale, meritFocus, sheet.lines, sortMode],
  );
  const visibleEditable =
    (showSeq1 && seq1Editable) || (showSeq2 && seq2Editable);
  const visibleClosedSessions = [
    showSeq1 && seq1?.status === "CLOSED"
      ? { number: sheet.sequence1Number ?? 1, session: seq1 }
      : null,
    showSeq2 && seq2?.status === "CLOSED"
      ? { number: sheet.sequence2Number ?? 2, session: seq2 }
      : null,
  ].filter(Boolean) as Array<{ number: number; session: EvaluationSessionResponse }>;

  const sessionStatusTone = (
    status: EvaluationSessionResponse["status"] | undefined,
  ): "success" | "danger" | "blue" | "warning" => {
    if (status === "OPEN") return "success";
    if (status === "CLOSED") return "danger";
    if (status === "PLANNED") return "blue";
    return "warning";
  };

  const sessionStatusLabel = (status: EvaluationSessionResponse["status"] | undefined) => {
    if (!status) return t("sessionStatus.UNKNOWN");
    return t(`sessionStatus.${status}`);
  };

  useEffect(() => {
    setSeqView(defaultSeqView(seq1Editable, seq2Editable));
  }, [sheet.id, seq1Editable, seq2Editable]);

  // Conserve les saisies locales encore plus récentes que la fiche (course avec l’auto-save).
  useEffect(() => {
    setDrafts((prev) => {
      const next: DraftMap = {};
      for (const line of sheet.lines) {
        const n1 = sheet.sequence1Number ?? 1;
        const n2 = sheet.sequence2Number ?? 2;
        for (const [seq, cell] of [
          [n1, line.sequence1],
          [n2, line.sequence2],
        ] as const) {
          const key = draftKey(seq, line.studentId);
          const fromSheet = cellToDraft(cell);
          const local = prev[key];
          next[key] =
            local !== undefined && local.trim() !== fromSheet.trim() ? local : fromSheet;
        }
      }
      return next;
    });
  }, [sheet]);

  const dirtyKeys = useMemo(() => {
    const dirty: string[] = [];
    for (const line of sheet.lines) {
      for (const [seq, cell, editable] of [
        [sheet.sequence1Number ?? 1, line.sequence1, seq1Editable],
        [sheet.sequence2Number ?? 2, line.sequence2, seq2Editable],
      ] as const) {
        if (!editable) continue;
        const key = draftKey(seq, line.studentId);
        const original = cellToDraft(cell);
        if ((drafts[key] ?? "").trim() !== original.trim()) dirty.push(key);
      }
    }
    return dirty;
  }, [drafts, seq1Editable, seq2Editable, sheet]);

  const dirtyKeysRef = useRef(dirtyKeys);
  dirtyKeysRef.current = dirtyKeys;

  const formatDate = (value: string | null | undefined): string => {
    if (!value) return t("header.unknownDate");
    const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };
  const formatInstant = (value: string): string => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  };

  const shortLabels = { absent: t("table.absentShort"), exempted: t("table.exemptedShort") };
  const coefficient = formatCoefficient(sheet.coefficient, locale);
  const subjectName = localizedLabel(sheet.subjectLabel, locale);
  const classLabel = sheet.classLabel?.trim() || "—";

  const primaryFields: MetaField[] = [
    { label: t("header.teacher"), value: sheet.teacherLabel?.trim() || "—", emphasize: true },
    { label: t("header.subject"), value: subjectName, emphasize: true },
    { label: t("header.coefficient"), value: coefficient },
    { label: t("header.term"), value: `T${sheet.termNumber}` },
  ];

  const examDateCards = [
    ...(showSeq1
      ? [
          {
            number: sheet.sequence1Number ?? 1,
            value: formatDate(sheet.sequence1ExamDate),
            missing: !sheet.sequence1ExamDate,
          },
        ]
      : []),
    ...(showSeq2
      ? [
          {
            number: sheet.sequence2Number ?? 2,
            value: formatDate(sheet.sequence2ExamDate),
            missing: !sheet.sequence2ExamDate,
          },
        ]
      : []),
  ];

  function updateDraft(sequenceNumber: number, studentId: string, value: string) {
    const key = draftKey(sequenceNumber, studentId);
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
    setSavePulse(false);
  }

  const flushCompSave = useCallback(
    async (options?: { announceInvalid?: boolean }) => {
      if (!anyEditable) return;
      if (savingLockRef.current) {
        resaveRef.current = true;
        return;
      }

      const currentDrafts = draftsRef.current;
      const keys = dirtyKeysRef.current;
      if (keys.length === 0) return;

      const items: CompSaveItem[] = [];
      const nextErrors: Record<string, boolean> = {};

      for (const key of keys) {
        const [seqRaw, studentId] = key.split(":");
        const sequenceNumber = Number(seqRaw);
        const session =
          sequenceNumber === (sheet.sequence1Number ?? 1)
            ? seq1
            : sequenceNumber === (sheet.sequence2Number ?? 2)
              ? seq2
              : null;
        if (!session || session.status !== "OPEN") continue;
        const raw = currentDrafts[key] ?? "";
        const parsed = parseMarkInput(raw, 20);
        if (!parsed.ok) {
          nextErrors[key] = true;
          continue;
        }
        items.push({ sessionId: session.id, studentId, raw });
      }

      if (Object.keys(nextErrors).length > 0) {
        setErrors((prev) => ({ ...prev, ...nextErrors }));
        if (options?.announceInvalid) notify.error(tEntry("invalidValue"));
        return;
      }
      if (items.length === 0) return;

      savingLockRef.current = true;
      setSaving(true);
      try {
        await saveCompMarks({
          classSubjectId: sheet.classSubjectId,
          schoolId,
          items,
          columnTitle: tEntry("columnTitle"),
        });
        const refreshed = await regenerateGradeReportSheet(sheet.id, { blank: false, schoolId });
        onSheetUpdated?.(refreshed);
        setSavePulse(true);
      } catch (error) {
        if (isAuthFailure(error)) return;
        if (error instanceof ApiError) notify.error(error.message);
        else if (error instanceof Error && error.message.startsWith("GRADE_SHEET_MISSING")) {
          notify.error(t("compSaveNoSheet"));
        } else if (error instanceof Error && error.message === "SHEET_LOCKED") {
          notify.error(tEntry("closedDescription"));
        } else {
          notify.error(t("compSaveError"));
        }
      } finally {
        savingLockRef.current = false;
        setSaving(false);
        if (resaveRef.current) {
          resaveRef.current = false;
          void flushCompSave();
        }
      }
    },
    [
      anyEditable,
      onSheetUpdated,
      schoolId,
      seq1,
      seq2,
      sheet.classSubjectId,
      sheet.id,
      sheet.sequence1Number,
      sheet.sequence2Number,
      t,
      tEntry,
    ],
  );

  useEffect(() => {
    if (!visibleEditable || dirtyKeys.length === 0) return;
    const timer = window.setTimeout(() => {
      void flushCompSave();
    }, AUTO_SAVE_MS);
    return () => window.clearTimeout(timer);
  }, [dirtyKeys, flushCompSave, visibleEditable]);

  const autoSaveLabel = saving
    ? t("compSaving")
    : dirtyKeys.length > 0
      ? t("compSavePending")
      : savePulse
        ? t("compSaveAutoDone")
        : t("compSaveAutoHint");

  const renderCompCell = (
    cell: ReportSheetSequenceCellDto,
    sequenceNumber: number,
    studentId: string,
    studentLabel: string,
    editable: boolean,
  ) => {
    const key = draftKey(sequenceNumber, studentId);
    if (editable) {
      return (
        <td
          key={`comp-${sequenceNumber}-${studentId}`}
          className={cn(td, "bg-[color-mix(in_srgb,var(--ios-blue)_6%,transparent)] p-1")}
        >
          <Input
            inputMode="decimal"
            autoComplete="off"
            aria-label={`${t("table.comp")} — ${studentLabel}`}
            className="mx-auto h-8 w-[4.5rem] px-1.5 text-center text-[12px] tabular-nums"
            placeholder="—"
            value={drafts[key] ?? ""}
            invalid={errors[key]}
            onChange={(event) => updateDraft(sequenceNumber, studentId, event.target.value)}
            onBlur={() => {
              if (!dirtyKeysRef.current.includes(key)) return;
              void flushCompSave({ announceInvalid: true });
            }}
          />
        </td>
      );
    }
    return (
      <td
        key={`comp-${sequenceNumber}-${studentId}`}
        className={cn(td, "bg-[color-mix(in_srgb,var(--ios-blue)_5%,transparent)] font-semibold")}
        title={t("table.compHint")}
      >
        {markCellText(cell.mark, cell.markStatus, locale, shortLabels)}
      </td>
    );
  };

  const renderAutoCells = (cell: ReportSheetSequenceCellDto, keyPrefix: string) => {
    const scored = cell.markStatus === "SCORED";
    const autoTd = cn(
      td,
      "bg-[color-mix(in_srgb,var(--ios-fill)_10%,transparent)] font-semibold text-[var(--ios-label)]",
    );
    return (
      <>
        <td key={`${keyPrefix}-coef`} className={autoTd} title={t("table.autoHint")}>
          {scored ? formatCoefficient(cell.coefficient, locale) : ""}
        </td>
        <td key={`${keyPrefix}-weighted`} className={autoTd} title={t("table.autoHint")}>
          {scored ? formatMark(cell.weightedMark, locale) : ""}
        </td>
        <td key={`${keyPrefix}-rank`} className={autoTd} title={t("table.autoHint")}>
          {scored && cell.rank ? cell.rank : ""}
        </td>
        <td key={`${keyPrefix}-app`} className={autoTd} title={t("table.autoHint")}>
          {scored ? (cell.displayedAppreciation ?? cell.appreciation ?? "") : ""}
        </td>
      </>
    );
  };

  const visaBoxes: Array<{ label: string; value: string; done: boolean }> = [
    {
      label: t("footer.teacherVisa"),
      value: sheet.submittedAt
        ? t("footer.submittedOn", { date: formatInstant(sheet.submittedAt) })
        : t("footer.pending"),
      done: Boolean(sheet.submittedAt),
    },
    {
      label: t("footer.supervisorVisa"),
      value: sheet.visaSupervisor
        ? t("footer.signedOn", { date: formatInstant(sheet.visaSupervisor.at) })
        : t("footer.pending"),
      done: Boolean(sheet.visaSupervisor),
    },
    {
      label: t("footer.principalVisa"),
      value: sheet.visaPrincipal
        ? t("footer.signedOn", { date: formatInstant(sheet.visaPrincipal.at) })
        : t("footer.pending"),
      done: Boolean(sheet.visaPrincipal),
    },
  ];

  const autoHead = cn(
    th,
    "bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] font-bold text-[var(--ios-label)]",
  );
  const compHead = cn(
    th,
    "bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]",
  );

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/50 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
      <header className="border-b border-[var(--ios-separator)]/50">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-card))] text-[var(--ios-blue)]">
              <ClipboardList className="size-5 stroke-[1.75]" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--ios-secondary-label)]">
                {t("header.term")} {sheet.termNumber}
              </p>
              <h2 className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]">
                {t("title")}
              </h2>
              <p className="mt-1 truncate text-[12px] text-[var(--ios-secondary-label)]">
                {subjectName}
                {coefficient ? ` · ${t("header.coefficient")} ${coefficient}` : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex h-9 items-center rounded-[var(--radius-md)] border border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_55%,var(--ios-card))] px-3 text-[14px] font-semibold tabular-nums text-[var(--ios-label)]"
              aria-label={`${t("header.class")} ${classLabel}`}
            >
              {classLabel}
            </div>
            <Badge
              tone={STATUS_TONE[sheet.status]}
              className="h-9 rounded-[var(--radius-md)] px-3 text-[14px] tracking-normal"
            >
              {t(`status.${sheet.status}`)}
            </Badge>
          </div>
        </div>
      </header>

      <div className="space-y-0 border-b border-[var(--ios-separator)]/50 px-5 py-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {primaryFields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {field.label}
              </dt>
              <dd
                className={cn(
                  "mt-1 truncate text-[13px] text-[var(--ios-label)]",
                  field.emphasize ? "font-semibold" : "font-medium",
                )}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3.5 flex flex-wrap gap-2.5 border-t border-dashed border-[var(--ios-separator)]/55 pt-3.5">
          <div className="flex min-w-[220px] flex-1 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-3.5 py-2.5">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--ios-blue)_12%,var(--ios-card))] text-[var(--ios-blue)]"
              aria-hidden
            >
              <Users className="size-4 stroke-[1.75]" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {t("header.headcount")}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--ios-card)] px-2 py-0.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ios-secondary-label)]">
                    {t("header.boys")}
                  </span>
                  <span className="font-semibold">{sheet.boysCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--ios-card)] px-2 py-0.5 text-[12px] tabular-nums text-[var(--ios-label)]">
                  <span className="text-[10px] font-semibold uppercase text-[var(--ios-secondary-label)]">
                    {t("header.girls")}
                  </span>
                  <span className="font-semibold">{sheet.girlsCount}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-[var(--ios-blue)]">
                  <span className="text-[10px] font-semibold uppercase opacity-80">
                    {t("header.total")}
                  </span>
                  {sheet.headcount}
                </span>
              </div>
            </div>
          </div>

          {examDateCards.map((card) => (
            <div
              key={card.number}
              className="flex min-w-[160px] flex-1 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_35%,var(--ios-card))] px-3.5 py-2.5"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--ios-fill)_70%,var(--ios-card))] text-[var(--ios-secondary-label)]"
                aria-hidden
              >
                <CalendarDays className="size-4 stroke-[1.75]" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                  {t("header.examDate", { number: card.number })}
                </p>
                <p
                  className={cn(
                    "mt-1 truncate text-[13px] font-semibold tabular-nums",
                    card.missing
                      ? "text-[var(--ios-tertiary-label)]"
                      : "text-[var(--ios-label)]",
                  )}
                >
                  {card.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 border-b border-[var(--ios-separator)]/50 px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                {t("sequenceViewLabel")}
              </p>
              <SegmentedControl<SeqView>
                ariaLabel={t("sequenceViewLabel")}
                value={seqView}
                onChange={setSeqView}
                options={[
                  {
                    value: "1",
                    label: [
                      t("table.sequence", { number: sheet.sequence1Number ?? 1 }),
                      seq1?.status === "CLOSED" ? sessionStatusLabel("CLOSED") : null,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  {
                    value: "2",
                    label: [
                      t("table.sequence", { number: sheet.sequence2Number ?? 2 }),
                      seq2?.status === "CLOSED" ? sessionStatusLabel("CLOSED") : null,
                    ]
                      .filter(Boolean)
                      .join(" · "),
                  },
                  { value: "both", label: t("sequenceViewBoth") },
                ]}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                {t("sortLabel")}
              </p>
              <SegmentedControl<SortMode>
                ariaLabel={t("sortLabel")}
                value={sortMode}
                onChange={(mode) => {
                  setSortMode(mode);
                  if (mode === "merit") setMeritFocus(seqView === "2" ? 2 : 1);
                }}
                options={[
                  { value: "roll", label: t("sort.roll") },
                  { value: "alpha", label: t("sort.alpha") },
                  { value: "sex", label: t("sort.sex") },
                  { value: "merit", label: t("sort.merit") },
                ]}
              />
            </div>
          </div>
          <ul className="flex flex-wrap items-center gap-1.5" aria-label={t("sessionStatusList")}>
            {[
              {
                number: sheet.sequence1Number ?? 1,
                status: seq1?.status,
              },
              {
                number: sheet.sequence2Number ?? 2,
                status: seq2?.status,
              },
            ].map((row) => (
              <li key={row.number}>
                <Badge tone={sessionStatusTone(row.status)}>
                  {t("sessionStatusBadge", {
                    number: row.number,
                    status: sessionStatusLabel(row.status),
                  })}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        {visibleClosedSessions.length > 0 ? (
          <Alert
            tone="warning"
            title={
              visibleClosedSessions.length === 1
                ? t("sessionClosedTitle", { number: visibleClosedSessions[0]!.number })
                : t("sessionsClosedTitle")
            }
            description={t("sessionClosedDescription")}
          />
        ) : null}

        {visibleEditable ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span
              className={cn(
                "text-[11px] font-medium",
                saving
                  ? "text-[var(--ios-blue)]"
                  : dirtyKeys.length > 0
                    ? "text-[var(--ios-warning)]"
                    : savePulse
                      ? "text-[var(--ios-success)]"
                      : "text-[var(--ios-secondary-label)]",
              )}
              aria-live="polite"
            >
              {autoSaveLabel}
            </span>
            {onOpenFullEntry ? (
              <Button type="button" size="sm" variant="ghost" onClick={onOpenFullEntry}>
                {t("openFullEntry")}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table
          className={cn(
            "w-full border-collapse",
            seqView === "both" ? "min-w-[980px]" : "min-w-[640px]",
          )}
        >
          <thead>
            <tr className="bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))]">
              <th
                rowSpan={2}
                scope="col"
                aria-sort={sortMode === "roll" ? "ascending" : "none"}
                title={t("sort.rollHint")}
                className={cn(
                  th,
                  "w-12 cursor-pointer select-none bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))] font-bold",
                  sortMode === "roll" ? "text-[var(--ios-blue)]" : "text-[var(--ios-label)]",
                )}
                onClick={() => setSortMode("roll")}
              >
                {t("table.number")}
              </th>
              <th
                rowSpan={2}
                scope="col"
                aria-sort={sortMode === "alpha" ? "ascending" : "none"}
                title={t("sort.alphaHint")}
                className={cn(
                  th,
                  "min-w-[220px] cursor-pointer select-none bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))] text-left font-bold",
                  sortMode === "alpha" ? "text-[var(--ios-blue)]" : "text-[var(--ios-label)]",
                )}
                onClick={() => setSortMode("alpha")}
              >
                {t("table.names")}
              </th>
              <th
                rowSpan={2}
                scope="col"
                aria-sort={sortMode === "sex" ? "ascending" : "none"}
                title={t("sort.sexHint")}
                className={cn(
                  th,
                  "w-14 cursor-pointer select-none bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))] font-bold",
                  sortMode === "sex" ? "text-[var(--ios-blue)]" : "text-[var(--ios-label)]",
                )}
                onClick={() => setSortMode("sex")}
              >
                {t("table.sex")}
              </th>
              {showSeq1 ? (
                <th
                  colSpan={showCorr1 ? 6 : 5}
                  className={cn(th, "bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]")}
                >
                  {t("table.sequence", { number: sheet.sequence1Number ?? 1 })}
                  {seq1Editable
                    ? ` · ${t("table.editable")}`
                    : seq1?.status === "CLOSED"
                      ? ` · ${t("sessionStatus.CLOSED")}`
                      : seq1?.status === "PLANNED"
                        ? ` · ${t("sessionStatus.PLANNED")}`
                        : ""}
                </th>
              ) : null}
              {showSeq2 ? (
                <th
                  colSpan={showCorr2 ? 6 : 5}
                  className={cn(
                    th,
                    showSeq1
                      ? "bg-[color-mix(in_srgb,var(--ios-fill)_62%,var(--ios-card))] text-[var(--ios-label)]"
                      : "bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] text-[var(--ios-blue)]",
                  )}
                >
                  {t("table.sequence", { number: sheet.sequence2Number ?? 2 })}
                  {seq2Editable
                    ? ` · ${t("table.editable")}`
                    : seq2?.status === "CLOSED"
                      ? ` · ${t("sessionStatus.CLOSED")}`
                      : seq2?.status === "PLANNED"
                        ? ` · ${t("sessionStatus.PLANNED")}`
                        : ""}
                </th>
              ) : null}
            </tr>
            <tr className="bg-[color-mix(in_srgb,var(--ios-fill)_32%,var(--ios-card))]">
              {(showSeq1 ? [1] : []).concat(showSeq2 ? [2] : []).flatMap((seq) => {
                const showCorr = seq === 1 ? showCorr1 : showCorr2;
                return [
                  <th key={`${seq}-comp`} className={compHead} title={t("table.compHint")}>
                    {t("table.comp")}
                  </th>,
                  <th key={`${seq}-coef`} className={autoHead} title={t("table.autoHint")}>
                    {t("table.coefficient")}
                  </th>,
                  <th key={`${seq}-weighted`} className={autoHead} title={t("table.autoHint")}>
                    {t("table.weighted")}
                  </th>,
                  <th
                    key={`${seq}-rank`}
                    scope="col"
                    aria-sort={sortMode === "merit" ? "ascending" : "none"}
                    title={t("sort.meritHint")}
                    className={cn(
                      autoHead,
                      "cursor-pointer select-none",
                      sortMode === "merit" && "text-[var(--ios-blue)]",
                    )}
                    onClick={() => {
                      setMeritFocus(seq === 2 ? 2 : 1);
                      setSortMode("merit");
                    }}
                  >
                    {t("table.rank")}
                  </th>,
                  <th key={`${seq}-app`} className={autoHead} title={t("table.autoHint")}>
                    {t("table.appreciation")}
                  </th>,
                  ...(showCorr
                    ? [
                        <th
                          key={`${seq}-corr`}
                          className={cn(autoHead, "w-12 text-[var(--ios-warning)]")}
                          title={tCorrection("columnHint")}
                        >
                          {tCorrection("column")}
                        </th>,
                      ]
                    : []),
                ];
              })}
            </tr>
          </thead>
          <tbody>
            {sortedLines.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColCount}
                  className="px-4 py-10 text-center text-[12px] text-[var(--ios-secondary-label)]"
                >
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              sortedLines.map((line, index) => (
                <tr
                  key={line.studentId}
                  className={cn(
                    "transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_4%,transparent)]",
                    index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_16%,transparent)]",
                  )}
                >
                  <td className={cn(td, "font-semibold text-[var(--ios-label)]")}>
                    {line.rollNumber ?? index + 1}
                  </td>
                  <td className={cn(td, "text-left font-semibold text-[var(--ios-label)]")}>
                    {line.studentLabel}
                  </td>
                  <td className={cn(td, "font-semibold text-[var(--ios-label)]")}>
                    {line.sex ? t(`sexShort.${line.sex}`) : ""}
                  </td>
                  {showSeq1 ? (
                    <>
                      {renderCompCell(
                        line.sequence1,
                        sheet.sequence1Number ?? 1,
                        line.studentId,
                        line.studentLabel,
                        seq1Editable,
                      )}
                      {renderAutoCells(line.sequence1, "s1")}
                      {showCorr1 && seq1 ? (
                        <td className={cn(td, "p-1")}>
                          {pendingByStudent[`${seq1.id}:${line.studentId}`] ? (
                            <Badge tone="warning">{tCorrection("pendingShort")}</Badge>
                          ) : (
                            <button
                              type="button"
                              className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-warning)] hover:bg-[var(--ios-warning-soft)]"
                              aria-label={tCorrection("openFor", { name: line.studentLabel })}
                              title={tCorrection("columnHint")}
                              onClick={() =>
                                setCorrectionTarget({
                                  sessionId: seq1.id,
                                  studentId: line.studentId,
                                  studentLabel: line.studentLabel,
                                  currentMarkLabel: markCellText(
                                    line.sequence1.mark,
                                    line.sequence1.markStatus,
                                    locale,
                                    shortLabels,
                                  ),
                                })
                              }
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </button>
                          )}
                        </td>
                      ) : null}
                    </>
                  ) : null}
                  {showSeq2 ? (
                    <>
                      {renderCompCell(
                        line.sequence2,
                        sheet.sequence2Number ?? 2,
                        line.studentId,
                        line.studentLabel,
                        seq2Editable,
                      )}
                      {renderAutoCells(line.sequence2, "s2")}
                      {showCorr2 && seq2 ? (
                        <td className={cn(td, "p-1")}>
                          {pendingByStudent[`${seq2.id}:${line.studentId}`] ? (
                            <Badge tone="warning">{tCorrection("pendingShort")}</Badge>
                          ) : (
                            <button
                              type="button"
                              className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-warning)] hover:bg-[var(--ios-warning-soft)]"
                              aria-label={tCorrection("openFor", { name: line.studentLabel })}
                              title={tCorrection("columnHint")}
                              onClick={() =>
                                setCorrectionTarget({
                                  sessionId: seq2.id,
                                  studentId: line.studentId,
                                  studentLabel: line.studentLabel,
                                  currentMarkLabel: markCellText(
                                    line.sequence2.mark,
                                    line.sequence2.markStatus,
                                    locale,
                                    shortLabels,
                                  ),
                                })
                              }
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </button>
                          )}
                        </td>
                      ) : null}
                    </>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {correctionTarget ? (
        <GradeCorrectionDialog
          open
          onOpenChange={(open) => {
            if (!open) setCorrectionTarget(null);
          }}
          schoolId={schoolId}
          sessionId={correctionTarget.sessionId}
          classSubjectId={sheet.classSubjectId}
          studentId={correctionTarget.studentId}
          studentLabel={correctionTarget.studentLabel}
          currentMarkLabel={correctionTarget.currentMarkLabel}
          onCreated={(row) =>
            setPendingByStudent((prev) => ({
              ...prev,
              [`${row.sessionId}:${row.studentId}`]: row,
            }))
          }
        />
      ) : null}

      <footer className="border-t border-[var(--ios-separator)]/50 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-4">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {visaBoxes.map((box) => (
            <div
              key={box.label}
              className={cn(
                "min-h-[76px] rounded-[var(--radius-md)] border px-3.5 py-2.5",
                box.done
                  ? "border-[color-mix(in_srgb,var(--ios-blue)_28%,var(--ios-separator))] bg-[color-mix(in_srgb,var(--ios-blue)_5%,var(--ios-card))]"
                  : "border-dashed border-[var(--ios-separator)] bg-[var(--ios-card)]",
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {box.label}
              </p>
              <div className="mt-3 border-b border-[var(--ios-separator)]/70 pb-1.5">
                <p
                  className={cn(
                    "text-[12px]",
                    box.done ? "font-medium text-[var(--ios-label)]" : "text-[var(--ios-tertiary-label)]",
                  )}
                >
                  {box.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </footer>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { localizedLabel } from "@/lib/api/academic";
import {
  regenerateGradeReportSheet,
  type EvaluationSessionResponse,
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
  const locale = useLocale();

  const canEditSheet = sheet.status === "DRAFT" || sheet.status === "REJECTED";
  const seq1 = sessionForSequenceNumber(termSessions, sheet.sequence1Number ?? 1);
  const seq2 = sessionForSequenceNumber(termSessions, sheet.sequence2Number ?? 2);
  const seq1Editable = canEditSheet && seq1?.status === "OPEN";
  const seq2Editable = canEditSheet && seq2?.status === "OPEN";
  const anyEditable = seq1Editable || seq2Editable;

  const [seqView, setSeqView] = useState<SeqView>(() =>
    defaultSeqView(Boolean(seq1?.status === "OPEN"), Boolean(seq2?.status === "OPEN")),
  );
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const showSeq1 = seqView === "1" || seqView === "both";
  const showSeq2 = seqView === "2" || seqView === "both";
  const visibleColCount = 3 + (showSeq1 ? 5 : 0) + (showSeq2 ? 5 : 0);
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

  useEffect(() => {
    const next: DraftMap = {};
    for (const line of sheet.lines) {
      const n1 = sheet.sequence1Number ?? 1;
      const n2 = sheet.sequence2Number ?? 2;
      next[draftKey(n1, line.studentId)] = cellToDraft(line.sequence1);
      next[draftKey(n2, line.studentId)] = cellToDraft(line.sequence2);
    }
    setDrafts(next);
    setErrors({});
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

  const secondaryFields: MetaField[] = [
    {
      label: t("header.headcount"),
      value: `${t("header.boys")} ${sheet.boysCount} · ${t("header.girls")} ${sheet.girlsCount} · ${t("header.total")} ${sheet.headcount}`,
    },
    ...(showSeq1
      ? [
          {
            label: t("header.examDate", { number: sheet.sequence1Number ?? 1 }),
            value: formatDate(sheet.sequence1ExamDate),
          },
        ]
      : []),
    ...(showSeq2
      ? [
          {
            label: t("header.examDate", { number: sheet.sequence2Number ?? 2 }),
            value: formatDate(sheet.sequence2ExamDate),
          },
        ]
      : []),
  ];

  function updateDraft(sequenceNumber: number, studentId: string, value: string) {
    const key = draftKey(sequenceNumber, studentId);
    setDrafts((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  }

  async function onSaveComp() {
    if (!anyEditable || saving || dirtyKeys.length === 0) return;

    const items: CompSaveItem[] = [];
    const nextErrors: Record<string, boolean> = {};

    for (const key of dirtyKeys) {
      const [seqRaw, studentId] = key.split(":");
      const sequenceNumber = Number(seqRaw);
      const session =
        sequenceNumber === (sheet.sequence1Number ?? 1)
          ? seq1
          : sequenceNumber === (sheet.sequence2Number ?? 2)
            ? seq2
            : null;
      if (!session || session.status !== "OPEN") continue;
      const raw = drafts[key] ?? "";
      const parsed = parseMarkInput(raw, 20);
      if (!parsed.ok) {
        nextErrors[key] = true;
        continue;
      }
      items.push({ sessionId: session.id, studentId, raw });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notify.error(tEntry("invalidValue"));
      return;
    }

    setSaving(true);
    try {
      const result = await saveCompMarks({
        classSubjectId: sheet.classSubjectId,
        schoolId,
        items,
        columnTitle: tEntry("columnTitle"),
      });
      const refreshed = await regenerateGradeReportSheet(sheet.id, { blank: false, schoolId });
      onSheetUpdated?.(refreshed);
      notify.success(t("compSaveSuccess", { count: result.saved }));
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
      setSaving(false);
    }
  }

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
            disabled={saving}
            onChange={(event) => updateDraft(sequenceNumber, studentId, event.target.value)}
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
      "bg-[color-mix(in_srgb,var(--ios-fill)_10%,transparent)] text-[var(--ios-secondary-label)]",
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
        <td key={`${keyPrefix}-app`} className={cn(autoTd, "font-medium")} title={t("table.autoHint")}>
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
    "bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] font-medium text-[var(--ios-tertiary-label)]",
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
            <div className="rounded-[var(--radius-md)] border border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_55%,var(--ios-card))] px-3 py-2 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[var(--ios-secondary-label)]">
                {t("header.class")}
              </p>
              <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--ios-label)]">
                {classLabel}
              </p>
            </div>
            <Badge tone={STATUS_TONE[sheet.status]}>{t(`status.${sheet.status}`)}</Badge>
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
        <dl className="mt-3.5 grid grid-cols-1 gap-3 border-t border-dashed border-[var(--ios-separator)]/55 pt-3.5 sm:grid-cols-3">
          {secondaryFields.map((field) => (
            <div key={field.label} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-tertiary-label)]">
                {field.label}
              </dt>
              <dd className="mt-1 truncate text-[12px] font-medium text-[var(--ios-label)]">
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2.5 border-b border-[var(--ios-separator)]/50 px-5 py-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] bg-[color-mix(in_srgb,var(--ios-blue)_5%,var(--ios-card))] px-3 py-2">
            <p className="text-[12px] text-[var(--ios-label)]">{t("compEditHint")}</p>
            <div className="flex flex-wrap items-center gap-2">
              {onOpenFullEntry ? (
                <Button type="button" size="sm" variant="ghost" onClick={onOpenFullEntry}>
                  {t("openFullEntry")}
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                loading={saving}
                disabled={dirtyKeys.length === 0 || saving}
                leadingIcon={<Save className="size-3.5" aria-hidden />}
                onClick={() => void onSaveComp()}
              >
                {saving ? t("compSaving") : t("compSave")}
              </Button>
            </div>
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
              <th rowSpan={2} className={cn(th, "w-12 bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))]")}>
                {t("table.number")}
              </th>
              <th
                rowSpan={2}
                className={cn(th, "min-w-[220px] bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))] text-left")}
              >
                {t("table.names")}
              </th>
              <th rowSpan={2} className={cn(th, "w-14 bg-[color-mix(in_srgb,var(--ios-fill)_48%,var(--ios-card))]")}>
                {t("table.sex")}
              </th>
              {showSeq1 ? (
                <th
                  colSpan={5}
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
                  colSpan={5}
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
              {(showSeq1 ? [1] : []).concat(showSeq2 ? [2] : []).flatMap((seq) => [
                <th key={`${seq}-comp`} className={compHead} title={t("table.compHint")}>
                  {t("table.comp")}
                </th>,
                <th key={`${seq}-coef`} className={autoHead} title={t("table.autoHint")}>
                  {t("table.coefficient")}
                </th>,
                <th key={`${seq}-weighted`} className={autoHead} title={t("table.autoHint")}>
                  {t("table.weighted")}
                </th>,
                <th key={`${seq}-rank`} className={autoHead} title={t("table.autoHint")}>
                  {t("table.rank")}
                </th>,
                <th key={`${seq}-app`} className={autoHead} title={t("table.autoHint")}>
                  {t("table.appreciation")}
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {sheet.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColCount}
                  className="px-4 py-10 text-center text-[12px] text-[var(--ios-secondary-label)]"
                >
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              sheet.lines.map((line, index) => (
                <tr
                  key={line.studentId}
                  className={cn(
                    "transition-colors hover:bg-[color-mix(in_srgb,var(--ios-blue)_4%,transparent)]",
                    index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_16%,transparent)]",
                  )}
                >
                  <td className={cn(td, "text-[var(--ios-secondary-label)]")}>
                    {line.rollNumber ?? index + 1}
                  </td>
                  <td className={cn(td, "text-left font-medium")}>{line.studentLabel}</td>
                  <td className={cn(td, "text-[var(--ios-secondary-label)]")}>
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
                    </>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="border-t border-[var(--ios-separator)]/45 px-5 py-2.5 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
          {t("table.columnsLegend")}
        </p>
      </div>

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
        <p className="mt-3.5 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
          {t("footer.deadlineNotice", { hours: REPORT_SHEET_DEADLINE_HOURS })}
        </p>
      </footer>
    </section>
  );
}

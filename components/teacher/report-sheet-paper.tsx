"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { localizedLabel } from "@/lib/api/academic";
import type {
  GradeReportSheetResponse,
  ReportSheetSequenceCellDto,
  ReportSheetStatus,
} from "@/lib/api/grading";
import { formatCoefficient, formatMark, markCellText } from "@/lib/grading/marks";
import { cn } from "@/lib/utils/cn";

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
  "border border-[var(--ios-separator)] px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-secondary-label)]";
const td =
  "border border-[var(--ios-separator)]/80 px-2 py-1.5 text-center text-[12px] tabular-nums text-[var(--ios-label)]";

type Props = {
  sheet: GradeReportSheetResponse;
};

/** Fiche de report de notes : même disposition que la fiche papier (en-tête, tableau 2 séquences, visas). */
export function ReportSheetPaper({ sheet }: Props) {
  const t = useTranslations("teacherGrades.report");
  const locale = useLocale();

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

  const fields: Array<{ label: string; value: string }> = [
    { label: t("header.teacher"), value: sheet.teacherLabel?.trim() || "—" },
    { label: t("header.subject"), value: localizedLabel(sheet.subjectLabel, locale) },
    { label: t("header.coefficient"), value: coefficient },
    { label: t("header.term"), value: `T${sheet.termNumber}` },
    { label: t("header.class"), value: sheet.classLabel?.trim() || "—" },
    {
      label: t("header.headcount"),
      value: `${t("header.boys")} ${sheet.boysCount} · ${t("header.girls")} ${sheet.girlsCount} · ${t("header.total")} ${sheet.headcount}`,
    },
    {
      label: t("header.examDate", { number: sheet.sequence1Number ?? 1 }),
      value: formatDate(sheet.sequence1ExamDate),
    },
    {
      label: t("header.examDate", { number: sheet.sequence2Number ?? 2 }),
      value: formatDate(sheet.sequence2ExamDate),
    },
  ];

  const renderCells = (cell: ReportSheetSequenceCellDto, keyPrefix: string) => {
    const scored = cell.markStatus === "SCORED";
    return (
      <>
        <td key={`${keyPrefix}-mark`} className={cn(td, "font-semibold")}>
          {markCellText(cell.mark, cell.markStatus, locale, shortLabels)}
        </td>
        <td key={`${keyPrefix}-coef`} className={td}>
          {scored ? formatCoefficient(cell.coefficient, locale) : ""}
        </td>
        <td key={`${keyPrefix}-weighted`} className={td}>
          {scored ? formatMark(cell.weightedMark, locale) : ""}
        </td>
        <td key={`${keyPrefix}-rank`} className={td}>
          {scored && cell.rank ? cell.rank : ""}
        </td>
        <td key={`${keyPrefix}-app`} className={cn(td, "font-semibold")}>
          {scored ? (cell.displayedAppreciation ?? cell.appreciation ?? "") : ""}
        </td>
      </>
    );
  };

  const visaBoxes: Array<{ label: string; value: string }> = [
    {
      label: t("footer.teacherVisa"),
      value: sheet.submittedAt
        ? t("footer.submittedOn", { date: formatInstant(sheet.submittedAt) })
        : t("footer.pending"),
    },
    {
      label: t("footer.supervisorVisa"),
      value: sheet.visaSupervisor
        ? t("footer.signedOn", { date: formatInstant(sheet.visaSupervisor.at) })
        : t("footer.pending"),
    },
    {
      label: t("footer.principalVisa"),
      value: sheet.visaPrincipal
        ? t("footer.signedOn", { date: formatInstant(sheet.visaPrincipal.at) })
        : t("footer.pending"),
    },
  ];

  return (
    <section className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ios-separator)]/55 px-4 py-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[var(--ios-label)]">
          {t("title")}
        </h2>
        <Badge tone={STATUS_TONE[sheet.status]}>{t(`status.${sheet.status}`)}</Badge>
      </header>

      <dl className="grid grid-cols-1 gap-px bg-[var(--ios-separator)]/55 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label} className="bg-[var(--ios-card)] px-4 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
              {field.label}
            </dt>
            <dd className="mt-0.5 truncate text-[13px] font-medium text-[var(--ios-label)]">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="overflow-x-auto border-t border-[var(--ios-separator)]/55">
        <table className="w-full min-w-[980px] border-collapse">
          <thead>
            <tr className="bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <th rowSpan={2} className={cn(th, "w-12")}>
                {t("table.number")}
              </th>
              <th rowSpan={2} className={cn(th, "min-w-[220px] text-left")}>
                {t("table.names")}
              </th>
              <th rowSpan={2} className={cn(th, "w-14")}>
                {t("table.sex")}
              </th>
              <th colSpan={5} className={th}>
                {t("table.sequence", { number: sheet.sequence1Number ?? 1 })}
              </th>
              <th colSpan={5} className={th}>
                {t("table.sequence", { number: sheet.sequence2Number ?? 2 })}
              </th>
            </tr>
            <tr className="bg-[color-mix(in_srgb,var(--ios-fill)_30%,var(--ios-card))]">
              {[1, 2].flatMap((seq) => [
                <th key={`${seq}-comp`} className={th}>
                  {t("table.comp")}
                </th>,
                <th key={`${seq}-coef`} className={th}>
                  {t("table.coefficient")}
                </th>,
                <th key={`${seq}-weighted`} className={th}>
                  {t("table.weighted")}
                </th>,
                <th key={`${seq}-rank`} className={th}>
                  {t("table.rank")}
                </th>,
                <th key={`${seq}-app`} className={th}>
                  {t("table.appreciation")}
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {sheet.lines.length === 0 ? (
              <tr>
                <td
                  colSpan={13}
                  className="px-4 py-8 text-center text-[12px] text-[var(--ios-secondary-label)]"
                >
                  {t("table.empty")}
                </td>
              </tr>
            ) : (
              sheet.lines.map((line, index) => (
                <tr
                  key={line.studentId}
                  className={index % 2 === 1 ? "bg-[color-mix(in_srgb,var(--ios-fill)_18%,transparent)]" : undefined}
                >
                  <td className={td}>{line.rollNumber ?? index + 1}</td>
                  <td className={cn(td, "text-left font-medium")}>{line.studentLabel}</td>
                  <td className={td}>{line.sex ? t(`sexShort.${line.sex}`) : ""}</td>
                  {renderCells(line.sequence1, "s1")}
                  {renderCells(line.sequence2, "s2")}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-[var(--ios-separator)]/55 px-4 py-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {visaBoxes.map((box) => (
            <div
              key={box.label}
              className="min-h-[64px] rounded-[var(--radius-md)] border border-dashed border-[var(--ios-separator)] px-3 py-2"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
                {box.label}
              </p>
              <p className="mt-2 text-[12px] text-[var(--ios-label)]">{box.value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
          {t("footer.deadlineNotice", { hours: REPORT_SHEET_DEADLINE_HOURS })}
        </p>
      </footer>
    </section>
  );
}

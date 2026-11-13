"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, FileText, ShieldCheck, ShieldX } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Textarea } from "@/components/ui/textarea";
import { HubLoadingRows, HubTableShell } from "@/components/workspace/hub-chrome";
import { ReportSheetPaper } from "@/components/teacher/report-sheet-paper";
import { localizedLabel } from "@/lib/api/academic";
import {
  listGradeReportSheets,
  rejectGradeReportSheet,
  visaPrincipalReportSheet,
  visaSupervisorReportSheet,
  type GradeReportSheetResponse,
  type ReportSheetStatus,
} from "@/lib/api/grading";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

const TERMS = [1, 2, 3] as const;

const STATUS_TONE: Record<ReportSheetStatus, "neutral" | "blue" | "success" | "warning" | "danger"> = {
  DRAFT: "neutral",
  SUBMITTED: "blue",
  VISA_SG: "warning",
  VISA_PRINCIPAL: "success",
  REJECTED: "danger",
};

type ActionKind = "visaSupervisor" | "visaPrincipal" | "reject";

type Props = {
  schoolId: string | null | undefined;
  academicYearId: string | null;
  yearLabel: string | null;
  /** Trimestre sélectionné au premier affichage (ex. celui de la séquence ouverte). */
  defaultTerm?: number;
  /** Trimestre des séquences OPEN (BR-25) ; null si aucune n’est ouverte. */
  activeTerm?: number | null;
  query: string;
  canVisaSupervisor: boolean;
  canVisaPrincipal: boolean;
};

/** Visas SG / Principal et rejet des fiches de report du trimestre (administration, directeur, SG). */
export function ReportSheetsPanel({
  schoolId,
  academicYearId,
  yearLabel,
  defaultTerm = 1,
  activeTerm = null,
  query,
  canVisaSupervisor,
  canVisaPrincipal,
}: Props) {
  const t = useTranslations("gradesHub.reportSheets");
  const tHub = useTranslations("gradesHub");
  const tStatus = useTranslations("teacherGrades.report.status");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [term, setTerm] = useState<number>(
    TERMS.includes(defaultTerm as (typeof TERMS)[number]) ? defaultTerm : 1,
  );

  // Aligne le trimestre sur les sessions ouvertes du hub (BR-25).
  useEffect(() => {
    if (TERMS.includes(defaultTerm as (typeof TERMS)[number])) {
      setTerm(defaultTerm);
    }
  }, [defaultTerm]);
  const [sheets, setSheets] = useState<GradeReportSheetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<GradeReportSheetResponse | null>(null);
  const [reason, setReason] = useState("");
  const [reasonInvalid, setReasonInvalid] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    if (!academicYearId) {
      setSheets([]);
      return;
    }
    setLoading(true);
    try {
      setSheets(await listGradeReportSheets(academicYearId, term, schoolId));
    } catch (error) {
      if (isAuthFailure(error)) return;
      setSheets([]);
      notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [academicYearId, schoolId, t, term]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = [...sheets].sort(
      (a, b) =>
        (a.classLabel ?? "").localeCompare(b.classLabel ?? "", locale) ||
        localizedLabel(a.subjectLabel, locale).localeCompare(
          localizedLabel(b.subjectLabel, locale),
          locale,
        ),
    );
    if (!q) return rows;
    return rows.filter((s) =>
      [s.classLabel ?? "", localizedLabel(s.subjectLabel, locale), s.teacherLabel ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [locale, query, sheets]);

  const preview = useMemo(
    () => sheets.find((s) => s.id === previewId) ?? null,
    [previewId, sheets],
  );

  const can = useCallback(
    (sheet: GradeReportSheetResponse, kind: ActionKind): boolean => {
      if (kind === "visaSupervisor") return canVisaSupervisor && sheet.status === "SUBMITTED";
      // BR-83 : le Principal peut viser dès le brouillon ; les autres visas manquants sont complétés.
      if (kind === "visaPrincipal") {
        return (
          canVisaPrincipal &&
          (sheet.status === "DRAFT" ||
            sheet.status === "REJECTED" ||
            sheet.status === "SUBMITTED" ||
            sheet.status === "VISA_SG")
        );
      }
      return (
        (canVisaSupervisor || canVisaPrincipal) &&
        (sheet.status === "DRAFT" ||
          sheet.status === "REJECTED" ||
          sheet.status === "SUBMITTED" ||
          sheet.status === "VISA_SG")
      );
    },
    [canVisaPrincipal, canVisaSupervisor],
  );

  function replaceSheet(next: GradeReportSheetResponse) {
    setSheets((prev) => prev.map((s) => (s.id === next.id ? next : s)));
  }

  async function run(sheet: GradeReportSheetResponse, kind: Exclude<ActionKind, "reject">) {
    if (acting) return;
    setActing(`${kind}:${sheet.id}`);
    try {
      const next =
        kind === "visaSupervisor"
          ? await visaSupervisorReportSheet(sheet.id, schoolId)
          : await visaPrincipalReportSheet(sheet.id, schoolId);
      replaceSheet(next);
      notify.success(t(kind === "visaSupervisor" ? "visaSupervisorSuccess" : "visaPrincipalSuccess"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  }

  function openReject(sheet: GradeReportSheetResponse) {
    setReason("");
    setReasonInvalid(false);
    setRejectTarget(sheet);
  }

  function closeReject() {
    if (acting) return;
    setRejectTarget(null);
    setReason("");
    setReasonInvalid(false);
  }

  async function confirmReject() {
    if (!rejectTarget || acting) return;
    if (!reason.trim()) {
      setReasonInvalid(true);
      notify.error(t("reasonRequired"));
      return;
    }
    setActing(`reject:${rejectTarget.id}`);
    try {
      replaceSheet(await rejectGradeReportSheet(rejectTarget.id, { reason, schoolId }));
      notify.success(t("rejectSuccess"));
      setRejectTarget(null);
      setReason("");
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  }

  const renderActions = (sheet: GradeReportSheetResponse, dense: boolean) => {
    const busy = acting !== null;
    const buttons = [
      can(sheet, "visaSupervisor") ? (
        <Button
          key="sg"
          type="button"
          size="sm"
          loading={acting === `visaSupervisor:${sheet.id}`}
          disabled={busy}
          leadingIcon={<ShieldCheck className="size-3.5" aria-hidden />}
          onClick={() => void run(sheet, "visaSupervisor")}
        >
          {t("visaSupervisor")}
        </Button>
      ) : null,
      can(sheet, "visaPrincipal") ? (
        <Button
          key="principal"
          type="button"
          size="sm"
          loading={acting === `visaPrincipal:${sheet.id}`}
          disabled={busy}
          leadingIcon={<ShieldCheck className="size-3.5" aria-hidden />}
          onClick={() => void run(sheet, "visaPrincipal")}
        >
          {t("visaPrincipal")}
        </Button>
      ) : null,
      can(sheet, "reject") ? (
        <Button
          key="reject"
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          leadingIcon={<ShieldX className="size-3.5" aria-hidden />}
          onClick={() => openReject(sheet)}
        >
          {t("reject")}
        </Button>
      ) : null,
    ].filter(Boolean);

    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", dense ? "justify-end" : "justify-start")}>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          leadingIcon={<Eye className="size-3.5" aria-hidden />}
          onClick={() => setPreviewId(sheet.id)}
        >
          {t("view")}
        </Button>
        {buttons.length > 0 ? (
          buttons
        ) : (
          <span className="text-[11px] text-[var(--ios-tertiary-label)]">{t("noAction")}</span>
        )}
      </div>
    );
  };

  const statusLabel = (status: ReportSheetStatus) => tStatus(status);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-success-soft)] text-[var(--ios-success)]"
              aria-hidden
            >
              <FileText className="size-[18px] stroke-[1.75]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                {t("cardTitle")}
                {yearLabel ? ` · ${yearLabel}` : ""}
              </p>
              <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                {t("cardHint")}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
              {t("termLabel")}
            </p>
            <SegmentedControl
              ariaLabel={t("termLabel")}
              value={String(term)}
              onChange={(value) => setTerm(Number(value))}
              options={TERMS.map((n) => ({
                value: String(n),
                label:
                  activeTerm === n
                    ? t("termOptionActive", { number: n })
                    : t("termOption", { number: n }),
              }))}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <HubLoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tHub("empty.reportSheets.title")}
          description={tHub("empty.reportSheets.description")}
          icon={<FileText className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filtered.map((sheet) => (
              <li
                key={sheet.id}
                className="space-y-2.5 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                      {localizedLabel(sheet.subjectLabel, locale)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                      {sheet.classLabel ?? "—"} · {sheet.teacherLabel?.trim() || t("unknownTeacher")}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[sheet.status]}>{statusLabel(sheet.status)}</Badge>
                </div>
                {renderActions(sheet, false)}
              </li>
            ))}
          </ul>

          <HubTableShell countLabel={tHub("tableCount", { count: filtered.length })}>
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  {(["class", "subject", "teacher", "status"] as const).map((key) => (
                    <th
                      key={key}
                      className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]"
                    >
                      {t(`columns.${key}`)}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sheet, index) => (
                  <tr
                    key={sheet.id}
                    className={cn(
                      "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                      index % 2 === 1 && "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                    )}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-[var(--ios-label)]">
                      {sheet.classLabel ?? "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[var(--ios-label)]">
                      {localizedLabel(sheet.subjectLabel, locale)}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[var(--ios-secondary-label)]">
                      {sheet.teacherLabel?.trim() || t("unknownTeacher")}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[sheet.status]}>{statusLabel(sheet.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5">{renderActions(sheet, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}

      {mounted && preview
        ? createPortal(
            <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label={t("close")}
                className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
                onClick={() => setPreviewId(null)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-sheet-preview-title"
                className="relative z-10 flex max-h-[min(92dvh,900px)] w-full max-w-6xl flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
              >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-3.5 pt-4">
                  <div className="min-w-0">
                    <h2
                      id="report-sheet-preview-title"
                      className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]"
                    >
                      {t("previewTitle")} · {localizedLabel(preview.subjectLabel, locale)}
                    </h2>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ios-secondary-label)]">
                      <span>{preview.classLabel ?? "—"}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {t("termLabel")} {t("termOption", { number: preview.termNumber })}
                      </span>
                      <Badge tone={STATUS_TONE[preview.status]}>{statusLabel(preview.status)}</Badge>
                    </p>
                  </div>
                  <DialogCloseButton aria-label={t("close")} onClick={() => setPreviewId(null)} />
                </div>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
                  {preview.status === "REJECTED" && preview.rejectionReason?.trim() ? (
                    <Alert tone="danger" title={tStatus("REJECTED")} description={preview.rejectionReason} />
                  ) : null}
                  <ReportSheetPaper sheet={preview} />
                </div>
                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="button"
                    variant="ghostDestructive"
                    onClick={() => setPreviewId(null)}
                  >
                    {t("close")}
                  </Button>
                  {renderActions(preview, true)}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {mounted && rejectTarget
        ? createPortal(
            <div className="fixed inset-0 z-[210] flex items-end justify-center p-4 sm:items-center">
              <button
                type="button"
                aria-label={tCommon("cancel")}
                className="absolute inset-0 cursor-default border-0 bg-[color-mix(in_srgb,var(--ios-label)_22%,transparent)] backdrop-blur-[6px]"
                onClick={closeReject}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-sheet-reject-title"
                className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)] ring-1 ring-[color-mix(in_srgb,var(--ios-separator)_70%,transparent)] slide-up"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-5 pb-3.5 pt-4">
                  <div className="min-w-0">
                    <h2
                      id="report-sheet-reject-title"
                      className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ios-label)]"
                    >
                      {t("rejectTitle")}
                    </h2>
                    <p className="mt-1 text-[11px] leading-snug text-[var(--ios-secondary-label)]">
                      {t("rejectDescription")}
                    </p>
                    <p className="mt-1 text-[11px] font-medium text-[var(--ios-label)]">
                      {localizedLabel(rejectTarget.subjectLabel, locale)} · {rejectTarget.classLabel ?? "—"}
                    </p>
                  </div>
                  <DialogCloseButton
                    aria-label={tCommon("cancel")}
                    disabled={acting !== null}
                    onClick={closeReject}
                  />
                </div>
                <div className="space-y-3 px-5 py-4">
                  <Field label={t("reasonLabel")} error={reasonInvalid ? t("reasonRequired") : undefined}>
                    <Textarea
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                        if (reasonInvalid && event.target.value.trim()) setReasonInvalid(false);
                      }}
                      placeholder={t("reasonPlaceholder")}
                      invalid={reasonInvalid}
                      rows={4}
                      disabled={acting !== null}
                      autoFocus
                    />
                  </Field>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-[var(--ios-separator)]/55 bg-[color-mix(in_srgb,var(--ios-fill)_18%,var(--ios-card))] px-5 py-3.5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="ghostDestructive"
                    disabled={acting !== null}
                    onClick={closeReject}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    loading={acting === `reject:${rejectTarget.id}`}
                    disabled={acting !== null || !reason.trim()}
                    onClick={() => void confirmReject()}
                  >
                    {t("rejectConfirm")}
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, FileText, Paperclip, RefreshCw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { HubLoadingRows, HubTableShell } from "@/components/workspace/hub-chrome";
import {
  approveGradeCorrection,
  fetchGradeCorrectionEvidence,
  listPendingGradeCorrections,
  rejectGradeCorrection,
  type GradeCorrectionRequestResponse,
  type GradeStatus,
} from "@/lib/api/grading";
import { formatMark, markCellText } from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

type Props = {
  schoolId: string | null | undefined;
  query: string;
};

function statusShort(status: GradeStatus, locale: string): string {
  return markCellText(null, status, locale, { absent: "ABS", exempted: "DISP" }) || status;
}

function markLabel(
  value: string | number | null | undefined,
  status: GradeStatus,
  locale: string,
): string {
  if (status === "SCORED") return formatMark(value, locale) || "—";
  return statusShort(status, locale);
}

/** File d’attente directeur : approuver / rejeter les corrections post-clôture (BR-80). */
export function GradeCorrectionsPanel({ schoolId, query }: Props) {
  const t = useTranslations("gradesHub.corrections");
  const tHub = useTranslations("gradesHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [rows, setRows] = useState<GradeCorrectionRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<GradeCorrectionRequestResponse | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewInvalid, setReviewInvalid] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPendingGradeCorrections(schoolId));
    } catch (error) {
      if (isAuthFailure(error)) return;
      setRows([]);
      notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.studentLabel,
        row.classLabel,
        row.subjectLabelFr,
        row.subjectLabelEn,
        row.reason,
        String(row.sessionNumber),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

  const subjectLabel = (row: GradeCorrectionRequestResponse) => {
    if (locale.startsWith("en")) return row.subjectLabelEn || row.subjectLabelFr || "—";
    return row.subjectLabelFr || row.subjectLabelEn || "—";
  };

  const formatWhen = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openEvidence = async (row: GradeCorrectionRequestResponse, evidenceId: string, fileName: string) => {
    try {
      const blob = await fetchGradeCorrectionEvidence(row.id, evidenceId, schoolId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("evidenceError"));
    }
  };

  const onApprove = async (row: GradeCorrectionRequestResponse) => {
    setActing(`approve:${row.id}`);
    try {
      await approveGradeCorrection(row.id, schoolId);
      notify.success(t("approveSuccess"));
      setRows((prev) => prev.filter((item) => item.id !== row.id));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const onReject = async () => {
    if (!rejectTarget) return;
    const note = reviewNote.trim();
    if (note.length < 5) {
      setReviewInvalid(true);
      notify.error(t("reviewNoteRequired"));
      return;
    }
    setActing(`reject:${rejectTarget.id}`);
    try {
      await rejectGradeCorrection(rejectTarget.id, note, schoolId);
      notify.success(t("rejectSuccess"));
      setRows((prev) => prev.filter((item) => item.id !== rejectTarget.id));
      setRejectTarget(null);
      setReviewNote("");
      setReviewInvalid(false);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  const renderActions = (row: GradeCorrectionRequestResponse, dense: boolean) => {
    const busy = acting !== null;
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", dense ? "justify-end" : "justify-start")}>
        <Button
          type="button"
          size="sm"
          loading={acting === `approve:${row.id}`}
          disabled={busy}
          leadingIcon={<Check className="size-3.5" aria-hidden />}
          onClick={() => void onApprove(row)}
        >
          {t("approve")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          leadingIcon={<X className="size-3.5" aria-hidden />}
          onClick={() => {
            setRejectTarget(row);
            setReviewNote("");
            setReviewInvalid(false);
          }}
        >
          {t("reject")}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <span
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-warning-soft)] text-[var(--ios-warning)]"
              aria-hidden
            >
              <FileText className="size-[18px] stroke-[1.75]" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--ios-label)]">
                  {t("cardTitle")}
                </p>
                <Badge tone="warning">{t("pendingCount", { count: rows.length })}</Badge>
              </div>
              <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">{t("cardHint")}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full shrink-0 sm:w-auto"
            leadingIcon={<RefreshCw className="size-3.5" aria-hidden />}
            disabled={loading}
            onClick={() => void load()}
          >
            {t("refresh")}
          </Button>
        </div>
      </div>

      {loading ? (
        <HubLoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={tHub("empty.corrections.title")}
          description={tHub("empty.corrections.description")}
          icon={<FileText className="size-9 stroke-[1.5]" aria-hidden />}
        />
      ) : (
        <>
          <ul className="space-y-2.5 md:hidden">
            {filtered.map((row) => (
              <li
                key={row.id}
                className="space-y-2.5 rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] p-3.5 shadow-[var(--ios-shadow)]"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-[var(--ios-label)]">
                    {row.studentLabel}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                    {row.classLabel ?? "—"} · {subjectLabel(row)} · {t("sequence", { number: row.sessionNumber })}
                  </p>
                </div>
                <p className="text-[12px] text-[var(--ios-label)]">
                  {markLabel(row.previousValue, row.previousStatus, locale)}
                  {" → "}
                  <span className="font-semibold text-[var(--ios-warning)]">
                    {markLabel(row.proposedValue, row.proposedStatus, locale)}
                  </span>
                </p>
                <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">{row.reason}</p>
                {row.evidence.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {row.evidence.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="pressable inline-flex h-8 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--ios-fill)] px-2 text-[11px] font-medium"
                        onClick={() => void openEvidence(row, item.id, item.fileName)}
                      >
                        <Paperclip className="size-3" aria-hidden />
                        {item.fileName}
                      </button>
                    ))}
                  </div>
                ) : null}
                {renderActions(row, false)}
              </li>
            ))}
          </ul>

          <HubTableShell countLabel={tHub("tableCount", { count: filtered.length })}>
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                  {(
                    [
                      "student",
                      "class",
                      "subject",
                      "sequence",
                      "previous",
                      "proposed",
                      "reason",
                      "evidence",
                      "when",
                    ] as const
                  ).map((key) => (
                    <th
                      key={key}
                      className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]"
                    >
                      {t(`columns.${key}`)}
                    </th>
                  ))}
                  <th className="px-4 py-3.5 text-right text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                    {t("columns.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--ios-separator)]/55 last:border-b-0"
                  >
                    <td className="px-4 py-3 text-[13px] font-medium text-[var(--ios-label)]">
                      {row.studentLabel}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--ios-secondary-label)]">
                      {row.classLabel ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[var(--ios-secondary-label)]">
                      {subjectLabel(row)}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-[var(--ios-secondary-label)]">
                      {t("sequence", { number: row.sessionNumber })}
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums">
                      {markLabel(row.previousValue, row.previousStatus, locale)}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold tabular-nums text-[var(--ios-warning)]">
                      {markLabel(row.proposedValue, row.proposedStatus, locale)}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-[12px] text-[var(--ios-secondary-label)]">
                      <span className="line-clamp-3">{row.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.evidence.length === 0 ? (
                        <span className="text-[11px] text-[var(--ios-tertiary-label)]">
                          {t("noEvidence")}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {row.evidence.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--ios-fill)] text-[var(--ios-label)]"
                              title={t("viewEvidence", { name: item.fileName })}
                              aria-label={t("viewEvidence", { name: item.fileName })}
                              onClick={() => void openEvidence(row, item.id, item.fileName)}
                            >
                              <Paperclip className="size-3.5" aria-hidden />
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[11px] text-[var(--ios-secondary-label)]">
                      {formatWhen(row.requestedAt)}
                    </td>
                    <td className="px-4 py-3">{renderActions(row, true)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </HubTableShell>
        </>
      )}

      {mounted && rejectTarget
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-3 sm:items-center">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="correction-reject-title"
                className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--ios-card)] p-4 shadow-[var(--ios-shadow-lg)] sm:p-5"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2
                      id="correction-reject-title"
                      className="text-[15px] font-semibold text-[var(--ios-label)]"
                    >
                      {t("rejectTitle")}
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--ios-secondary-label)]">
                      {t("rejectDescription")}
                    </p>
                  </div>
                  <DialogCloseButton
                    aria-label={tCommon("close")}
                    onClick={() => {
                      setRejectTarget(null);
                      setReviewNote("");
                      setReviewInvalid(false);
                    }}
                  />
                </div>
                <Field label={t("reviewNoteLabel")}>
                  <Textarea
                    rows={3}
                    value={reviewNote}
                    invalid={reviewInvalid}
                    placeholder={t("reviewNotePlaceholder")}
                    onChange={(event) => {
                      setReviewNote(event.target.value);
                      setReviewInvalid(false);
                    }}
                  />
                </Field>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRejectTarget(null);
                      setReviewNote("");
                      setReviewInvalid(false);
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    loading={acting === `reject:${rejectTarget.id}`}
                    onClick={() => void onReject()}
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

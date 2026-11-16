"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, RefreshCw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogCloseButton } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { HubLoadingRows, HubTableShell } from "@/components/workspace/hub-chrome";
import {
  approveTimetableChange,
  listPendingTimetableChanges,
  rejectTimetableChange,
  type TimetableChangeRequestResponse,
} from "@/lib/api/timetable";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type Props = {
  schoolId: string | null | undefined;
  query: string;
};

/** File d’attente admin/directeur : valider / refuser les demandes de créneau (BR-67). */
export function TimetableChangesPanel({ schoolId, query }: Props) {
  const t = useTranslations("timetableHub.changes");
  const tHub = useTranslations("timetableHub");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [rows, setRows] = useState<TimetableChangeRequestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<TimetableChangeRequestResponse | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewInvalid, setReviewInvalid] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listPendingTimetableChanges(schoolId));
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
        row.classLabel,
        row.teacherLabel,
        row.reason,
        row.changeKind,
        row.sourceSlotKey,
        row.sourceDay,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

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

  const dayLabel = (day: string) =>
    tHub.has(`days.${day}`) ? tHub(`days.${day}`) : day;

  const onApprove = async (row: TimetableChangeRequestResponse) => {
    setActing(`approve:${row.id}`);
    try {
      await approveTimetableChange(row.id, schoolId);
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
      await rejectTimetableChange(rejectTarget.id, note, schoolId);
      notify.success(t("rejectSuccess"));
      setRows((prev) => prev.filter((item) => item.id !== rejectTarget.id));
      setRejectTarget(null);
      setReviewNote("");
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="warning">{t("pendingCount", { count: rows.length })}</Badge>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          leadingIcon={<RefreshCw className="size-3.5" aria-hidden />}
          disabled={loading}
          onClick={() => void load()}
        >
          {t("refresh")}
        </Button>
      </div>

      {loading ? (
        <HubLoadingRows />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <HubTableShell countLabel={t("tableCount", { count: filtered.length })}>
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead className="border-b border-[var(--ios-separator)] text-[11px] uppercase tracking-wide text-[var(--ios-secondary-label)]">
              <tr>
                <th className="px-3 py-2 font-medium">{t("columns.teacher")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.class")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.slot")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.kind")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.reason")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.when")}</th>
                <th className="px-3 py-2 font-medium">{t("columns.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--ios-separator)]/70 last:border-0"
                >
                  <td className="px-3 py-2.5">{row.teacherLabel || "—"}</td>
                  <td className="px-3 py-2.5">{row.classLabel || "—"}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {dayLabel(row.sourceDay)} · {row.sourceSlotKey}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge tone="warning">{t(`kinds.${row.changeKind}`)}</Badge>
                  </td>
                  <td className="max-w-[240px] px-3 py-2.5 text-[var(--ios-secondary-label)]">
                    <span className="line-clamp-2">{row.reason}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-[var(--ios-secondary-label)]">
                    {formatWhen(row.requestedAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        className="aspect-square px-0"
                        disabled={acting !== null}
                        aria-label={t("approve")}
                        title={t("approve")}
                        leadingIcon={<Check className="size-3.5" aria-hidden />}
                        onClick={() => void onApprove(row)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="aspect-square px-0"
                        variant="destructive"
                        disabled={acting !== null}
                        aria-label={t("reject")}
                        title={t("reject")}
                        leadingIcon={<X className="size-3.5" aria-hidden />}
                        onClick={() => {
                          setRejectTarget(row);
                          setReviewNote("");
                          setReviewInvalid(false);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </HubTableShell>
      )}

      {mounted &&
        rejectTarget &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div
              role="dialog"
              aria-modal
              className="w-full max-w-md rounded-2xl bg-[var(--ios-secondary-system-grouped-background)] p-4 shadow-xl"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-semibold">{t("rejectTitle")}</h2>
                  <p className="mt-1 text-[13px] text-[var(--ios-secondary-label)]">
                    {t("rejectHint")}
                  </p>
                </div>
                <DialogCloseButton
                  onClick={() => {
                    setRejectTarget(null);
                    setReviewNote("");
                  }}
                />
              </div>
              <Field
                label={t("reviewNote")}
                error={reviewInvalid ? t("reviewNoteRequired") : undefined}
              >
                <Textarea
                  rows={4}
                  value={reviewNote}
                  onChange={(e) => {
                    setReviewNote(e.target.value);
                    if (reviewInvalid && e.target.value.trim().length >= 5) {
                      setReviewInvalid(false);
                    }
                  }}
                />
              </Field>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setRejectTarget(null);
                    setReviewNote("");
                  }}
                >
                  {tCommon("cancel")}
                </Button>
                <Button size="sm" disabled={acting !== null} onClick={() => void onReject()}>
                  {acting?.startsWith("reject:") ? t("rejecting") : t("confirmReject")}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

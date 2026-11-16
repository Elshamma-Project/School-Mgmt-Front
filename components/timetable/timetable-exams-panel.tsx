"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import {
  listEvaluationSessions,
  updateEvaluationSessionSchedule,
  type EvaluationSessionResponse,
} from "@/lib/api/grading";
import { resolveLocalized } from "@/lib/timetable/format";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type Props = {
  academicYearId: string;
  schoolId?: string | null;
  canEdit: boolean;
  sequencesHref: `/${string}`;
};

/**
 * Planification des examens : source de vérité = `EvaluationSession` (module grading).
 * Affichée ici pour synchroniser la vue EDT ; toute modification ici ou dans Séquences
 * reste la même donnée.
 */
export function TimetableExamsPanel({
  academicYearId,
  schoolId,
  canEdit,
  sequencesHref,
}: Props) {
  const t = useTranslations("timetableHub");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<EvaluationSessionResponse[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listEvaluationSessions({ academicYearId, schoolId });
      setSessions(rows.slice().sort((a, b) => a.number - b.number));
      const next: Record<string, string> = {};
      for (const row of rows) {
        next[row.id] = row.examDate ?? "";
      }
      setDrafts(next);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [academicYearId, schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSave = async (session: EvaluationSessionResponse) => {
    if (!canEdit) return;
    const examDate = (drafts[session.id] || "").trim();
    if (!examDate) {
      notify.error(t("exams.examDateRequired"));
      return;
    }
    setSavingId(session.id);
    try {
      const updated = await updateEvaluationSessionSchedule(session.id, {
        examDate,
        schoolId,
      });
      setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setDrafts((prev) => ({ ...prev, [updated.id]: updated.examDate ?? "" }));
      notify.success(t("exams.saved"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("actionError"));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <p className="px-1 py-6 text-[13px] text-[var(--ios-secondary-label)]">{t("exams.loading")}</p>
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title={t("exams.emptyTitle")}
        description={t("exams.emptyDescription")}
        icon={<CalendarDays className="size-9 stroke-[1.5]" aria-hidden />}
        action={
          <Link
            href={sequencesHref}
            className="pressable inline-flex h-9 items-center justify-center rounded-[var(--radius-md)] bg-[var(--ios-fill)] px-4 text-[12px] font-semibold text-[var(--ios-label)]"
          >
            {t("exams.openSequences")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] leading-relaxed text-[var(--ios-secondary-label)]">
        {t("exams.hint")}
      </p>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--ios-separator)]/55">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("exams.sequence")}
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("exams.term")}
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("exams.status")}
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("exams.examDate")}
              </th>
              <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]">
                {t("columns.actions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session, index) => (
              <tr
                key={session.id}
                className={
                  index % 2 === 1
                    ? "border-b border-[var(--ios-separator)]/45 bg-[color-mix(in_srgb,var(--ios-fill)_18%,transparent)]"
                    : "border-b border-[var(--ios-separator)]/45"
                }
              >
                <td className="px-4 py-3 text-[13px] font-semibold text-[var(--ios-label)]">
                  {session.shortLabel}
                  <span className="mt-0.5 block text-[11px] font-normal text-[var(--ios-secondary-label)]">
                    {resolveLocalized(session.name, locale)}
                  </span>
                </td>
                <td className="px-3 py-3 text-[12px] text-[var(--ios-label)]">T{session.termNumber}</td>
                <td className="px-3 py-3 text-[12px] text-[var(--ios-label)]">
                  {t(`exams.sessionStatus.${session.status}`)}
                </td>
                <td className="px-3 py-3">
                  <Input
                    type="date"
                    value={drafts[session.id] ?? ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [session.id]: e.target.value }))
                    }
                  />
                </td>
                <td className="px-4 py-3">
                  {canEdit ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingId === session.id || (drafts[session.id] || "") === (session.examDate ?? "")}
                      onClick={() => void onSave(session)}
                    >
                      {savingId === session.id ? t("actions.saving") : t("actions.save")}
                    </Button>
                  ) : (
                    <span className="text-[12px] text-[var(--ios-tertiary-label)]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { HubLoadingRows } from "@/components/workspace/hub-chrome";
import type { TeacherAssignmentResponse } from "@/lib/api/academic";
import {
  batchUpsertGrades,
  createAssessment,
  listAssessments,
  listGradeSheets,
  listGrades,
  listSheetSequenceMarks,
  type AssessmentResponse,
  type EvaluationSessionResponse,
  type GradeReportSheetLineDto,
  type GradeResponse,
  type GradeSheetResponse,
  type GradeStatus,
  type SequenceMarkResponse,
} from "@/lib/api/grading";
import { formatMark, markToInput, parseMarkInput } from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

type RowDraft = { value: string; status: GradeStatus };

/** Statuts proposés dans la liste ; « SCORED » couvre aussi « non saisi » (champ vide). */
const STATUS_CHOICES: GradeStatus[] = ["SCORED", "ABSENT", "ABSENT_EXCUSED", "EXEMPTED"];

const th =
  "px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]";

function toDraft(grade: GradeResponse | undefined): RowDraft {
  if (!grade) return { value: "", status: "SCORED" };
  if (grade.status === "SCORED") return { value: markToInput(grade.value), status: "SCORED" };
  if (grade.status === "PENDING") return { value: "", status: "SCORED" };
  return { value: "", status: grade.status };
}

type EntryData = {
  sheet: GradeSheetResponse | null;
  assessment: AssessmentResponse | null;
  grades: GradeResponse[];
  marks: SequenceMarkResponse[];
};

const EMPTY_ENTRY: EntryData = { sheet: null, assessment: null, grades: [], marks: [] };

async function fetchEntry(
  sessionId: string,
  classSubjectId: string,
  schoolId: string | null | undefined,
): Promise<EntryData> {
  const sheets = await listGradeSheets(sessionId, schoolId);
  const sheet = sheets.find((s) => s.classSubjectId === classSubjectId) ?? null;
  if (!sheet) return EMPTY_ENTRY;
  const [assessments, marks] = await Promise.all([
    listAssessments(sheet.id, schoolId),
    listSheetSequenceMarks(sheet.id, schoolId),
  ]);
  const assessment = assessments.find((a) => a.type === "SEQUENCE_MARK") ?? null;
  const grades = assessment ? await listGrades(assessment.id, schoolId) : [];
  return { sheet, assessment, grades, marks };
}

type Props = {
  schoolId: string | null | undefined;
  assignment: TeacherAssignmentResponse;
  termSessions: EvaluationSessionResponse[];
  /** Lignes de la fiche de report du trimestre (liste de classe) ; `null` si la fiche n’existe pas. */
  rosterLines: GradeReportSheetLineDto[] | null;
  rosterLoading: boolean;
  onLoadRoster: () => void;
};

/** Saisie de la colonne « Note de séquence » (Comp. /20) d’une matière pour une séquence. */
export function SequenceEntryPanel({
  schoolId,
  assignment,
  termSessions,
  rosterLines,
  rosterLoading,
  onLoadRoster,
}: Props) {
  const t = useTranslations("teacherGrades.entry");
  const locale = useLocale();

  const ordered = useMemo(
    () => [...termSessions].sort((a, b) => a.number - b.number),
    [termSessions],
  );
  const [pickedSessionId, setPickedSessionId] = useState<string | null>(null);
  // Séquence par défaut : la première OPEN du trimestre, sinon la première.
  const session =
    ordered.find((s) => s.id === pickedSessionId) ??
    ordered.find((s) => s.status === "OPEN") ??
    ordered[0] ??
    null;
  const sessionId = session?.id ?? null;  const activeSessionId = session?.id ?? null;
  const activeSessionStatus = session?.status ?? null;

  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<EntryData>(EMPTY_ENTRY);
  const { sheet, assessment, grades, marks } = entry;
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const classSubjectId = assignment.classSubjectId;

  const load = useCallback(async () => {
    setEntry(EMPTY_ENTRY);
    setDrafts({});
    setErrors({});
    if (activeSessionId && activeSessionStatus !== "PLANNED") {
      setLoading(true);
      try {
        const data = await fetchEntry(activeSessionId, classSubjectId, schoolId);
        setEntry(data);
        setDrafts(Object.fromEntries(data.grades.map((g) => [g.studentId, toDraft(g)])));
      } catch (error) {
        if (!isAuthFailure(error)) {
          notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
        }
      } finally {
        setLoading(false);
      }
    }
  }, [activeSessionId, activeSessionStatus, classSubjectId, schoolId, t]);
  useEffect(() => {
    void load();
  }, [load]);

  const gradeByStudent = useMemo(
    () => new Map(grades.map((g) => [g.studentId, g])),
    [grades],
  );
  const markByStudent = useMemo(
    () => new Map(marks.map((m) => [m.studentId, m])),
    [marks],
  );

  const roster = useMemo(
    () =>
      [...(rosterLines ?? [])].sort(
        (a, b) => (a.rollNumber ?? Number.MAX_SAFE_INTEGER) - (b.rollNumber ?? Number.MAX_SAFE_INTEGER),
      ),
    [rosterLines],
  );

  const draftOf = (studentId: string): RowDraft =>
    drafts[studentId] ?? toDraft(gradeByStudent.get(studentId));

  const dirtyIds = useMemo(
    () =>
      roster
        .map((line) => line.studentId)
        .filter((id) => {
          const current = drafts[id];
          if (!current) return false;
          const original = toDraft(gradeByStudent.get(id));
          return current.value.trim() !== original.value.trim() || current.status !== original.status;
        }),
    [drafts, gradeByStudent, roster],
  );

  const editable = session?.status === "OPEN" && sheet?.status !== "LOCKED";

  function updateDraft(studentId: string, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: { ...draftOf(studentId), ...patch },
    }));
    setErrors((prev) => (prev[studentId] ? { ...prev, [studentId]: false } : prev));
  }

  async function onCreateColumn() {
    if (!sheet || creating) return;
    setCreating(true);
    try {
      const created = await createAssessment({
        sheetId: sheet.id,
        title: t("columnTitle"),
        type: "SEQUENCE_MARK",
        maxScore: 20,
        weight: 1,
        schoolId,
      });
      setEntry((prev) => ({ ...prev, assessment: created }));
      notify.success(t("columnCreated"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("columnError"));
    } finally {
      setCreating(false);
    }
  }

  async function onSave() {
    if (!assessment || !sheet || saving || dirtyIds.length === 0) return;

    const nextErrors: Record<string, boolean> = {};
    const items: Array<{ studentId: string; status: GradeStatus; value: string | null }> = [];
    for (const studentId of dirtyIds) {
      const draft = draftOf(studentId);
      if (draft.status !== "SCORED") {
        items.push({ studentId, status: draft.status, value: null });
        continue;
      }
      const parsed = parseMarkInput(draft.value, 20);
      if (!parsed.ok) {
        nextErrors[studentId] = true;
        continue;
      }
      // Case vide = PENDING (jamais 0).
      items.push({
        studentId,
        status: parsed.value === null ? "PENDING" : "SCORED",
        value: parsed.value,
      });
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notify.error(t("invalidValue"));
      return;
    }

    setSaving(true);
    try {
      const saved = await batchUpsertGrades({
        assessmentId: assessment.id,
        grades: items,
        schoolId,
      });
      const merged = new Map(grades.map((g) => [g.studentId, g]));
      for (const row of saved) merged.set(row.studentId, row);
      const nextMarks = await listSheetSequenceMarks(sheet.id, schoolId);
      setEntry((prev) => ({ ...prev, grades: [...merged.values()], marks: nextMarks }));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const row of saved) next[row.studentId] = toDraft(row);
        return next;
      });
      notify.success(t("saveSuccess", { count: saved.length }));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  function focusRow(index: number) {
    const el = document.getElementById(`mark-input-${index}`);
    if (el instanceof HTMLInputElement) {
      el.focus();
      el.select();
    }
  }

  const sessionTone = (status: EvaluationSessionResponse["status"]) =>
    status === "OPEN" ? "success" : status === "CLOSED" ? "neutral" : "blue";

  if (ordered.length === 0) {
    return (
      <EmptyState
        title={t("notOpenTitle")}
        description={t("notOpenDescription")}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--ios-secondary-label)]">
            {t("sequenceLabel")}
          </p>
          <SegmentedControl
            ariaLabel={t("sequenceLabel")}
            value={sessionId ?? ""}
            onChange={setPickedSessionId}
            options={ordered.map((s) => ({
              value: s.id,
              label: t("sequenceOption", { number: s.number }),
            }))}
          />
        </div>
        {session ? (
          <Badge tone={sessionTone(session.status)}>{t(`sequenceStatus.${session.status}`)}</Badge>
        ) : null}
      </div>

      {session?.status === "PLANNED" ? (
        <Alert tone="info" title={t("notOpenTitle")} description={t("notOpenDescription")} />
      ) : loading ? (
        <HubLoadingRows rows={6} />
      ) : !sheet ? (
        <EmptyState title={t("noSheetTitle")} description={t("noSheetDescription")} />
      ) : (
        <>
          {session?.status === "CLOSED" || sheet.status === "LOCKED" ? (
            <Alert tone="warning" title={t("closedTitle")} description={t("closedDescription")} />
          ) : null}

          {!assessment ? (
            <EmptyState
              title={t("createColumnTitle")}
              description={t("createColumnDescription")}
              action={
                editable ? (
                  <Button
                    type="button"
                    loading={creating}
                    leadingIcon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() => void onCreateColumn()}
                  >
                    {t("createColumn")}
                  </Button>
                ) : undefined
              }
            />
          ) : rosterLines === null ? (
            <EmptyState
              title={t("rosterMissingTitle")}
              description={t("rosterMissingDescription")}
              action={
                <Button type="button" loading={rosterLoading} onClick={onLoadRoster}>
                  {t("loadRoster")}
                </Button>
              }
            />
          ) : roster.length === 0 ? (
            <EmptyState title={t("rosterRowsEmpty")} description={t("rosterMissingDescription")} />
          ) : (
            <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--ios-separator)]/55 bg-[var(--ios-card)] shadow-[var(--ios-shadow)]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ios-separator)]/55 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--ios-label)]">
                    {assessment.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                    {t("pendingHint")}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] text-[var(--ios-secondary-label)]">
                    {dirtyIds.length > 0 ? t("dirty", { count: dirtyIds.length }) : t("saved")}
                  </span>
                  {editable ? (
                    <Button
                      type="button"
                      size="sm"
                      loading={saving}
                      disabled={dirtyIds.length === 0}
                      leadingIcon={<Save className="size-3.5" aria-hidden />}
                      onClick={() => void onSave()}
                    >
                      {saving ? t("saving") : t("save")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className={cn(th, "w-14 text-center")}>{t("table.number")}</th>
                      <th className={th}>{t("table.names")}</th>
                      <th className={cn(th, "w-16 text-center")}>{t("table.sex")}</th>
                      <th className={cn(th, "w-28 text-center")}>{t("table.comp")}</th>
                      <th className={cn(th, "w-44")}>{t("table.status")}</th>
                      <th className={cn(th, "w-28 text-center")}>{t("table.sequenceMark")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((line, index) => {
                      const draft = draftOf(line.studentId);
                      const mark = markByStudent.get(line.studentId);
                      return (
                        <tr
                          key={line.studentId}
                          className={cn(
                            "border-b border-[var(--ios-separator)]/55 last:border-b-0",
                            index % 2 === 1 &&
                              "bg-[color-mix(in_srgb,var(--ios-fill)_22%,transparent)]",
                          )}
                        >
                          <td className="px-3 py-2 text-center text-[12px] tabular-nums text-[var(--ios-secondary-label)]">
                            {line.rollNumber ?? index + 1}
                          </td>
                          <td className="px-3 py-2 text-[13px] font-medium text-[var(--ios-label)]">
                            {line.studentLabel}
                          </td>
                          <td className="px-3 py-2 text-center text-[12px] text-[var(--ios-secondary-label)]">
                            {line.sex === "MALE" ? "M" : line.sex === "FEMALE" ? "F" : ""}
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <Input
                              id={`mark-input-${index}`}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${t("table.comp")} — ${line.studentLabel}`}
                              className="mx-auto h-9 w-24 text-center tabular-nums"
                              placeholder="—"
                              value={draft.value}
                              invalid={errors[line.studentId]}
                              disabled={!editable || saving || draft.status !== "SCORED"}
                              onChange={(event) =>
                                updateDraft(line.studentId, { value: event.target.value })
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  focusRow(index + 1);
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Select
                              aria-label={`${t("table.status")} — ${line.studentLabel}`}
                              className="h-9"
                              value={draft.status}
                              disabled={!editable || saving}
                              onChange={(event) =>
                                updateDraft(line.studentId, {
                                  status: event.target.value as GradeStatus,
                                  ...(event.target.value !== "SCORED" ? { value: "" } : {}),
                                })
                              }
                            >
                              {STATUS_CHOICES.map((status) => (
                                <option key={status} value={status}>
                                  {t(`status.${status}`)}
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2 text-center text-[12px] font-semibold tabular-nums text-[var(--ios-label)]">
                            {mark && mark.status === "SCORED"
                              ? formatMark(mark.value, locale)
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[var(--ios-separator)]/60 bg-[color-mix(in_srgb,var(--ios-fill)_28%,var(--ios-card))] px-4 py-2.5">
                <p className="text-[11px] text-[var(--ios-secondary-label)]">{t("formula")}</p>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}

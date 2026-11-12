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
import { formatMark, markToInput, parseMarkInput, toNumber } from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { ApiError, isAuthFailure } from "@/types/api";

type ColumnKind = "sequence" | "bonus" | "malus";
type RowDraft = { value: string; status: GradeStatus };

const COLUMN_TYPE = {
  sequence: "SEQUENCE_MARK",
  bonus: "BONUS",
  malus: "MALUS",
} as const;

const COLUMN_ORDER: ColumnKind[] = ["sequence", "bonus", "malus"];

/** Valeur par défaut de la colonne créée (Q-25 : bonus / malus en points, pas sur 20). */
const DEFAULT_MAX_SCORE: Record<ColumnKind, number> = { sequence: 20, bonus: 5, malus: 5 };

/** Statuts proposés pour la note de séquence ; « SCORED » couvre aussi « non saisi » (champ vide). */
const STATUS_CHOICES: GradeStatus[] = ["SCORED", "ABSENT", "ABSENT_EXCUSED", "EXEMPTED"];

const th =
  "px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--ios-secondary-label)]";

const draftKey = (assessmentId: string, studentId: string) => `${assessmentId}:${studentId}`;

function toDraft(grade: GradeResponse | undefined): RowDraft {
  if (!grade) return { value: "", status: "SCORED" };
  if (grade.status === "SCORED") return { value: markToInput(grade.value), status: "SCORED" };
  if (grade.status === "PENDING") return { value: "", status: "SCORED" };
  return { value: "", status: grade.status };
}

type EntryData = {
  sheet: GradeSheetResponse | null;
  assessments: Record<ColumnKind, AssessmentResponse | null>;
  /** Notes par `assessmentId`. */
  grades: Record<string, GradeResponse[]>;
  marks: SequenceMarkResponse[];
};

const EMPTY_ENTRY: EntryData = {
  sheet: null,
  assessments: { sequence: null, bonus: null, malus: null },
  grades: {},
  marks: [],
};

function pickAssessments(all: AssessmentResponse[]): Record<ColumnKind, AssessmentResponse | null> {
  const first = (kind: ColumnKind) => all.find((a) => a.type === COLUMN_TYPE[kind]) ?? null;
  return { sequence: first("sequence"), bonus: first("bonus"), malus: first("malus") };
}

async function fetchEntry(
  sessionId: string,
  classSubjectId: string,
  schoolId: string | null | undefined,
): Promise<EntryData> {
  const sheets = await listGradeSheets(sessionId, schoolId);
  const sheet = sheets.find((s) => s.classSubjectId === classSubjectId) ?? null;
  if (!sheet) return EMPTY_ENTRY;
  const [allAssessments, marks] = await Promise.all([
    listAssessments(sheet.id, schoolId),
    listSheetSequenceMarks(sheet.id, schoolId),
  ]);
  const assessments = pickAssessments(allAssessments);
  const present = COLUMN_ORDER.map((kind) => assessments[kind]).filter(
    (a): a is AssessmentResponse => a !== null,
  );
  const rows = await Promise.all(present.map((a) => listGrades(a.id, schoolId)));
  const grades: Record<string, GradeResponse[]> = {};
  present.forEach((a, index) => {
    grades[a.id] = rows[index] ?? [];
  });
  return { sheet, assessments, grades, marks };
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

/**
 * Saisie d’une séquence : note de séquence (Comp. /20), bonus et malus (points), et note de
 * séquence calculée (moyenne des colonnes + bonus − malus, plafonnée à 20 — Q-25).
 */
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
  const sessionId = session?.id ?? null;
  const activeSessionStatus = session?.status ?? null;

  const [loading, setLoading] = useState(false);
  const [entry, setEntry] = useState<EntryData>(EMPTY_ENTRY);
  const { sheet, assessments, grades, marks } = entry;
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState<ColumnKind | null>(null);
  const [saving, setSaving] = useState(false);

  const classSubjectId = assignment.classSubjectId;

  const load = useCallback(async () => {
    setEntry(EMPTY_ENTRY);
    setDrafts({});
    setErrors({});
    if (sessionId && activeSessionStatus !== "PLANNED") {
      setLoading(true);
      try {
        const data = await fetchEntry(sessionId, classSubjectId, schoolId);
        setEntry(data);
      } catch (error) {
        if (!isAuthFailure(error)) {
          notify.error(error instanceof ApiError && error.message ? error.message : t("loadError"));
        }
      } finally {
        setLoading(false);
      }
    }
  }, [sessionId, activeSessionStatus, classSubjectId, schoolId, t]);
  useEffect(() => {
    void load();
  }, [load]);

  const gradeIndex = useMemo(() => {
    const index = new Map<string, GradeResponse>();
    for (const [assessmentId, rows] of Object.entries(grades)) {
      for (const g of rows) index.set(draftKey(assessmentId, g.studentId), g);
    }
    return index;
  }, [grades]);

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

  const draftOf = useCallback(
    (assessmentId: string, studentId: string): RowDraft => {
      const key = draftKey(assessmentId, studentId);
      return drafts[key] ?? toDraft(gradeIndex.get(key));
    },
    [drafts, gradeIndex],
  );

  /** Clés `assessmentId:studentId` modifiées, groupées par colonne. */
  const dirtyByAssessment = useMemo(() => {
    const result = new Map<string, string[]>();
    for (const kind of COLUMN_ORDER) {
      const assessment = assessments[kind];
      if (!assessment) continue;
      for (const line of roster) {
        const key = draftKey(assessment.id, line.studentId);
        const current = drafts[key];
        if (!current) continue;
        const original = toDraft(gradeIndex.get(key));
        if (current.value.trim() !== original.value.trim() || current.status !== original.status) {
          const list = result.get(assessment.id) ?? [];
          list.push(line.studentId);
          result.set(assessment.id, list);
        }
      }
    }
    return result;
  }, [assessments, drafts, gradeIndex, roster]);

  const dirtyCount = useMemo(
    () => [...dirtyByAssessment.values()].reduce((sum, ids) => sum + ids.length, 0),
    [dirtyByAssessment],
  );

  const editable = session?.status === "OPEN" && sheet?.status !== "LOCKED";

  function updateDraft(assessmentId: string, studentId: string, patch: Partial<RowDraft>) {
    const key = draftKey(assessmentId, studentId);
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? toDraft(gradeIndex.get(key))), ...patch },
    }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: false } : prev));
  }

  async function onCreateColumn(kind: ColumnKind) {
    if (!sheet || creating) return;
    setCreating(kind);
    try {
      const created = await createAssessment({
        sheetId: sheet.id,
        title: t(`${kind}Title`),
        type: COLUMN_TYPE[kind],
        maxScore: DEFAULT_MAX_SCORE[kind],
        weight: 1,
        schoolId,
      });
      setEntry((prev) => ({
        ...prev,
        assessments: { ...prev.assessments, [kind]: created },
        grades: { ...prev.grades, [created.id]: [] },
      }));
      notify.success(t("columnCreated"));
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("columnError"));
    } finally {
      setCreating(null);
    }
  }

  async function onSave() {
    if (!sheet || saving || dirtyCount === 0) return;

    const nextErrors: Record<string, boolean> = {};
    const batches: Array<{
      assessmentId: string;
      items: Array<{ studentId: string; status: GradeStatus; value: string | null }>;
    }> = [];

    for (const kind of COLUMN_ORDER) {
      const assessment = assessments[kind];
      if (!assessment) continue;
      const ids = dirtyByAssessment.get(assessment.id) ?? [];
      if (ids.length === 0) continue;
      const max = toNumber(assessment.maxScore) ?? DEFAULT_MAX_SCORE[kind];
      const items: Array<{ studentId: string; status: GradeStatus; value: string | null }> = [];
      for (const studentId of ids) {
        const draft = draftOf(assessment.id, studentId);
        if (kind === "sequence" && draft.status !== "SCORED") {
          items.push({ studentId, status: draft.status, value: null });
          continue;
        }
        const parsed = parseMarkInput(draft.value, max);
        if (!parsed.ok) {
          nextErrors[draftKey(assessment.id, studentId)] = true;
          continue;
        }
        // Case vide = PENDING (jamais 0).
        items.push({
          studentId,
          status: parsed.value === null ? "PENDING" : "SCORED",
          value: parsed.value,
        });
      }
      batches.push({ assessmentId: assessment.id, items });
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      notify.error(t("invalidValue"));
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.all(
        batches.map((batch) =>
          batchUpsertGrades({
            assessmentId: batch.assessmentId,
            grades: batch.items,
            schoolId,
          }),
        ),
      );
      const nextMarks = await listSheetSequenceMarks(sheet.id, schoolId);
      const saved = results.flat();

      setEntry((prev) => {
        const nextGrades = { ...prev.grades };
        batches.forEach((batch, index) => {
          const merged = new Map(
            (nextGrades[batch.assessmentId] ?? []).map((g) => [g.studentId, g]),
          );
          for (const row of results[index] ?? []) merged.set(row.studentId, row);
          nextGrades[batch.assessmentId] = [...merged.values()];
        });
        return { ...prev, grades: nextGrades, marks: nextMarks };
      });
      setDrafts((prev) => {
        const next = { ...prev };
        for (const row of saved) next[draftKey(row.assessmentId, row.studentId)] = toDraft(row);
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

  /** Entrée : passe à l’élève suivant dans la même colonne. */
  function focusCell(kind: ColumnKind, index: number) {
    const el = document.getElementById(`mark-input-${kind}-${index}`);
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

  const sequenceColumn = assessments.sequence;
  const missingExtras = (["bonus", "malus"] as const).filter((kind) => !assessments[kind]);

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

          {!sequenceColumn ? (
            <EmptyState
              title={t("createColumnTitle")}
              description={t("createColumnDescription")}
              action={
                editable ? (
                  <Button
                    type="button"
                    loading={creating === "sequence"}
                    disabled={creating !== null}
                    leadingIcon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() => void onCreateColumn("sequence")}
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
                    {sequenceColumn.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                    {t("pendingHint")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {editable
                    ? missingExtras.map((kind) => (
                        <Button
                          key={kind}
                          type="button"
                          size="sm"
                          variant="secondary"
                          loading={creating === kind}
                          disabled={creating !== null || saving}
                          leadingIcon={<Plus className="size-3.5" aria-hidden />}
                          onClick={() => void onCreateColumn(kind)}
                        >
                          {kind === "bonus" ? t("addBonus") : t("addMalus")}
                        </Button>
                      ))
                    : null}
                  <span className="text-[11px] text-[var(--ios-secondary-label)]">
                    {dirtyCount > 0 ? t("dirty", { count: dirtyCount }) : t("saved")}
                  </span>
                  {editable ? (
                    <Button
                      type="button"
                      size="sm"
                      loading={saving}
                      disabled={dirtyCount === 0}
                      leadingIcon={<Save className="size-3.5" aria-hidden />}
                      onClick={() => void onSave()}
                    >
                      {saving ? t("saving") : t("save")}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_42%,var(--ios-card))]">
                      <th className={cn(th, "w-14 text-center")}>{t("table.number")}</th>
                      <th className={th}>{t("table.names")}</th>
                      <th className={cn(th, "w-16 text-center")}>{t("table.sex")}</th>
                      <th className={cn(th, "w-28 text-center")}>{t("table.comp")}</th>
                      <th className={cn(th, "w-44")}>{t("table.status")}</th>
                      {assessments.bonus ? (
                        <th className={cn(th, "w-24 text-center")}>
                          {t("table.bonus")}
                          <span className="block text-[9px] font-normal normal-case tracking-normal">
                            {t("table.maxPoints", {
                              max: formatMark(assessments.bonus.maxScore, locale, 0),
                            })}
                          </span>
                        </th>
                      ) : null}
                      {assessments.malus ? (
                        <th className={cn(th, "w-24 text-center")}>
                          {t("table.malus")}
                          <span className="block text-[9px] font-normal normal-case tracking-normal">
                            {t("table.maxPoints", {
                              max: formatMark(assessments.malus.maxScore, locale, 0),
                            })}
                          </span>
                        </th>
                      ) : null}
                      <th className={cn(th, "w-28 text-center")}>{t("table.sequenceMark")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((line, index) => {
                      const seqDraft = draftOf(sequenceColumn.id, line.studentId);
                      const seqKey = draftKey(sequenceColumn.id, line.studentId);
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
                              id={`mark-input-sequence-${index}`}
                              inputMode="decimal"
                              autoComplete="off"
                              aria-label={`${t("table.comp")} — ${line.studentLabel}`}
                              className="mx-auto h-9 w-24 text-center tabular-nums"
                              placeholder="—"
                              value={seqDraft.value}
                              invalid={errors[seqKey]}
                              disabled={!editable || saving || seqDraft.status !== "SCORED"}
                              onChange={(event) =>
                                updateDraft(sequenceColumn.id, line.studentId, {
                                  value: event.target.value,
                                })
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  focusCell("sequence", index + 1);
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-1.5">
                            <Select
                              aria-label={`${t("table.status")} — ${line.studentLabel}`}
                              className="h-9"
                              value={seqDraft.status}
                              disabled={!editable || saving}
                              onChange={(event) =>
                                updateDraft(sequenceColumn.id, line.studentId, {
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
                          {(["bonus", "malus"] as const).map((kind) => {
                            const assessment = assessments[kind];
                            if (!assessment) return null;
                            const draft = draftOf(assessment.id, line.studentId);
                            const key = draftKey(assessment.id, line.studentId);
                            return (
                              <td key={kind} className="px-3 py-1.5 text-center">
                                <Input
                                  id={`mark-input-${kind}-${index}`}
                                  inputMode="decimal"
                                  autoComplete="off"
                                  aria-label={`${t(`table.${kind}`)} — ${line.studentLabel}`}
                                  className="mx-auto h-9 w-20 text-center tabular-nums"
                                  placeholder="—"
                                  value={draft.value}
                                  invalid={errors[key]}
                                  disabled={!editable || saving}
                                  onChange={(event) =>
                                    updateDraft(assessment.id, line.studentId, {
                                      value: event.target.value,
                                      status: "SCORED",
                                    })
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                      event.preventDefault();
                                      focusCell(kind, index + 1);
                                    }
                                  }}
                                />
                              </td>
                            );
                          })}
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
                <p className="mt-0.5 text-[11px] text-[var(--ios-secondary-label)]">
                  {t("bonusMalusHint")}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

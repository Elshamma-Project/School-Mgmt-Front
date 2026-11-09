"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { GroupedList, GroupedListItem } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { academicDetailPath } from "@/lib/academic/tabs";
import {
  createClassSubject,
  deactivateClassSubject,
  listClassSubjects,
  listSubjectGroups,
  listSubjects,
  localizedLabel,
  reactivateClassSubject,
  updateClassSubject,
  type ClassSubjectResponse,
  type SubjectGroupResponse,
  type SubjectResponse,
} from "@/lib/api/academic";
import { listStaff, type StaffResponse } from "@/lib/api/staff";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type ClassSubjectAssignmentsProps = {
  classId: string;
  academicYearId: string;
  schoolId?: string | null;
  workspaceHome: `/${string}`;
  canManage: boolean;
};

type Draft = {
  id?: string;
  subjectId: string;
  groupId: string;
  coefficient: string;
  teacherId: string;
  weeklyHours: string;
  teachingLanguage: "" | "FR" | "EN";
  displayOrder: string;
  maxScore: string;
  countsInAverage: boolean;
  optional: boolean;
};

const emptyDraft = (): Draft => ({
  subjectId: "",
  groupId: "",
  coefficient: "1",
  teacherId: "",
  weeklyHours: "",
  teachingLanguage: "",
  displayOrder: "0",
  maxScore: "20",
  countsInAverage: true,
  optional: false,
});

export function ClassSubjectAssignments({
  classId,
  academicYearId,
  schoolId,
  workspaceHome,
  canManage,
}: ClassSubjectAssignmentsProps) {
  const t = useTranslations("academic");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [rows, setRows] = useState<ClassSubjectResponse[]>([]);
  const [subjects, setSubjects] = useState<SubjectResponse[]>([]);
  const [groups, setGroups] = useState<SubjectGroupResponse[]>([]);
  const [teachers, setTeachers] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<ClassSubjectResponse | null>(null);

  const subjectById = useMemo(() => {
    const map = new Map<string, SubjectResponse>();
    for (const s of subjects) map.set(s.id, s);
    return map;
  }, [subjects]);

  const groupById = useMemo(() => {
    const map = new Map<string, SubjectGroupResponse>();
    for (const g of groups) map.set(g.id, g);
    return map;
  }, [groups]);

  const teacherById = useMemo(() => {
    const map = new Map<string, StaffResponse>();
    for (const teacher of teachers) map.set(teacher.id, teacher);
    return map;
  }, [teachers]);

  const assignedSubjectIds = useMemo(
    () => new Set(rows.filter((r) => r.active).map((r) => r.subjectId)),
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [csPage, subjectsPage, groupsPage, staffPage] = await Promise.all([
        listClassSubjects({ classId, schoolId, size: 100, active: null }),
        listSubjects({ schoolId, size: 200, active: true }),
        listSubjectGroups({ schoolId, size: 100, active: true }),
        listStaff({ schoolId, size: 200, active: true, function: "TEACHER" }),
      ]);
      setRows(
        [...csPage.content].sort((a, b) => a.displayOrder - b.displayOrder || a.id.localeCompare(b.id)),
      );
      setSubjects(subjectsPage.content);
      setGroups(groupsPage.content);
      setTeachers(staffPage.content);
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [classId, schoolId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    const firstSubject =
      subjects.find((s) => s.active && !assignedSubjectIds.has(s.id)) ?? subjects[0];
    setDraft({
      ...emptyDraft(),
      subjectId: firstSubject?.id ?? "",
      groupId: groups[0]?.id ?? "",
      displayOrder: String(rows.length),
    });
    setFormError(null);
    setEditorOpen(true);
  }

  function openEdit(row: ClassSubjectResponse) {
    setDraft({
      id: row.id,
      subjectId: row.subjectId,
      groupId: row.groupId,
      coefficient: String(row.coefficient),
      teacherId: row.teacherId ?? "",
      weeklyHours: row.weeklyHours != null ? String(row.weeklyHours) : "",
      teachingLanguage: row.teachingLanguage ?? "",
      displayOrder: String(row.displayOrder),
      maxScore: String(row.maxScore),
      countsInAverage: row.countsInAverage,
      optional: row.optional,
    });
    setFormError(null);
    setEditorOpen(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!draft.subjectId || !draft.groupId) {
      setFormError(t("form.required"));
      return;
    }
    const coefficient = Number.parseFloat(draft.coefficient.replace(",", "."));
    if (!Number.isFinite(coefficient) || coefficient <= 0) {
      setFormError(t("classSubject.invalidCoefficient"));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (draft.id) {
        await updateClassSubject(
          draft.id,
          {
            groupId: draft.groupId,
            coefficient,
            teacherId: draft.teacherId.trim() || null,
            weeklyHours: draft.weeklyHours.trim()
              ? Number.parseInt(draft.weeklyHours, 10)
              : null,
            teachingLanguage: draft.teachingLanguage || null,
            displayOrder: Number.parseInt(draft.displayOrder, 10) || 0,
            maxScore: draft.maxScore.trim() || "20",
            countsInAverage: draft.countsInAverage,
            optional: draft.optional,
          },
          schoolId,
        );
      } else {
        await createClassSubject({
          academicYearId,
          classId,
          subjectId: draft.subjectId,
          groupId: draft.groupId,
          coefficient,
          teacherId: draft.teacherId.trim() || null,
          weeklyHours: draft.weeklyHours.trim()
            ? Number.parseInt(draft.weeklyHours, 10)
            : null,
          teachingLanguage: draft.teachingLanguage || null,
          displayOrder: Number.parseInt(draft.displayOrder, 10) || 0,
          maxScore: draft.maxScore.trim() || "20",
          countsInAverage: draft.countsInAverage,
          optional: draft.optional,
          schoolId,
        });
      }
      setEditorOpen(false);
      notify.success(t("classSubject.saved"));
      await load();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) setFormError(error.message);
      else setFormError(t("classSubject.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function onToggle() {
    if (!pendingToggle) return;
    try {
      if (pendingToggle.active) {
        await deactivateClassSubject(pendingToggle.id, schoolId);
        notify.success(t("classSubject.deactivated"));
      } else {
        await reactivateClassSubject(pendingToggle.id, schoolId);
        notify.success(t("classSubject.reactivated"));
      }
      setPendingToggle(null);
      await load();
    } catch (error) {
      if (isAuthFailure(error)) return;
      if (error instanceof ApiError) notify.error(error.message);
      else notify.error(t("actionError"));
    }
  }

  const subjectLabel = (row: ClassSubjectResponse) => {
    const subject = subjectById.get(row.subjectId);
    return subject ? localizedLabel(subject.name, locale) : row.subjectId;
  };

  return (
    <>
      <GroupedList
        header={t("detail.subjectsSection")}
        footer={t("detail.classSubjectsHint")}
        className="lg:col-span-2"
      >
        {canManage ? (
          <GroupedListItem className="justify-end py-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              leadingIcon={<Plus className="size-3.5" aria-hidden />}
              onClick={openCreate}
              disabled={loading || subjects.length === 0 || groups.length === 0}
            >
              {t("classSubject.add")}
            </Button>
          </GroupedListItem>
        ) : null}

        {loading ? (
          <GroupedListItem className="block py-3">
            <div className="space-y-2">
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </GroupedListItem>
        ) : rows.length === 0 ? (
          <GroupedListItem className="block py-3">
            <p className="text-[var(--text-subhead)] text-[var(--ios-secondary-label)]">
              {t("detail.subjectsEmpty")}
            </p>
          </GroupedListItem>
        ) : (
          rows.map((row) => {
            const subject = subjectById.get(row.subjectId);
            const group = groupById.get(row.groupId);
            const teacher = row.teacherId ? teacherById.get(row.teacherId) : null;
            const meta = [
              subject?.code,
              group ? localizedLabel(group.name, locale) : null,
              `×${row.coefficient}`,
              row.weeklyHours != null ? `${row.weeklyHours}h` : null,
              teacher?.fullName ?? (row.teacherId ? t("classSubject.teacherUnknown") : t("classSubject.noTeacher")),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <GroupedListItem key={row.id} className="items-start py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {subject ? (
                      <Link
                        href={academicDetailPath(
                          workspaceHome,
                          "subjects",
                          localizedLabel(subject.name, "fr"),
                          subject.id,
                        )}
                        className="text-[var(--text-body)] font-medium text-[var(--ios-label)] hover:underline"
                      >
                        {subjectLabel(row)}
                      </Link>
                    ) : (
                      <span className="text-[var(--text-body)] font-medium text-[var(--ios-label)]">
                        {subjectLabel(row)}
                      </span>
                    )}
                    <Badge tone={row.active ? "success" : "neutral"}>
                      {row.active ? t("statusActive") : t("inactive")}
                    </Badge>
                    {row.optional ? <Badge tone="neutral">{t("classSubject.optional")}</Badge> : null}
                    {!row.countsInAverage ? (
                      <Badge tone="neutral">{t("classSubject.notInAverage")}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[var(--text-footnote)] text-[var(--ios-secondary-label)]">
                    {meta}
                  </p>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      leadingIcon={<Pencil className="size-3.5" aria-hidden />}
                      onClick={() => openEdit(row)}
                      aria-label={t("actionEdit")}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      leadingIcon={
                        row.active ? (
                          <PowerOff className="size-3.5" aria-hidden />
                        ) : (
                          <Power className="size-3.5" aria-hidden />
                        )
                      }
                      onClick={() => setPendingToggle(row)}
                      aria-label={row.active ? t("actionDeactivate") : t("actionReactivate")}
                    />
                  </div>
                ) : null}
              </GroupedListItem>
            );
          })
        )}
      </GroupedList>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-4 sm:items-center">
          <form
            onSubmit={(e) => void onSave(e)}
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-xl)] bg-[var(--ios-card)] shadow-[var(--ios-shadow-md)]"
          >
            <div className="border-b border-[var(--ios-separator)]/55 px-5 py-4">
              <h2 className="text-[17px] font-semibold text-[var(--ios-label)]">
                {draft.id ? t("classSubject.editTitle") : t("classSubject.addTitle")}
              </h2>
              <p className="mt-1 text-[12px] text-[var(--ios-secondary-label)]">
                {t("classSubject.formHint")}
              </p>
            </div>
            <div className="space-y-4 px-5 py-5">
              <Field id="cs-subject" label={t("tabs.subjects")}>
                <Select
                  id="cs-subject"
                  value={draft.subjectId}
                  disabled={Boolean(draft.id)}
                  onChange={(e) => setDraft((d) => ({ ...d, subjectId: e.target.value }))}
                >
                  {subjects
                    .filter((s) => s.active || s.id === draft.subjectId)
                    .filter((s) => !assignedSubjectIds.has(s.id) || s.id === draft.subjectId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} — {localizedLabel(s.name, locale)}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field id="cs-group" label={t("tabs.groups")}>
                <Select
                  id="cs-group"
                  value={draft.groupId}
                  onChange={(e) => setDraft((d) => ({ ...d, groupId: e.target.value }))}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.code} — {localizedLabel(g.name, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="cs-coef" label={t("classSubject.coefficient")}>
                  <Input
                    id="cs-coef"
                    inputMode="decimal"
                    value={draft.coefficient}
                    onChange={(e) => setDraft((d) => ({ ...d, coefficient: e.target.value }))}
                  />
                </Field>
                <Field id="cs-hours" label={t("classSubject.weeklyHours")}>
                  <Input
                    id="cs-hours"
                    type="number"
                    min={0}
                    value={draft.weeklyHours}
                    onChange={(e) => setDraft((d) => ({ ...d, weeklyHours: e.target.value }))}
                  />
                </Field>
              </div>
              <Field id="cs-teacher" label={t("classSubject.teacher")}>
                <Select
                  id="cs-teacher"
                  value={draft.teacherId}
                  onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}
                >
                  <option value="">{t("classSubject.noTeacher")}</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="cs-lang" label={t("fields.teachingLanguage")}>
                  <Select
                    id="cs-lang"
                    value={draft.teachingLanguage}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        teachingLanguage: e.target.value as "" | "FR" | "EN",
                      }))
                    }
                  >
                    <option value="">{t("fields.teachingLanguageAny")}</option>
                    <option value="FR">FR</option>
                    <option value="EN">EN</option>
                  </Select>
                </Field>
                <Field id="cs-order" label={t("fields.displayOrder")}>
                  <Input
                    id="cs-order"
                    type="number"
                    value={draft.displayOrder}
                    onChange={(e) => setDraft((d) => ({ ...d, displayOrder: e.target.value }))}
                  />
                </Field>
                <Field id="cs-max" label={t("classSubject.maxScore")}>
                  <Input
                    id="cs-max"
                    inputMode="decimal"
                    value={draft.maxScore}
                    onChange={(e) => setDraft((d) => ({ ...d, maxScore: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 text-[13px] text-[var(--ios-label)]">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.countsInAverage}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, countsInAverage: e.target.checked }))
                    }
                  />
                  {t("classSubject.countsInAverage")}
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.optional}
                    onChange={(e) => setDraft((d) => ({ ...d, optional: e.target.checked }))}
                  />
                  {t("classSubject.optional")}
                </label>
              </div>
              {formError ? (
                <p className="text-[12px] text-[var(--ios-danger)]" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--ios-separator)]/55 px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditorOpen(false)}
                disabled={saving}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingToggle)}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
        title={
          pendingToggle?.active
            ? t("classSubject.deactivateTitle")
            : t("classSubject.reactivateTitle")
        }
        description={
          pendingToggle?.active
            ? t("classSubject.deactivateDescription", {
                name: pendingToggle ? subjectLabel(pendingToggle) : "",
              })
            : t("classSubject.reactivateDescription", {
                name: pendingToggle ? subjectLabel(pendingToggle) : "",
              })
        }
        confirmLabel={
          pendingToggle?.active ? t("actionDeactivate") : t("actionReactivate")
        }
        cancelLabel={tCommon("cancel")}
        tone={pendingToggle?.active ? "destructive" : "default"}
        onConfirm={() => void onToggle()}
      />
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ClassSubjectResponse,
  RoomResponse,
  SchoolClassResponse,
  SubjectResponse,
} from "@/lib/api/academic";
import type { StaffResponse } from "@/lib/api/staff";
import type {
  ActivityType,
  DayOfWeek,
  EntryKind,
  TimetableEntryResponse,
  UpsertTimetableEntryRequest,
} from "@/lib/api/timetable";
import { resolveLocalized } from "@/lib/timetable/format";

const ACTIVITY_TYPES: ActivityType[] = [
  "CLUB",
  "LIBRARY",
  "MUSIC",
  "CHINESE",
  "GENERAL_CLEANING",
  "STUDY_HALL",
  "OTHER",
];

export type EntryDialogSeed = {
  day: DayOfWeek;
  startPeriod: number | null;
  classId: string;
  entry?: TimetableEntryResponse | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed: EntryDialogSeed | null;
  canEdit: boolean;
  classes: SchoolClassResponse[];
  classSubjects: ClassSubjectResponse[];
  subjects: SubjectResponse[];
  teachers: StaffResponse[];
  rooms: RoomResponse[];
  saving: boolean;
  onSave: (payload: UpsertTimetableEntryRequest, entryId?: string) => Promise<void>;
  onDelete?: (entryId: string) => Promise<void>;
  /** Enseignant : ouvrir une demande de modification (BR-67). */
  onRequestChange?: (entry: TimetableEntryResponse) => void;
};

export function TimetableEntryDialog({
  open,
  onOpenChange,
  seed,
  canEdit,
  classes,
  classSubjects,
  subjects,
  teachers,
  rooms,
  saving,
  onSave,
  onDelete,
  onRequestChange,
}: Props) {
  const t = useTranslations("timetableHub");
  const locale = useLocale();
  const entry = seed?.entry ?? null;
  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);

  const [kind, setKind] = useState<EntryKind>("LESSON");
  const [classId, setClassId] = useState("");
  const [day, setDay] = useState<DayOfWeek>("MONDAY");
  const [startPeriod, setStartPeriod] = useState("1");
  const [periodCount, setPeriodCount] = useState("1");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [subjectLabel, setSubjectLabel] = useState("");
  const [teacherLabel, setTeacherLabel] = useState("");
  const [optionGroupCode, setOptionGroupCode] = useState("");
  const [optionCode, setOptionCode] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("OTHER");
  const [note, setNote] = useState("");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (!seed) return;
    setKind(entry?.kind ?? "LESSON");
    setClassId(entry?.classId ?? seed.classId);
    setDay(entry?.day ?? seed.day);
    setStartPeriod(String(entry?.startPeriod ?? seed.startPeriod ?? 1));
    setPeriodCount(String(entry?.periodCount ?? 1));
    setClassSubjectId(entry?.classSubjectIds?.[0] ?? "");
    setTeacherId(entry?.teacherId ?? "");
    setRoomId(entry?.roomId ?? "");
    setSubjectLabel(entry?.subjectLabel ?? "");
    setTeacherLabel(entry?.teacherLabel ?? "");
    setOptionGroupCode(entry?.optionGroupCode ?? "");
    setOptionCode(entry?.optionCode ?? "");
    setActivityType(entry?.activityType ?? "OTHER");
    setNote(entry?.note ?? "");
    setUseCustom(Boolean(entry?.customStart && entry?.customEnd) || seed.startPeriod == null);
    setCustomStart(entry?.customStart?.slice(0, 5) ?? "");
    setCustomEnd(entry?.customEnd?.slice(0, 5) ?? "");
  }, [seed, entry]);

  const subjectsForClass = useMemo(
    () => classSubjects.filter((cs) => cs.classId === classId && cs.active),
    [classSubjects, classId],
  );

  const subjectOptionLabel = (cs: ClassSubjectResponse) => {
    const subject = subjectById.get(cs.subjectId);
    return (
      resolveLocalized(subject?.name ?? null, locale) ||
      subject?.timetableAlias ||
      subject?.code ||
      cs.subjectId
    );
  };

  const onClassSubjectChange = (id: string) => {
    setClassSubjectId(id);
    const cs = subjectsForClass.find((x) => x.id === id);
    if (!cs) return;
    if (!subjectLabel.trim()) setSubjectLabel(subjectOptionLabel(cs));
    if (cs.teacherId) {
      setTeacherId(cs.teacherId);
      const teacher = teachers.find((x) => x.id === cs.teacherId);
      if (teacher && !teacherLabel.trim()) setTeacherLabel(teacher.fullName);
    }
  };

  const buildPayload = (): UpsertTimetableEntryRequest => {
    const payload: UpsertTimetableEntryRequest = {
      classId,
      day,
      kind,
      periodCount: Math.max(1, Number(periodCount) || 1),
      classSubjectIds: kind === "LESSON" && classSubjectId ? [classSubjectId] : [],
      teacherId: teacherId || null,
      roomId: roomId || null,
      subjectLabel: subjectLabel.trim() || null,
      teacherLabel: teacherLabel.trim() || null,
      optionGroupCode: optionGroupCode.trim() || null,
      optionCode: optionCode.trim(),
      note: note.trim() || null,
      activityType: kind === "ACTIVITY" ? activityType : null,
    };
    if (useCustom) {
      payload.startPeriod = null;
      payload.customStart = customStart.length === 5 ? `${customStart}:00` : customStart;
      payload.customEnd = customEnd.length === 5 ? `${customEnd}:00` : customEnd;
    } else {
      payload.startPeriod = Number(startPeriod) || 1;
      payload.customStart = null;
      payload.customEnd = null;
    }
    return payload;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? t("entry.editTitle") : t("entry.createTitle")}
      description={canEdit ? t("entry.description") : t("entry.readOnly")}
      size="lg"
      actionsLayout="row"
      actions={[
        ...(canEdit && entry && onDelete
          ? [
              {
                label: t("entry.delete"),
                variant: "destructive" as const,
                onClick: () => {
                  void onDelete(entry.id);
                },
              },
            ]
          : []),
        { label: t("actions.cancel"), variant: "cancel", onClick: () => onOpenChange(false) },
        ...(!canEdit && entry && onRequestChange
          ? [
              {
                label: t("actions.requestChange"),
                onClick: () => onRequestChange(entry),
                autoFocus: true,
              },
            ]
          : []),
        ...(canEdit
          ? [
              {
                label: saving ? t("actions.saving") : t("actions.save"),
                onClick: () => {
                  void onSave(buildPayload(), entry?.id);
                },
                autoFocus: true,
              },
            ]
          : []),
      ]}
    >
      <div className="grid max-h-[min(60vh,480px)] gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entry.class")}>
            <Select value={classId} disabled={!canEdit} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("entry.kind")}>
            <Select
              value={kind}
              disabled={!canEdit}
              onChange={(e) => setKind(e.target.value as EntryKind)}
            >
              <option value="LESSON">{t("entry.kindLesson")}</option>
              <option value="ACTIVITY">{t("entry.kindActivity")}</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entry.day")}>
            <Select
              value={day}
              disabled={!canEdit}
              onChange={(e) => setDay(e.target.value as DayOfWeek)}
            >
              {(
                ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as DayOfWeek[]
              ).map((d) => (
                <option key={d} value={d}>
                  {t(`days.${d}`)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("entry.slotMode")}>
            <Select
              value={useCustom ? "custom" : "period"}
              disabled={!canEdit}
              onChange={(e) => setUseCustom(e.target.value === "custom")}
            >
              <option value="period">{t("entry.slotPeriod")}</option>
              <option value="custom">{t("entry.slotCustom")}</option>
            </Select>
          </Field>
        </div>

        {useCustom ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("entry.customStart")}>
              <Input
                type="time"
                value={customStart}
                disabled={!canEdit}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </Field>
            <Field label={t("entry.customEnd")}>
              <Input
                type="time"
                value={customEnd}
                disabled={!canEdit}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("entry.startPeriod")}>
              <Input
                type="number"
                min={1}
                max={8}
                value={startPeriod}
                disabled={!canEdit}
                onChange={(e) => setStartPeriod(e.target.value)}
              />
            </Field>
            <Field label={t("entry.periodCount")}>
              <Input
                type="number"
                min={1}
                max={8}
                value={periodCount}
                disabled={!canEdit}
                onChange={(e) => setPeriodCount(e.target.value)}
              />
            </Field>
          </div>
        )}

        {kind === "LESSON" ? (
          <Field label={t("entry.classSubject")}>
            <Select
              value={classSubjectId}
              disabled={!canEdit}
              onChange={(e) => onClassSubjectChange(e.target.value)}
            >
              <option value="">{t("entry.none")}</option>
              {subjectsForClass.map((cs) => (
                <option key={cs.id} value={cs.id}>
                  {subjectOptionLabel(cs)}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field label={t("entry.activityType")}>
            <Select
              value={activityType}
              disabled={!canEdit}
              onChange={(e) => setActivityType(e.target.value as ActivityType)}
            >
              {ACTIVITY_TYPES.map((a) => (
                <option key={a} value={a}>
                  {t(`activity.${a}`)}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entry.teacher")}>
            <Select
              value={teacherId}
              disabled={!canEdit}
              onChange={(e) => {
                setTeacherId(e.target.value);
                const teacher = teachers.find((x) => x.id === e.target.value);
                if (teacher) setTeacherLabel(teacher.fullName);
              }}
            >
              <option value="">{t("entry.none")}</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("entry.room")}>
            <Select value={roomId} disabled={!canEdit} onChange={(e) => setRoomId(e.target.value)}>
              <option value="">{t("entry.none")}</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entry.subjectLabel")}>
            <Input
              value={subjectLabel}
              disabled={!canEdit}
              onChange={(e) => setSubjectLabel(e.target.value)}
            />
          </Field>
          <Field label={t("entry.teacherLabel")}>
            <Input
              value={teacherLabel}
              disabled={!canEdit}
              onChange={(e) => setTeacherLabel(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field label={t("entry.optionGroup")}>
            <Input
              placeholder="LV2"
              value={optionGroupCode}
              disabled={!canEdit}
              onChange={(e) => setOptionGroupCode(e.target.value)}
            />
          </Field>
          <Field label={t("entry.optionCode")}>
            <Input
              placeholder="ALL / ESP"
              value={optionCode}
              disabled={!canEdit}
              onChange={(e) => setOptionCode(e.target.value)}
            />
          </Field>
        </div>

        <Field label={t("entry.note")}>
          <Textarea
            rows={2}
            value={note}
            disabled={!canEdit}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Dialog>
  );
}

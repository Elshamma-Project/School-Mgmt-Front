"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createTimetableChangeRequest,
  type TimetableChangeKind,
  type TimetableChangeRequestResponse,
  type TimetableEntryResponse,
} from "@/lib/api/timetable";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId?: string | null;
  timetableId: string;
  entry: TimetableEntryResponse | null;
  classLabel?: string | null;
  onCreated?: (row: TimetableChangeRequestResponse) => void;
};

function entryToProposed(entry: TimetableEntryResponse) {
  return {
    classId: entry.classId,
    day: entry.day,
    startPeriod: entry.startPeriod,
    periodCount: entry.periodCount,
    customStart: entry.customStart,
    customEnd: entry.customEnd,
    kind: entry.kind,
    classSubjectIds: entry.classSubjectIds,
    subjectId: entry.subjectId,
    teacherId: entry.teacherId,
    roomId: entry.roomId,
    activityType: entry.activityType,
    sessionGroupId: entry.sessionGroupId,
    optionGroupCode: entry.optionGroupCode,
    optionCode: entry.optionCode,
    label: entry.label,
    note: entry.note,
    subjectLabel: entry.subjectLabel,
    teacherLabel: entry.teacherLabel,
  };
}

/** Dialogue enseignant : proposer une modification de créneau (BR-67). */
export function TimetableChangeDialog({
  open,
  onOpenChange,
  schoolId,
  timetableId,
  entry,
  classLabel,
  onCreated,
}: Props) {
  const t = useTranslations("teacherTimetable.changeRequest");
  const [kind, setKind] = useState<TimetableChangeKind>("UPDATE");
  const [reason, setReason] = useState("");
  const [proposedNote, setProposedNote] = useState("");
  const [invalidReason, setInvalidReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !entry) return;
    setKind("UPDATE");
    setReason("");
    setProposedNote(entry.note ?? "");
    setInvalidReason(false);
    setSubmitting(false);
  }, [open, entry]);

  const submit = async () => {
    if (!entry) return;
    const trimmed = reason.trim();
    if (trimmed.length < 15) {
      setInvalidReason(true);
      notify.error(t("reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const proposed = {
        ...entryToProposed(entry),
        note: proposedNote.trim() || null,
      };
      const row = await createTimetableChangeRequest({
        sourceTimetableId: timetableId,
        sourceEntryId: entry.id,
        changeKind: kind,
        proposed,
        reason: trimmed,
        classLabel: classLabel ?? null,
        teacherLabel: entry.teacherLabel,
        schoolId: schoolId ?? null,
      });
      notify.success(t("success"));
      onCreated?.(row);
      onOpenChange(false);
    } catch (error) {
      if (isAuthFailure(error)) return;
      notify.error(error instanceof ApiError && error.message ? error.message : t("error"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      size="md"
      actions={[
        { label: t("cancel"), variant: "cancel", onClick: () => onOpenChange(false) },
        {
          label: submitting ? t("submitting") : t("submit"),
          onClick: () => {
            void submit();
          },
          autoFocus: true,
        },
      ]}
    >
      <div className="grid gap-3">
        <p className="text-[13px] text-[var(--ios-secondary-label)]">
          {entry?.subjectLabel || entry?.teacherLabel
            ? t("slotSummary", {
                subject: entry?.subjectLabel || "—",
                day: entry?.day ?? "",
                slot: entry?.slotKey ?? "",
              })
            : null}
        </p>
        <Field label={t("kind")}>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as TimetableChangeKind)}
          >
            <option value="UPDATE">{t("kinds.UPDATE")}</option>
            <option value="REMOVE">{t("kinds.REMOVE")}</option>
          </Select>
        </Field>
        {kind === "UPDATE" ? (
          <Field label={t("proposedNote")}>
            <Textarea
              rows={2}
              value={proposedNote}
              onChange={(e) => setProposedNote(e.target.value)}
              placeholder={t("proposedNoteHint")}
            />
          </Field>
        ) : null}
        <Field label={t("reason")} error={invalidReason ? t("reasonRequired") : undefined}>
          <Textarea
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (invalidReason && e.target.value.trim().length >= 15) setInvalidReason(false);
            }}
            placeholder={t("reasonHint")}
          />
        </Field>
      </div>
    </Dialog>
  );
}

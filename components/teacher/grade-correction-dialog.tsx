"use client";

import { useRef, useState } from "react";
import { Camera, FileUp, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createGradeCorrectionRequest,
  type GradeCorrectionRequestResponse,
} from "@/lib/api/grading";
import { parseMarkInput } from "@/lib/grading/marks";
import { notify } from "@/lib/ui/notify";
import { ApiError, isAuthFailure } from "@/types/api";

type EvidenceDraft = {
  fileName: string;
  contentType: string;
  base64Data: string;
  previewUrl?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId?: string | null;
  sessionId: string;
  classSubjectId: string;
  studentId: string;
  studentLabel: string;
  currentMarkLabel: string;
  onCreated?: (row: GradeCorrectionRequestResponse) => void;
};

const MAX_FILES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);

async function fileToDraft(file: File): Promise<EvidenceDraft> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("TYPE");
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("SIZE");
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  const base64Data = btoa(binary);
  const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
  return {
    fileName: file.name || "evidence",
    contentType: file.type,
    base64Data,
    previewUrl,
  };
}

/** Dialogue enseignant : proposer une correction après clôture (BR-80). */
export function GradeCorrectionDialog({
  open,
  onOpenChange,
  schoolId,
  sessionId,
  classSubjectId,
  studentId,
  studentLabel,
  currentMarkLabel,
  onCreated,
}: Props) {
  const t = useTranslations("teacherGrades.correction");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [invalidMark, setInvalidMark] = useState(false);
  const [invalidReason, setInvalidReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setValue("");
    setReason("");
    setEvidence((prev) => {
      for (const item of prev) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
    setInvalidMark(false);
    setInvalidReason(false);
  };

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    try {
      const next = [...evidence];
      for (const file of Array.from(list)) {
        if (next.length >= MAX_FILES) break;
        next.push(await fileToDraft(file));
      }
      setEvidence(next);
    } catch (error) {
      if (error instanceof Error && error.message === "TYPE") notify.error(t("evidenceType"));
      else if (error instanceof Error && error.message === "SIZE") notify.error(t("evidenceSize"));
      else notify.error(t("evidenceError"));
    }
  };

  const submit = async () => {
    const parsed = parseMarkInput(value, 20);
    const reasonOk = reason.trim().length >= 15;
    setInvalidMark(!parsed.ok || parsed.value === null);
    setInvalidReason(!reasonOk);
    if (!parsed.ok || parsed.value === null || !reasonOk) {
      notify.error(t("validationError"));
      return;
    }
    setSubmitting(true);
    try {
      const created = await createGradeCorrectionRequest({
        sessionId,
        classSubjectId,
        studentId,
        reason: reason.trim(),
        proposedValue: parsed.value,
        proposedStatus: "SCORED",
        evidence: evidence.map(({ fileName, contentType, base64Data }) => ({
          fileName,
          contentType,
          base64Data,
        })),
        schoolId,
      });
      notify.success(t("success"));
      onCreated?.(created);
      reset();
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
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title={t("title")}
      description={t("description", { name: studentLabel, current: currentMarkLabel || "—" })}
      actions={[
        {
          label: t("cancel"),
          variant: "cancel",
          onClick: () => onOpenChange(false),
        },
        {
          label: submitting ? t("submitting") : t("submit"),
          onClick: () => void submit(),
          autoFocus: true,
        },
      ]}
    >
      <div className="space-y-3.5 text-left">
        <div className="space-y-1.5">
          <Label htmlFor="correction-mark">{t("newMark")}</Label>
          <Input
            id="correction-mark"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0–20"
            value={value}
            invalid={invalidMark}
            onChange={(event) => {
              setValue(event.target.value);
              setInvalidMark(false);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="correction-reason">{t("reason")}</Label>
          <Textarea
            id="correction-reason"
            rows={3}
            value={reason}
            invalid={invalidReason}
            placeholder={t("reasonPlaceholder")}
            onChange={(event) => {
              setReason(event.target.value);
              setInvalidReason(false);
            }}
          />
          <p className="text-[11px] text-[var(--ios-secondary-label)]">{t("reasonHint")}</p>
        </div>
        <div className="space-y-2">
          <p className="text-[12px] font-medium text-[var(--ios-label)]">{t("evidence")}</p>
          <p className="text-[11px] text-[var(--ios-secondary-label)]">{t("evidenceHint")}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--ios-fill)] px-3 text-[12px] font-semibold text-[var(--ios-label)]"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="size-3.5" aria-hidden />
              {t("addFile")}
            </button>
            <button
              type="button"
              className="pressable inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--ios-fill)] px-3 text-[12px] font-semibold text-[var(--ios-label)]"
              onClick={() => cameraRef.current?.click()}
            >
              <Camera className="size-3.5" aria-hidden />
              {t("capture")}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
          {evidence.length > 0 ? (
            <ul className="space-y-1.5">
              {evidence.map((item, index) => (
                <li
                  key={`${item.fileName}-${index}`}
                  className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--ios-fill)]/70 px-2.5 py-1.5"
                >
                  {item.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="size-9 rounded object-cover"
                    />
                  ) : (
                    <span className="flex size-9 items-center justify-center rounded bg-[var(--ios-card)] text-[10px] font-semibold">
                      PDF
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[12px] text-[var(--ios-label)]">
                    {item.fileName}
                  </span>
                  <button
                    type="button"
                    className="pressable inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--ios-danger)]"
                    aria-label={t("removeEvidence")}
                    onClick={() =>
                      setEvidence((prev) => {
                        const copy = [...prev];
                        const [removed] = copy.splice(index, 1);
                        if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
                        return copy;
                      })
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <p className="text-[11px] leading-snug text-[var(--ios-secondary-label)]">{t("directorOnly")}</p>
      </div>
    </Dialog>
  );
}

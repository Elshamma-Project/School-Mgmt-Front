"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { Camera, FilePenLine, FileUp, Trash2, X } from "lucide-react";
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
import { cn } from "@/lib/utils/cn";
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
  const cameraFallbackRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<EvidenceDraft[]>([]);
  const [invalidMark, setInvalidMark] = useState(false);
  const [invalidReason, setInvalidReason] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const dragDepth = useRef(0);

  const stopCamera = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
    setCameraBusy(false);
  }, []);

  useEffect(() => {
    if (!open) stopCamera();
    return () => stopCamera();
  }, [open, stopCamera]);

  const reset = () => {
    stopCamera();
    setValue("");
    setReason("");
    setEvidence((prev) => {
      for (const item of prev) if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return [];
    });
    setInvalidMark(false);
    setInvalidReason(false);
  };

  const openCamera = async () => {
    if (evidence.length >= MAX_FILES) {
      notify.info(t("evidenceMax"));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraFallbackRef.current?.click();
      return;
    }
    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      notify.error(t("cameraError"));
      cameraFallbackRef.current?.click();
    } finally {
      setCameraBusy(false);
    }
  };

  const addFiles = async (list: FileList | File[] | null) => {
    if (!list || list.length === 0) return;
    try {
      const next = [...evidence];
      for (const file of Array.from(list)) {
        if (next.length >= MAX_FILES) break;
        next.push(await fileToDraft(file));
      }
      setEvidence(next);
      if (Array.from(list).length > 0 && next.length >= MAX_FILES) {
        notify.info(t("evidenceMax"));
      }
    } catch (error) {
      if (error instanceof Error && error.message === "TYPE") notify.error(t("evidenceType"));
      else if (error instanceof Error && error.message === "SIZE") notify.error(t("evidenceSize"));
      else notify.error(t("evidenceError"));
    }
  };

  useEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [cameraOpen]);

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0) {
      notify.error(t("cameraError"));
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      notify.error(t("cameraError"));
      return;
    }
    ctx.drawImage(video, 0, 0);
    setCameraBusy(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.92),
      );
      if (!blob) {
        notify.error(t("cameraError"));
        return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const file = new File([blob], `photo-${stamp}.jpg`, { type: "image/jpeg" });
      await addFiles([file]);
      stopCamera();
    } catch {
      notify.error(t("cameraError"));
    } finally {
      setCameraBusy(false);
    }
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    if (event.dataTransfer.types.includes("Files")) setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    void addFiles(event.dataTransfer.files);
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

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("title")}
      description={t("description", { name: studentLabel, current: currentMarkLabel || "—" })}
      size="lg"
      icon={<FilePenLine className="size-6 stroke-[1.75]" aria-hidden />}
      actions={[
        {
          label: t("cancel"),
          variant: "cancel",
          onClick: () => onOpenChange(false),
        },
        {
          label: submitting ? t("submitting") : t("submit"),
          onClick: () => void submit(),
        },
      ]}
    >
      <div className="mx-auto w-full max-w-md space-y-4 text-left">
        <div className="mx-auto w-full max-w-[140px] space-y-1.5">
          <Label htmlFor="correction-mark" className="block text-center">
            {t("newMark")}
          </Label>
          <Input
            id="correction-mark"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            placeholder="0–20"
            className="text-center text-[15px] font-semibold tabular-nums"
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
          <div className="space-y-0.5 text-center sm:text-left">
            <p className="text-[12px] font-medium text-[var(--ios-label)]">{t("evidence")}</p>
            <p className="text-[11px] text-[var(--ios-secondary-label)]">{t("evidenceHint")}</p>
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label={t("dropZoneAria")}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                fileRef.current?.click();
              }
            }}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            onDragOver={onDragOver}
            onDrop={onDrop}
            className={cn(
              "rounded-[var(--radius-md)] border border-dashed px-3 py-3.5 text-center transition-[background-color,border-color,box-shadow] sm:px-3.5 sm:py-4",
              dragging
                ? "border-[var(--ios-blue)] bg-[color-mix(in_srgb,var(--ios-blue)_10%,var(--ios-card))] shadow-[var(--focus-ring)]"
                : "border-[var(--ios-separator)] bg-[color-mix(in_srgb,var(--ios-fill)_40%,var(--ios-card))] hover:border-[color-mix(in_srgb,var(--ios-blue)_35%,var(--ios-separator))] hover:bg-[var(--ios-fill)]/70",
            )}
          >
            <FileUp
              className={cn(
                "mx-auto size-5 stroke-[1.75]",
                dragging ? "text-[var(--ios-blue)]" : "text-[var(--ios-secondary-label)]",
              )}
              aria-hidden
            />
            <p
              className={cn(
                "mt-2 text-[12px] font-semibold",
                dragging ? "text-[var(--ios-blue)]" : "text-[var(--ios-label)]",
              )}
            >
              {dragging ? t("dropActive") : t("dropIdle")}
            </p>
            <p className="mt-1 text-[11px] text-[var(--ios-secondary-label)]">{t("dropHint")}</p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                className="pressable inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--ios-card)] px-3 text-[12px] font-semibold text-[var(--ios-label)] ring-1 ring-[var(--ios-separator)]/60"
                onClick={(event) => {
                  event.stopPropagation();
                  fileRef.current?.click();
                }}
              >
                <FileUp className="size-3.5" aria-hidden />
                {t("addFile")}
              </button>
              <button
                type="button"
                disabled={cameraBusy}
                className="pressable inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--ios-card)] px-3 text-[12px] font-semibold text-[var(--ios-label)] ring-1 ring-[var(--ios-separator)]/60 disabled:opacity-50"
                onClick={(event) => {
                  event.stopPropagation();
                  void openCamera();
                }}
              >
                <Camera className="size-3.5" aria-hidden />
                {cameraBusy && !cameraOpen ? t("cameraOpening") : t("capture")}
              </button>
            </div>
          </div>
          {cameraOpen ? (
            <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--ios-separator)]/60 bg-black">
              <div className="relative aspect-[4/3] w-full bg-black">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="absolute inset-0 size-full object-cover"
                />
                <button
                  type="button"
                  className="pressable absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label={t("cameraClose")}
                  onClick={stopCamera}
                >
                  <X className="size-4 stroke-[2]" aria-hidden />
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 bg-[color-mix(in_srgb,var(--ios-fill)_35%,#000)] px-3 py-2.5">
                <button
                  type="button"
                  disabled={cameraBusy}
                  className="pressable inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--ios-blue)] px-4 text-[12px] font-semibold text-white disabled:opacity-50"
                  onClick={() => void takePhoto()}
                >
                  <Camera className="size-3.5" aria-hidden />
                  {cameraBusy ? t("cameraCapturing") : t("cameraShot")}
                </button>
                <button
                  type="button"
                  className="pressable inline-flex h-10 items-center rounded-full bg-[var(--ios-card)] px-4 text-[12px] font-semibold text-[var(--ios-label)]"
                  onClick={stopCamera}
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          ) : null}
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
            ref={cameraFallbackRef}
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
        <p className="text-center text-[11px] leading-snug text-[var(--ios-secondary-label)]">
          {t("directorOnly")}
        </p>
      </div>
    </Dialog>
  );
}

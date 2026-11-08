"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { deleteAvatar, fetchAvatarBlob, uploadAvatar } from "@/lib/api/auth";
import { notify } from "@/lib/ui/notify";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { ApiError } from "@/types/api";

const MAX_BYTES = 512 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProfileAvatarProps = {
  className?: string;
};

/**
 * Photo de profil compte (UI). Jamais utilisée sur les bulletins.
 */
export function ProfileAvatar({ className }: ProfileAvatarProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const syncFromAccount = useAuthStore((s) => s.syncFromAccount);
  const updateUser = useAuthStore((s) => s.updateUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    async function load() {
      if (isMock || !user?.hasAvatar) {
        setPreviewUrl(null);
        return;
      }
      const blob = await fetchAvatarBlob();
      if (revoked) return;
      if (!blob) {
        setPreviewUrl(null);
        return;
      }
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }

    void load();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isMock, user?.hasAvatar, user?.id]);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ALLOWED.has(file.type)) {
      notify.error(t("avatarBadType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      notify.error(t("avatarTooLarge"));
      return;
    }

    if (isMock) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      updateUser({ hasAvatar: true });
      notify.success(t("avatarSaved"), { description: t("mockHint") });
      return;
    }

    setBusy(true);
    try {
      const account = await uploadAvatar(file);
      syncFromAccount(account);
      updateUser({ hasAvatar: true });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      notify.success(t("avatarSaved"));
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message);
      } else {
        notify.error(tAuth("networkError"));
      }
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (isMock) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      updateUser({ hasAvatar: false });
      notify.success(t("avatarRemoved"), { description: t("mockHint") });
      return;
    }
    setBusy(true);
    try {
      await deleteAvatar();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      updateUser({ hasAvatar: false });
      notify.success(t("avatarRemoved"));
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message);
      } else {
        notify.error(tAuth("networkError"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="pressable group relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)] focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={t("changeAvatar")}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="" className="size-full object-cover" />
          ) : (
            <UserRound className="size-9 stroke-[1.5]" aria-hidden />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Camera className="size-5 text-white stroke-[1.75]" aria-hidden />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void onFileChange(e)}
        />
      </div>
      <p className="max-w-[240px] text-center text-[var(--text-footnote)] leading-snug text-[var(--ios-secondary-label)]">
        {t("avatarHint")}
      </p>
      {previewUrl || user?.hasAvatar ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void onRemove()}
          className="pressable text-[var(--text-footnote)] font-medium text-[var(--ios-danger)] disabled:opacity-45"
        >
          {t("removeAvatar")}
        </button>
      ) : null}
    </div>
  );
}

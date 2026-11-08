"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/profile/user-avatar";
import { uploadAvatar } from "@/lib/api/auth";
import { publishAvatarUrl } from "@/lib/profile/avatar-cache";
import {
  compressImageFile,
  writeAvatarDataUrl,
} from "@/lib/profile/avatar-storage";
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
 * Met à jour le cache partagé → la sidebar se rafraîchit toute seule.
 */
export function ProfileAvatar({ className }: ProfileAvatarProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const syncFromAccount = useAuthStore((s) => s.syncFromAccount);
  const updateUser = useAuthStore((s) => s.updateUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user?.id) return;

    if (!ALLOWED.has(file.type)) {
      notify.error(t("avatarBadType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      notify.error(t("avatarTooLarge"));
      return;
    }

    if (isMock) {
      try {
        const dataUrl = await compressImageFile(file);
        writeAvatarDataUrl(user.id, dataUrl);
        publishAvatarUrl(user.id, dataUrl);
        updateUser({ hasAvatar: true });
        notify.success(t("avatarSaved"), { description: t("mockHint") });
      } catch {
        notify.error(t("avatarTooLarge"));
      }
      return;
    }

    setBusy(true);
    try {
      const account = await uploadAvatar(file);
      syncFromAccount(account);
      updateUser({ hasAvatar: true });
      const objectUrl = URL.createObjectURL(file);
      publishAvatarUrl(user.id, objectUrl);
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

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="pressable group relative flex size-20 items-center justify-center overflow-hidden rounded-full bg-[var(--ios-info-soft)] text-[var(--ios-blue)] focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={t("changeAvatar")}
        >
          <UserAvatar
            size="lg"
            className="size-20 bg-transparent"
            iconClassName="stroke-[1.5] text-[var(--ios-blue)]"
          />
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
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import {
  ensureAvatarUrl,
  peekAvatarUrl,
  subscribeAvatarCache,
} from "@/lib/profile/avatar-cache";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";

type UserAvatarProps = {
  className?: string;
  /** Classes de l’icône fallback. */
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizeBox = {
  sm: "size-8",
  md: "size-9",
  lg: "size-20",
} as const;

const sizeIcon = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-9",
} as const;

/**
 * Avatar compte (UI) — charge automatiquement la photo si présente.
 * Jamais utilisé sur les bulletins.
 */
export function UserAvatar({ className, iconClassName, size = "md" }: UserAvatarProps) {
  const user = useAuthStore((s) => s.user);
  const isMock = useAuthStore((s) => s.isMock);
  const userId = user?.id;
  const [url, setUrl] = useState<string | null>(() => peekAvatarUrl(userId));

  useEffect(() => {
    return subscribeAvatarCache(() => {
      setUrl(peekAvatarUrl(userId));
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void ensureAvatarUrl({
      userId,
      hasAvatar: user?.hasAvatar,
      isMock,
    }).then((next) => {
      if (cancelled) return;
      setUrl(next);
      const current = useAuthStore.getState().user;
      if (!current || current.id !== userId) return;
      // Aligne le drapeau local avec la réalité serveur (sidebar / profil).
      if (next && !current.hasAvatar) {
        useAuthStore.getState().updateUser({ hasAvatar: true });
      } else if (!next && current.hasAvatar) {
        useAuthStore.getState().updateUser({ hasAvatar: false });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isMock, userId]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        sizeBox[size],
        className,
      )}
      aria-hidden
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <UserRound
          className={cn(sizeIcon[size], "stroke-[1.75]", iconClassName)}
          aria-hidden
        />
      )}
    </span>
  );
}

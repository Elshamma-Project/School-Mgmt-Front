"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchUnreadNotificationCount } from "@/lib/api/notifications";
import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/stores/auth-store";
import { isAuthFailure } from "@/types/api";

/** Badge cloche dans le header — compteur de non-lus (poll léger). */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const schoolId = useAuthStore((s) => s.user?.schoolId);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchUnreadNotificationCount(schoolId));
    } catch (error) {
      if (isAuthFailure(error)) return;
      /* silencieux : le badge n’est pas critique */
    }
  }, [accessToken, schoolId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return (
    <Link
      href="/notifications"
      aria-label={count > 0 ? t("bellUnread", { count }) : t("bell")}
      title={count > 0 ? t("bellUnread", { count }) : t("bell")}
      className={cn(
        "pressable relative inline-flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]",
        "bg-[var(--ios-fill)] text-[var(--ios-label)] hover:bg-[var(--ios-fill-secondary)]",
        "focus-visible:shadow-[var(--focus-ring)]",
      )}
    >
      <Bell className="size-4 stroke-[1.75]" aria-hidden />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--ios-danger)] px-1 text-[9px] font-bold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

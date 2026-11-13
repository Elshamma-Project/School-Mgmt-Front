"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchUnreadNotificationCount } from "@/lib/api/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { isAuthFailure } from "@/types/api";

const EVENT = "smels:notifications-unread-changed";

/** Invalide les badges (après lecture / accusé, etc.). */
export function bumpUnreadNotificationCount() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

/** Compteur de notifications non lues (poll + refresh focus / événement). */
export function useUnreadNotificationCount() {
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
    }
  }, [accessToken, schoolId]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    const onBump = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener(EVENT, onBump);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(EVENT, onBump);
    };
  }, [refresh]);

  return count;
}

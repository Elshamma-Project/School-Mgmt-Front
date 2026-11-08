"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { syncAuthCookie, useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

/**
 * Sur /login : restaure la session après montage (pas au 1er rendu SSR).
 */
export function SessionRestorer() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setReady(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      finish();
      return () => {
        cancelled = true;
      };
    }

    const unsub = useAuthStore.persist.onFinishHydration(finish);
    void useAuthStore.persist.rehydrate().then(finish);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    if (!accessToken) {
      syncAuthCookie(false);
      return;
    }

    syncAuthCookie(true);
    const role = primaryRole(user);
    if (!role) return;

    if (mustChangePassword) {
      router.replace("/change-password");
      return;
    }
    router.replace(getRoleHomePath(role));
  }, [accessToken, mustChangePassword, ready, router, user]);

  return null;
}

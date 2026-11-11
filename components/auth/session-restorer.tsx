"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LOGOUT_QUERY } from "@/lib/auth/constants";
import { consumeLoggedOutFlag } from "@/lib/auth/logout-client";
import { useRouter } from "@/i18n/navigation";
import { getRoleHomePath } from "@/lib/auth/workspaces";
import { syncAuthCookie, useAuthStore } from "@/stores/auth-store";
import { primaryRole } from "@/types/auth";

/**
 * Sur /login : restaure la session après montage (pas au 1er rendu SSR).
 * Ignore la restauration juste après une déconnexion volontaire.
 */
export function SessionRestorer() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessToken = useAuthStore((s) => s.accessToken);
  const mustChangePassword = useAuthStore((s) => s.mustChangePassword);
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
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

    const justLoggedOut =
      searchParams.get(LOGOUT_QUERY) === "1" || consumeLoggedOutFlag();

    if (justLoggedOut) {
      clearSession();
      syncAuthCookie(false);
      // Nettoie ?loggedOut=1 sans repasser par le proxy (évite un rebond cookie → /).
      if (searchParams.get(LOGOUT_QUERY) === "1" && typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.delete(LOGOUT_QUERY);
        window.history.replaceState(window.history.state, "", url.pathname + url.search);
      }
      return;
    }

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
  }, [accessToken, clearSession, mustChangePassword, ready, router, searchParams, user]);

  return null;
}

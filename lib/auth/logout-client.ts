import { logout as apiLogout } from "@/lib/api/auth";
import {
  LOGOUT_FLAG_KEY,
  LOGOUT_QUERY,
} from "@/lib/auth/constants";
import { clearReturnPath } from "@/lib/auth/navigation";
import {
  clearLocalAuthState,
  withTimeoutSignal,
} from "@/lib/auth/session-cache";
import { useAuthStore } from "@/stores/auth-store";

export { LOGOUT_FLAG_KEY, LOGOUT_QUERY };

/** Timeout appel API logout — on purge localement même si le serveur est lent. */
const LOGOUT_API_TIMEOUT_MS = 3_000;
/** Durée minimale de l’overlay (évite un flash illisible). */
export const LOGOUT_MIN_MS = 480;

/** Marque une déconnexion volontaire (SessionRestorer / anti bfcache). */
export function markLoggedOut() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LOGOUT_FLAG_KEY, String(Date.now()));
}

export function consumeLoggedOutFlag(): boolean {
  if (typeof window === "undefined") return false;
  const value = window.sessionStorage.getItem(LOGOUT_FLAG_KEY);
  if (!value) return false;
  window.sessionStorage.removeItem(LOGOUT_FLAG_KEY);
  return true;
}

async function waitMin(started: number, minMs: number) {
  const elapsed = Date.now() - started;
  if (elapsed >= minMs) return;
  await new Promise((resolve) => window.setTimeout(resolve, minMs - elapsed));
}

/**
 * Déconnexion : API best-effort → purge caches / jetons → navigation dure vers /login.
 * Ne laisse jamais l’UI bloquée : en cas d’échec réseau, la session locale part quand même.
 */
export async function performClientLogout(locale: string): Promise<void> {
  const started = Date.now();
  const { isMock, accessToken } = useAuthStore.getState();

  if (!isMock && accessToken) {
    const { signal, cancel } = withTimeoutSignal(LOGOUT_API_TIMEOUT_MS);
    try {
      await apiLogout({ signal });
    } catch {
      /* Purge locale même si timeout / 5xx / offline */
    } finally {
      cancel();
    }
  }

  try {
    clearLocalAuthState();
    clearReturnPath();
    markLoggedOut();
  } catch {
    /* dernier recours : au moins cookie + store */
    try {
      useAuthStore.getState().clearSession();
    } catch {
      /* ignore */
    }
    clearReturnPath();
    markLoggedOut();
  }

  await waitMin(started, LOGOUT_MIN_MS);

  const safeLocale = locale === "en" ? "en" : "fr";
  window.location.replace(`/${safeLocale}/login?${LOGOUT_QUERY}=1`);
}

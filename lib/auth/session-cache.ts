/**
 * Purge des caches liés à une session utilisateur.
 * À appeler à la déconnexion et avant une nouvelle connexion (changement de compte).
 */

import { AUTH_STORAGE_KEY } from "@/lib/auth/constants";
import { clearAvatarCache } from "@/lib/profile/avatar-cache";
import { clearAvatarDataUrl } from "@/lib/profile/avatar-storage";
import { clearSchoolLogoCache } from "@/lib/school/logo-cache";
import { useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

/**
 * Vide les caches mémoire / blob / marque école pour un compte (ou tout).
 * Ne touche pas à « se souvenir de moi » (e-mail).
 * Laisse bee_sm_logged_out et le flash post-login (gérés à part).
 */
export function purgeSessionCaches(options: {
  userId?: string | null;
  /** Si true, retire aussi les jetons persistés (logout complet). */
  clearAuthPersist?: boolean;
} = {}) {
  const { userId, clearAuthPersist = false } = options;

  clearAvatarCache(userId ?? undefined);
  if (userId) {
    try {
      clearAvatarDataUrl(userId);
    } catch {
      /* ignore */
    }
  }

  const schoolId = useSchoolBrandStore.getState().school?.id;
  clearSchoolLogoCache(schoolId);
  useSchoolBrandStore.getState().clear();

  if (clearAuthPersist && typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

/** Avant une nouvelle session : évite de garder l’avatar / logo du compte précédent. */
export function prepareForNewSession() {
  const previousId = useAuthStore.getState().user?.id;
  purgeSessionCaches({ userId: previousId });
}

/** Déconnexion locale complète (caches + état + storage + cookie). */
export function clearLocalAuthState() {
  const userId = useAuthStore.getState().user?.id;
  purgeSessionCaches({ userId, clearAuthPersist: true });
  // clearSession resync le cookie et purge AUTH_STORAGE_KEY (anti-rehydrate).
  useAuthStore.getState().clearSession();
}

export function withTimeoutSignal(
  ms: number,
  parent?: AbortSignal | null,
): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);

  const onParentAbort = () => controller.abort();
  if (parent) {
    if (parent.aborted) controller.abort();
    else parent.addEventListener("abort", onParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cancel: () => {
      window.clearTimeout(timer);
      if (parent) parent.removeEventListener("abort", onParentAbort);
    },
  };
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error ? String((error as { name?: string }).name) : "";
  if (name === "AbortError" || name === "TimeoutError") return true;
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return true;
  }
  return false;
}

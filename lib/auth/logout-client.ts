import { logout as apiLogout } from "@/lib/api/auth";
import {
  AUTH_STORAGE_KEY,
  LOGOUT_FLAG_KEY,
  LOGOUT_QUERY,
} from "@/lib/auth/constants";
import { clearAvatarCache } from "@/lib/profile/avatar-cache";
import { syncAuthCookie, useAuthStore } from "@/stores/auth-store";
import { useSchoolBrandStore } from "@/stores/school-brand-store";

export { LOGOUT_FLAG_KEY, LOGOUT_QUERY };

const LOGOUT_API_TIMEOUT_MS = 2500;

function purgeAuthStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

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

/**
 * Déconnexion locale + navigation dure vers /login.
 * Évite l’overlay « Ouverture de la session » (page login restaurée depuis le bfcache
 * avec `submitting === true`) et le rebond proxy cookie → /.
 */
export async function performClientLogout(locale: string): Promise<void> {
  const { isMock, user, accessToken, clearSession } = useAuthStore.getState();

  if (!isMock && accessToken) {
    try {
      await Promise.race([
        apiLogout(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("logout-timeout")), LOGOUT_API_TIMEOUT_MS);
        }),
      ]);
    } catch {
      /* purge locale même si le serveur est injoignable / lent */
    }
  }

  clearAvatarCache(user?.id);
  useSchoolBrandStore.getState().clear();
  clearSession();
  purgeAuthStorage();
  syncAuthCookie(false);
  markLoggedOut();

  const safeLocale = locale === "en" ? "en" : "fr";
  window.location.replace(`/${safeLocale}/login?${LOGOUT_QUERY}=1`);
}

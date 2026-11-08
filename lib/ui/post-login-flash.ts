/**
 * File d’attente toast post-login : affiché seulement après arrivée dans l’espace app,
 * pas pendant l’écran de connexion / le loader.
 */

const FLASH_KEY = "smels-post-login-flash";

export type PostLoginFlash =
  | { kind: "loginSuccess" }
  | { kind: "loginSuccessDemo"; roleLabel: string };

export function queuePostLoginFlash(flash: PostLoginFlash): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FLASH_KEY, JSON.stringify(flash));
  } catch {
    /* storage plein / privé — ignorer */
  }
}

export function consumePostLoginFlash(): PostLoginFlash | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(FLASH_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(FLASH_KEY);
    return JSON.parse(raw) as PostLoginFlash;
  } catch {
    window.sessionStorage.removeItem(FLASH_KEY);
    return null;
  }
}

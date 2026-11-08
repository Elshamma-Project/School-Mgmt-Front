/**
 * « Se souvenir de moi » — ne stocke JAMAIS le mot de passe.
 * - E-mail rappelé (localStorage)
 * - Session : localStorage si coché, sessionStorage sinon (fermée à la fin du navigateur)
 */

export const REMEMBER_ME_KEY = "smels-remember-me";
export const REMEMBER_EMAIL_KEY = "smels-remember-email";

export function readRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== "0";
}

export function writeRememberMe(remember: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
}

export function readRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(REMEMBER_EMAIL_KEY)?.trim() ?? "";
}

export function writeRememberedEmail(email: string | null): void {
  if (typeof window === "undefined") return;
  const value = email?.trim().toLowerCase() ?? "";
  if (!value) {
    window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
    return;
  }
  window.localStorage.setItem(REMEMBER_EMAIL_KEY, value);
}

/** Storage zustand : local vs session selon le choix « se souvenir ». */
export function createAuthPersistStorage(): {
  getItem: (name: string) => string | null;
  setItem: (name: string, value: string) => void;
  removeItem: (name: string) => void;
} {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      if (readRememberMe()) {
        return window.localStorage.getItem(name) ?? window.sessionStorage.getItem(name);
      }
      return window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name);
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      if (readRememberMe()) {
        window.localStorage.setItem(name, value);
        window.sessionStorage.removeItem(name);
      } else {
        window.sessionStorage.setItem(name, value);
        window.localStorage.removeItem(name);
      }
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    },
  };
}

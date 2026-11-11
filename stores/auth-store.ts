"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  AUTH_COOKIE_LEGACY_NAME,
  AUTH_COOKIE_MAX_AGE_SEC,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PRESENT,
  AUTH_STORAGE_KEY,
} from "@/lib/auth/constants";
import { createAuthPersistStorage } from "@/lib/auth/remember";
import { openSecret } from "@/lib/auth/token-vault";
import type { AuthSession, AuthUser, LoginResponse } from "@/types/auth";
import { mapUserAccountDto, type UserAccountDto } from "@/types/auth";

type AuthState = AuthSession & {
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: AuthUser;
    mustChangePassword: boolean;
    isMock?: boolean;
  }) => void;
  applyTokens: (tokens: LoginResponse) => void;
  syncFromAccount: (dto: UserAccountDto) => void;
  updateUser: (patch: Partial<Pick<AuthUser, "displayName" | "email" | "hasAvatar">>) => void;
  clearSession: () => void;
  setMustChangePassword: (value: boolean) => void;
};

type PersistedAuth = {
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  user: AuthUser | null;
  mustChangePassword: boolean;
  isMock: boolean;
};

function expireCookie(name: string) {
  // Sans et avec Secure : un cookie posé en HTTPS (Secure) ne part pas
  // si on l’expire seulement sans l’attribut Secure.
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${name}=; path=/; Max-Age=0; SameSite=Lax; Secure`;
}

export function syncAuthCookie(hasSession: boolean) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";

  expireCookie(AUTH_COOKIE_LEGACY_NAME);

  if (hasSession) {
    document.cookie = `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_PRESENT}; path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`;
  } else {
    expireCookie(AUTH_COOKIE_NAME);
  }
}

/**
 * Storage : jetons en clair après migration (openSecret à la lecture).
 * Plus de re-scellage à l’écriture — évite corruption / Bearer invalide → déconnexion profil.
 */
function authStorage(): StateStorage {
  const base = createAuthPersistStorage();
  return {
    getItem: (name) => {
      const raw = base.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: PersistedAuth; version?: number };
        if (!parsed.state) return raw;
        const state = parsed.state;
        const accessToken = openSecret(state.accessToken);
        const refreshToken = openSecret(state.refreshToken);
        return JSON.stringify({
          ...parsed,
          state: {
            ...state,
            accessToken,
            refreshToken,
          },
        });
      } catch {
        return raw;
      }
    },
    setItem: (name, value) => {
      // Persiste tel quel (jetons déjà ouverts en mémoire).
      base.setItem(name, value);
    },
    removeItem: (name) => base.removeItem(name),
  };
}

/**
 * État initial vide (SSR = 1er rendu client). Réhydratation après montage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      user: null,
      mustChangePassword: false,
      isMock: false,
      setSession: ({
        accessToken,
        refreshToken,
        sessionId,
        user,
        mustChangePassword,
        isMock = false,
      }) => {
        syncAuthCookie(true);
        set({
          accessToken: openSecret(accessToken) ?? accessToken,
          refreshToken: openSecret(refreshToken) ?? refreshToken,
          sessionId,
          user,
          mustChangePassword,
          isMock,
        });
      },
      applyTokens: (tokens) => {
        const previous = get().user;
        syncAuthCookie(true);
        set({
          accessToken: openSecret(tokens.accessToken) ?? tokens.accessToken,
          refreshToken: openSecret(tokens.refreshToken) ?? tokens.refreshToken,
          sessionId: tokens.sessionId,
          user: {
            ...tokens.user,
            displayName: previous?.displayName ?? tokens.user.displayName,
            email: previous?.email ?? tokens.user.email,
            hasAvatar: tokens.user.hasAvatar ?? previous?.hasAvatar,
          },
          mustChangePassword: tokens.mustChangePassword,
          isMock: false,
        });
      },
      syncFromAccount: (dto) => {
        const previous = get().user;
        set({
          user: mapUserAccountDto(dto, {
            displayName: previous?.displayName,
            email: previous?.email,
          }),
          mustChangePassword: dto.mustChangePassword,
        });
      },
      updateUser: (patch) => {
        set((state) => {
          if (!state.user) return state;
          return {
            user: {
              ...state.user,
              ...patch,
            },
          };
        });
      },
      clearSession: () => {
        syncAuthCookie(false);
        set({
          accessToken: null,
          refreshToken: null,
          sessionId: null,
          user: null,
          mustChangePassword: false,
          isMock: false,
        });
        // Purge immédiate : évite qu’un rehydrate concurrent restaure l’ancienne session.
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
          window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
        }
      },
      setMustChangePassword: (mustChangePassword) => set({ mustChangePassword }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      skipHydration: true,
      storage: createJSONStorage(() => authStorage()),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        user: state.user,
        mustChangePassword: state.mustChangePassword,
        isMock: state.isMock,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.warn("[smels-auth] rehydrate failed", error);
          return;
        }
        if (state?.accessToken) {
          // Normalise d’éventuels jetons encore scellés.
          const access = openSecret(state.accessToken);
          const refresh = openSecret(state.refreshToken);
          if (access !== state.accessToken || refresh !== state.refreshToken) {
            useAuthStore.setState({
              accessToken: access,
              refreshToken: refresh,
            });
          }
          syncAuthCookie(true);
        }
      },
    },
  ),
);

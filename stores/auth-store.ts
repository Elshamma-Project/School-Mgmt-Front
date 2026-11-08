"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PRESENT,
  AUTH_STORAGE_KEY,
} from "@/lib/auth/constants";
import { createAuthPersistStorage, readRememberMe } from "@/lib/auth/remember";
import { openSecret, sealSecret } from "@/lib/auth/token-vault";
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

function syncAuthCookie(hasSession: boolean) {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  if (hasSession) {
    const maxAge = readRememberMe() ? "; Max-Age=2592000" : "";
    document.cookie = `${AUTH_COOKIE_NAME}=${AUTH_COOKIE_PRESENT}; path=/; SameSite=Lax${secure}${maxAge}`;
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

function sealedStorage(): StateStorage {
  const base = createAuthPersistStorage();
  return {
    getItem: (name) => {
      const raw = base.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw) as { state?: PersistedAuth; version?: number };
        if (!parsed.state) return raw;
        const state = parsed.state;
        return JSON.stringify({
          ...parsed,
          state: {
            ...state,
            accessToken: openSecret(state.accessToken),
            refreshToken: openSecret(state.refreshToken),
          },
        });
      } catch {
        return raw;
      }
    },
    setItem: (name, value) => {
      try {
        const parsed = JSON.parse(value) as { state?: PersistedAuth; version?: number };
        if (!parsed.state) {
          base.setItem(name, value);
          return;
        }
        const state = parsed.state;
        const sealed = JSON.stringify({
          ...parsed,
          state: {
            ...state,
            accessToken: state.accessToken ? sealSecret(state.accessToken) : null,
            refreshToken: state.refreshToken ? sealSecret(state.refreshToken) : null,
          },
        });
        base.setItem(name, sealed);
      } catch {
        base.setItem(name, value);
      }
    },
    removeItem: (name) => base.removeItem(name),
  };
}

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
        set({ accessToken, refreshToken, sessionId, user, mustChangePassword, isMock });
      },
      applyTokens: (tokens) => {
        const previous = get().user;
        syncAuthCookie(true);
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
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
      },
      setMustChangePassword: (mustChangePassword) => set({ mustChangePassword }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      skipHydration: true,
      storage: createJSONStorage(() => sealedStorage()),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        sessionId: state.sessionId,
        user: state.user,
        mustChangePassword: state.mustChangePassword,
        isMock: state.isMock,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.accessToken) {
          syncAuthCookie(true);
        }
      },
    },
  ),
);

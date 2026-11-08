"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY } from "@/lib/auth/constants";
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
  updateUser: (patch: Partial<Pick<AuthUser, "displayName" | "email">>) => void;
  clearSession: () => void;
  setMustChangePassword: (value: boolean) => void;
};

function syncAuthCookie(accessToken: string | null) {
  if (typeof document === "undefined") return;

  if (accessToken) {
    // SameSite=Lax : CSRF basique ; Secure uniquement en HTTPS (prod).
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}; path=/; SameSite=Lax${secure}`;
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; Max-Age=0; SameSite=Lax`;
  }
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
        syncAuthCookie(accessToken);
        set({ accessToken, refreshToken, sessionId, user, mustChangePassword, isMock });
      },
      applyTokens: (tokens) => {
        const previous = get().user;
        syncAuthCookie(tokens.accessToken);
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          sessionId: tokens.sessionId,
          user: {
            ...tokens.user,
            displayName: previous?.displayName ?? tokens.user.displayName,
            email: previous?.email ?? tokens.user.email,
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
        syncAuthCookie(null);
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
          syncAuthCookie(state.accessToken);
        }
      },
    },
  ),
);

"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AUTH_COOKIE_NAME, AUTH_STORAGE_KEY } from "@/lib/auth/constants";
import type { AuthSession, AuthUser } from "@/types/auth";

type AuthState = AuthSession & {
  setSession: (session: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    mustChangePassword: boolean;
    isMock?: boolean;
  }) => void;
  clearSession: () => void;
  setMustChangePassword: (value: boolean) => void;
};

function syncAuthCookie(accessToken: string | null) {
  if (typeof document === "undefined") return;

  if (accessToken) {
    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(accessToken)}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; Max-Age=0; SameSite=Lax`;
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      mustChangePassword: false,
      isMock: true,
      setSession: ({
        accessToken,
        refreshToken,
        user,
        mustChangePassword,
        isMock = true,
      }) => {
        syncAuthCookie(accessToken);
        set({ accessToken, refreshToken, user, mustChangePassword, isMock });
      },
      clearSession: () => {
        syncAuthCookie(null);
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          mustChangePassword: false,
          isMock: true,
        });
      },
      setMustChangePassword: (mustChangePassword) => set({ mustChangePassword }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
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

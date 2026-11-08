"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  THEME_COOKIE_NAME,
  THEME_STORAGE_KEY,
  type AppTheme,
} from "@/lib/theme/constants";

type ThemeState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
};

function syncThemeCookie(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; Max-Age=31536000; SameSite=Lax`;
}

function applyThemeClass(theme: AppTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  syncThemeCookie(theme);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next: AppTheme = get().theme === "dark" ? "light" : "dark";
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyThemeClass(state.theme);
      },
    },
  ),
);

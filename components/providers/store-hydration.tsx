"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useThemeStore } from "@/stores/theme-store";

/**
 * Réhydrate les stores zustand persist après le montage client.
 * Évite « Can't perform a React state update on a component that hasn't mounted yet ».
 */
export function StoreHydration() {
  useEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useThemeStore.persist.rehydrate();
    void useSidebarStore.persist.rehydrate();
  }, []);

  return null;
}

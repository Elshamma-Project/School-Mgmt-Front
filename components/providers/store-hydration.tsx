"use client";

import { useLayoutEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useThemeStore } from "@/stores/theme-store";

/**
 * Réhydrate les stores persist après le montage (layout effect).
 * Ne jamais appliquer localStorage avant le 1er rendu → mismatch SSR.
 */
export function StoreHydration() {
  useLayoutEffect(() => {
    void useAuthStore.persist.rehydrate();
    void useThemeStore.persist.rehydrate();
    void useSidebarStore.persist.rehydrate();
  }, []);

  return null;
}

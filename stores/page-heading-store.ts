"use client";

import { create } from "zustand";

type PageHeadingState = {
  /** Titre d’en-tête temporaire (fiche détail, etc.). null = titre nav par défaut. */
  override: string | null;
  setOverride: (title: string | null) => void;
  clearOverride: () => void;
};

export const usePageHeadingStore = create<PageHeadingState>((set) => ({
  override: null,
  setOverride: (title) => set({ override: title?.trim() || null }),
  clearOverride: () => set({ override: null }),
}));

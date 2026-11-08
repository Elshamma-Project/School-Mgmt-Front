"use client";

import { create } from "zustand";

export type PageHeadingCrumb = {
  label: string;
  /** Si défini : segment cliquable (navigation). */
  href?: string | null;
};

type PageHeadingState = {
  /** Fil d’Ariane structuré. null = titre nav par défaut. */
  crumbs: PageHeadingCrumb[] | null;
  /** Lien du bouton retour dans l’AppHeader (icône seule). */
  backHref: string | null;
  setCrumbs: (crumbs: PageHeadingCrumb[] | null) => void;
  setBackHref: (href: string | null) => void;
  clearOverride: () => void;
};

export const usePageHeadingStore = create<PageHeadingState>((set) => ({
  crumbs: null,
  backHref: null,
  setCrumbs: (crumbs) =>
    set({
      crumbs:
        crumbs && crumbs.length > 0
          ? crumbs.map((c) => ({
              label: c.label.trim(),
              href: c.href?.trim() || null,
            }))
          : null,
    }),
  setBackHref: (href) => set({ backHref: href?.trim() || null }),
  clearOverride: () => set({ crumbs: null, backHref: null }),
}));

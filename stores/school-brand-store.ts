"use client";

import { create } from "zustand";
import {
  fetchPublicSchoolBrand,
  getMySchool,
  type SchoolResponse,
} from "@/lib/api/school";
import {
  clearSchoolLogoCache,
  ensureSchoolLogoUrl,
  publishSchoolLogoUrl,
} from "@/lib/school/logo-cache";
import { localizedLabel } from "@/lib/api/academic";
import { isAuthFailure } from "@/types/api";

type SchoolBrandState = {
  school: SchoolResponse | null;
  logoUrl: string | null;
  loading: boolean;
  hydrated: boolean;
  hydrate: (schoolId: string | null, locale?: string) => Promise<void>;
  /** Sans session — écran de connexion. */
  hydratePublic: (schoolId: string | null) => Promise<void>;
  setSchool: (school: SchoolResponse | null) => void;
  refreshLogo: () => Promise<void>;
  clear: () => void;
  displayName: (locale: string) => string;
};

export const useSchoolBrandStore = create<SchoolBrandState>((set, get) => ({
  school: null,
  logoUrl: null,
  loading: false,
  hydrated: false,

  displayName: (locale) => {
    const school = get().school;
    if (!school) return "";
    return school.shortName?.trim() || localizedLabel(school.name, locale) || school.code;
  },

  setSchool: (school) => {
    set({ school });
  },

  clear: () => {
    const id = get().school?.id;
    clearSchoolLogoCache(id);
    set({ school: null, logoUrl: null, hydrated: false, loading: false });
  },

  refreshLogo: async () => {
    const school = get().school;
    if (!school?.id) {
      set({ logoUrl: null });
      return;
    }
    if (!school.hasLogo) {
      publishSchoolLogoUrl(school.id, null);
      set({ logoUrl: null });
      return;
    }
    clearSchoolLogoCache(school.id);
    const url = await ensureSchoolLogoUrl({ schoolId: school.id, hasLogo: true });
    set({ logoUrl: url });
  },

  hydrate: async (schoolId, _locale) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const school = await getMySchool(schoolId);
      set({ school, hydrated: true });
      if (school?.hasLogo) {
        const url = await ensureSchoolLogoUrl({
          schoolId: school.id,
          hasLogo: true,
        });
        set({ logoUrl: url });
      } else {
        if (school?.id) publishSchoolLogoUrl(school.id, null);
        set({ logoUrl: null });
      }
    } catch (error) {
      if (!isAuthFailure(error)) {
        set({ school: null, logoUrl: null, hydrated: true });
      }
    } finally {
      set({ loading: false });
    }
  },

  hydratePublic: async (schoolId) => {
    const id = schoolId?.trim();
    if (!id || get().loading) return;
    set({ loading: true });
    try {
      const brand = await fetchPublicSchoolBrand(id);
      if (!brand) {
        set({ hydrated: true });
        return;
      }
      const school: SchoolResponse = {
        id: brand.id,
        code: brand.code,
        name: brand.name,
        shortName: brand.shortName,
        officialHeaders: [],
        contact: { phones: [], email: null, address: null, city: null },
        postalBox: null,
        signaturePlace: null,
        headTitle: null,
        headOfSchoolStaffId: null,
        logoFileId: brand.hasLogo ? "public" : null,
        hasLogo: brand.hasLogo,
        reportCardNotice: null,
        reportCardDisclaimer: null,
        timezone: "Africa/Douala",
        active: true,
      };
      set({ school, hydrated: true });
      if (brand.hasLogo) {
        const url = await ensureSchoolLogoUrl({
          schoolId: brand.id,
          hasLogo: true,
          publicAccess: true,
        });
        set({ logoUrl: url });
      } else {
        publishSchoolLogoUrl(brand.id, null);
        set({ logoUrl: null });
      }
    } catch {
      set({ hydrated: true });
    } finally {
      set({ loading: false });
    }
  },
}));

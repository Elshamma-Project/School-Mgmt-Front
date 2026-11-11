/**
 * Cache mémoire ObjectURL du logo établissement (sidebar + réglages).
 */

import { fetchPublicSchoolLogoBlob, fetchSchoolLogoBlob } from "@/lib/api/school";

type CacheEntry = {
  schoolId: string;
  url: string | null;
};

let entry: CacheEntry | null = null;
let inflight: Promise<string | null> | null = null;
let inflightSchoolId: string | null = null;

const listeners = new Set<() => void>();

export function subscribeSchoolLogoCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function peekSchoolLogoUrl(schoolId: string | null | undefined): string | null {
  if (!schoolId || !entry || entry.schoolId !== schoolId) return null;
  return entry.url;
}

export function publishSchoolLogoUrl(schoolId: string, url: string | null) {
  if (entry?.url && entry.url !== url && entry.url.startsWith("blob:")) {
    URL.revokeObjectURL(entry.url);
  }
  entry = { schoolId, url };
  notify();
}

export function clearSchoolLogoCache(schoolId?: string) {
  if (schoolId && entry && entry.schoolId !== schoolId) return;
  if (entry?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.url);
  }
  entry = null;
  inflight = null;
  inflightSchoolId = null;
  notify();
}

export async function ensureSchoolLogoUrl(options: {
  schoolId: string;
  hasLogo?: boolean;
  /** true = endpoint public (écran de connexion). */
  publicAccess?: boolean;
}): Promise<string | null> {
  const { schoolId, hasLogo, publicAccess = false } = options;
  if (!schoolId) return null;
  if (hasLogo === false) {
    publishSchoolLogoUrl(schoolId, null);
    return null;
  }
  if (entry?.schoolId === schoolId) return entry.url;
  if (inflight && inflightSchoolId === schoolId) return inflight;

  inflightSchoolId = schoolId;
  inflight = (async () => {
    const blob = publicAccess
      ? await fetchPublicSchoolLogoBlob(schoolId)
      : await fetchSchoolLogoBlob(schoolId);
    if (!blob || blob.size === 0) {
      publishSchoolLogoUrl(schoolId, null);
      return null;
    }
    const url = URL.createObjectURL(blob);
    publishSchoolLogoUrl(schoolId, url);
    return url;
  })().finally(() => {
    inflight = null;
    inflightSchoolId = null;
  });

  return inflight;
}

/**
 * Cache mémoire de l’ObjectURL avatar (sidebar + profil partagent la même image).
 * Une seule requête réseau ; révoque l’URL précédente au remplacement.
 */

import { fetchAvatarBlob } from "@/lib/api/auth";
import { readAvatarDataUrl } from "@/lib/profile/avatar-storage";

type CacheEntry = {
  userId: string;
  url: string | null;
};

let entry: CacheEntry | null = null;
let inflight: Promise<string | null> | null = null;
let inflightUserId: string | null = null;

const listeners = new Set<() => void>();

export function subscribeAvatarCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((l) => l());
}

export function peekAvatarUrl(userId: string | null | undefined): string | null {
  if (!userId || !entry || entry.userId !== userId) return null;
  return entry.url;
}

export function publishAvatarUrl(userId: string, url: string | null) {
  if (entry?.url && entry.url !== url && entry.url.startsWith("blob:")) {
    URL.revokeObjectURL(entry.url);
  }
  entry = { userId, url };
  notify();
}

export function clearAvatarCache(userId?: string) {
  if (userId && entry && entry.userId !== userId) return;
  if (entry?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(entry.url);
  }
  entry = null;
  inflight = null;
  inflightUserId = null;
  notify();
}

/**
 * Charge l’avatar (mock = localStorage ; sinon API).
 * Réutilise le cache / la promesse en cours pour éviter les doubles fetch.
 */
export async function ensureAvatarUrl(options: {
  userId: string;
  /** Ignoré pour le chargement API (source de vérité = GET avatar). */
  hasAvatar?: boolean;
  isMock?: boolean;
}): Promise<string | null> {
  const { userId, isMock } = options;
  if (!userId) return null;

  // Cache déjà résolu pour cet utilisateur (y compris « pas d’avatar »).
  if (entry?.userId === userId) return entry.url;

  if (isMock) {
    const local = readAvatarDataUrl(userId);
    publishAvatarUrl(userId, local);
    return local;
  }

  if (inflight && inflightUserId === userId) return inflight;

  inflightUserId = userId;
  inflight = (async () => {
    const blob = await fetchAvatarBlob();
    if (!blob || blob.size === 0) {
      publishAvatarUrl(userId, null);
      return null;
    }
    const url = URL.createObjectURL(blob);
    publishAvatarUrl(userId, url);
    return url;
  })().finally(() => {
    inflight = null;
    inflightUserId = null;
  });

  return inflight;
}

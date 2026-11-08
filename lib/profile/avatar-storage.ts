/**
 * Photo de profil UI uniquement (pas sur les bulletins).
 * Persistance locale par compte tant que le module fichiers serveur n’existe pas (docs/03).
 */

const PREFIX = "smels-avatar-v1:";
const MAX_EDGE = 320;
const JPEG_QUALITY = 0.82;

export function avatarStorageKey(accountId: string): string {
  return `${PREFIX}${accountId}`;
}

export function readAvatarDataUrl(accountId: string): string | null {
  if (typeof window === "undefined" || !accountId) return null;
  try {
    const value = window.localStorage.getItem(avatarStorageKey(accountId));
    return value && value.startsWith("data:image/") ? value : null;
  } catch {
    return null;
  }
}

export function writeAvatarDataUrl(accountId: string, dataUrl: string): void {
  if (typeof window === "undefined" || !accountId) return;
  window.localStorage.setItem(avatarStorageKey(accountId), dataUrl);
}

export function clearAvatarDataUrl(accountId: string): void {
  if (typeof window === "undefined" || !accountId) return;
  window.localStorage.removeItem(avatarStorageKey(accountId));
}

/** Compresse / recadre au carré pour limiter la taille localStorage. */
export async function compressImageFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const edge = Math.min(MAX_EDGE, side);

  const canvas = document.createElement("canvas");
  canvas.width = edge;
  canvas.height = edge;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("CANVAS_UNSUPPORTED");
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, edge, edge);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  if (dataUrl.length > 450_000) {
    throw new Error("IMAGE_TOO_LARGE");
  }
  return dataUrl;
}

/**
 * Enveloppe légère des jetons au repos (pas du chiffrement anti-XSS).
 * Empêche de laisser un JWT lisible en clair dans DevTools / dumps storage.
 * Évolution : cookies HttpOnly via BFF.
 */

const PREFIX = "smels.v1.";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function xorMask(bytes: Uint8Array, key: string): Uint8Array {
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[i] = bytes[i]! ^ key.charCodeAt(i % key.length);
  }
  return out;
}

const MASK_KEY = "smels-auth-at-rest-v1";

/** Encode une chaîne sensible pour le storage. */
export function sealSecret(plain: string): string {
  const encoded = new TextEncoder().encode(plain);
  return PREFIX + toBase64Url(xorMask(encoded, MASK_KEY));
}

/** Décode ; accepte aussi l’ancien format clair (migration). */
export function openSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;
  try {
    const raw = fromBase64Url(stored.slice(PREFIX.length));
    return new TextDecoder().decode(xorMask(raw, MASK_KEY));
  } catch {
    return null;
  }
}

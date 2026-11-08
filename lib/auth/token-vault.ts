/**
 * Enveloppe légère des jetons au repos (pas du chiffrement anti-XSS).
 * Empêche de laisser un JWT lisible en clair dans DevTools / dumps storage.
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

export function isSealedSecret(value: string): boolean {
  return value.startsWith(PREFIX);
}

/** Encode une chaîne sensible pour le storage (idempotent si déjà scellé). */
export function sealSecret(plain: string): string {
  if (!plain) return plain;
  if (isSealedSecret(plain)) return plain;
  const encoded = new TextEncoder().encode(plain);
  return PREFIX + toBase64Url(xorMask(encoded, MASK_KEY));
}

/** Décode ; accepte aussi l’ancien format clair (migration). */
export function openSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!isSealedSecret(stored)) return stored;
  try {
    const raw = fromBase64Url(stored.slice(PREFIX.length));
    const opened = new TextDecoder().decode(xorMask(raw, MASK_KEY));
    // Ancien double-scellage : rouvre une 2e fois si besoin.
    if (isSealedSecret(opened)) {
      try {
        const raw2 = fromBase64Url(opened.slice(PREFIX.length));
        return new TextDecoder().decode(xorMask(raw2, MASK_KEY));
      } catch {
        return opened;
      }
    }
    return opened;
  } catch {
    // Ne perd pas le jeton : renvoie brut si décodage impossible.
    return stored;
  }
}

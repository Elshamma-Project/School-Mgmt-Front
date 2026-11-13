/**
 * Libellés sessions compréhensibles (pas de chaîne User-Agent brute).
 */

export type SessionBrowserId =
  | "chrome"
  | "firefox"
  | "safari"
  | "edge"
  | "opera"
  | "cursor"
  | "samsung"
  | "desktopApp"
  | "other";

export type SessionOsId =
  | "windows"
  | "macos"
  | "linux"
  | "android"
  | "ios"
  | "other";

export type ParsedSessionClient = {
  browserId: SessionBrowserId;
  osId: SessionOsId;
};

/** True si le texte ressemble à un User-Agent technique. */
export function looksLikeUserAgent(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim();
  return (
    /^mozilla\//i.test(v) ||
    /applewebkit/i.test(v) ||
    /\(.*android.*\)/i.test(v) ||
    v.length > 80
  );
}

export function parseUserAgent(ua: string | null | undefined): ParsedSessionClient | null {
  if (!ua?.trim()) return null;
  const raw = ua.trim();
  const lower = raw.toLowerCase();

  let browserId: SessionBrowserId = "other";
  if (/cursor\//i.test(raw)) browserId = "cursor";
  else if (/edg\//i.test(raw)) browserId = "edge";
  else if (/opr\/|opera/i.test(raw)) browserId = "opera";
  else if (/firefox\/|fxios\//i.test(raw)) browserId = "firefox";
  else if (/samsungbrowser\//i.test(raw)) browserId = "samsung";
  else if (/chrome\/|crios\//i.test(raw) && !/edg\//i.test(raw)) browserId = "chrome";
  else if (/safari\//i.test(raw) && /version\//i.test(raw)) browserId = "safari";
  else if (/electron\//i.test(raw)) browserId = "desktopApp";

  let osId: SessionOsId = "other";
  if (/windows nt|win64|win32/i.test(lower)) osId = "windows";
  else if (/android/i.test(lower)) osId = "android";
  else if (/iphone|ipad|ipod|ios/i.test(lower)) osId = "ios";
  else if (/mac os x|macintosh/i.test(lower)) osId = "macos";
  else if (/linux|cros/i.test(lower)) osId = "linux";

  return { browserId, osId };
}

/** Boucle locale / développement — pas une vraie adresse publique. */
export function isLocalNetworkIp(ip: string | null | undefined): boolean {
  if (!ip?.trim()) return false;
  const v = ip.trim().toLowerCase();
  if (v === "127.0.0.1" || v === "::1" || v === "localhost") return true;
  // IPv6 loopback compressé ou écrit en entier
  if (v === "0:0:0:0:0:0:0:1" || v === "0000:0000:0000:0000:0000:0000:0000:0001") {
    return true;
  }
  if (/^::ffff:127\./.test(v)) return true;
  return false;
}

export function isPrivateNetworkIp(ip: string | null | undefined): boolean {
  if (!ip?.trim() || isLocalNetworkIp(ip)) return false;
  const v = ip.trim();
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(v)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(v)) return true;
  return false;
}

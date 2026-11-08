/**
 * Cookie **opaque** pour le proxy Next (présence de session seulement).
 * Ne contient plus le JWT — réduit l’exposition XSS via document.cookie.
 */
export const AUTH_COOKIE_NAME = "smels_session";

/** Valeur fixe du cookie de présence (pas un secret). */
export const AUTH_COOKIE_PRESENT = "1";

/** Clé de persistance zustand. */
export const AUTH_STORAGE_KEY = "smels-auth";

/**
 * Persistance :
 * - access/refresh scellés (token-vault) dans localStorage ou sessionStorage
 * - cookie opaque pour proxy.ts (redirects)
 *
 * Sécurité :
 * - jamais passwordHash / données élèves
 * - refresh single-flight + lock multi-onglets
 * - Évolution : cookies HttpOnly BFF
 */

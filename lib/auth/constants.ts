/**
 * Cookie **opaque** pour le proxy Next (présence de session seulement).
 * Ne contient plus le JWT — réduit l’exposition XSS via document.cookie.
 */
export const AUTH_COOKIE_NAME = "smels_session";

/** Ancien cookie (JWT en clair) — encore accepté au refresh pour ne pas déconnecter. */
export const AUTH_COOKIE_LEGACY_NAME = "smels_access_token";

/** Valeur fixe du cookie de présence (pas un secret). */
export const AUTH_COOKIE_PRESENT = "1";

/** Durée du cookie de présence (30 j) — doit survivre à F5 même sans « se souvenir ». */
export const AUTH_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30;

/** Clé de persistance zustand. */
export const AUTH_STORAGE_KEY = "smels-auth";

/**
 * Persistance :
 * - access/refresh scellés (token-vault) dans localStorage (survivent à F5)
 * - cookie opaque `smels_session` (Max-Age 30 j) pour éviter un redirect login inutile
 * - le proxy Next ne déconnecte plus si le cookie manque (AuthGuard client = vérité)
 *
 * « Se souvenir de moi » ne mémorise que l’e-mail, pas le mot de passe.
 */

/** Cookie lu par le proxy pour les redirects auth (miroir du token localStorage). */
export const AUTH_COOKIE_NAME = "smels_access_token";

/** Clé de persistance zustand (localStorage). */
export const AUTH_STORAGE_KEY = "smels-auth";

/**
 * Choix de persistance (fondations) :
 * - access/refresh tokens + user dans localStorage via zustand/persist
 * - cookie non-httpOnly miroir pour que proxy.ts puisse rediriger sans token
 * Évolution prévue : cookies httpOnly gérés par l’API (plus sûr contre XSS).
 */

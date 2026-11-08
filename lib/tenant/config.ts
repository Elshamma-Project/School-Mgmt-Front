/**
 * Paramètres multi-tenant / déploiement.
 *
 * Important Next.js : les `NEXT_PUBLIC_*` doivent être référencés de façon
 * **statique** (`process.env.NEXT_PUBLIC_FOO`) pour être injectés dans le bundle client.
 * Un accès dynamique `process.env[name]` renvoie toujours `undefined` côté navigateur.
 */

function trimEnv(value: string | undefined, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function readBool(value: string | undefined, fallback: boolean): boolean {
  const raw = trimEnv(value);
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

export type TenantPublicConfig = {
  /** URL de base de l’API SMELS (ex. http://localhost:8090). */
  apiBaseUrl: string;
  /**
   * Identifiant établissement (env prioritaire, sinon hostname hors localhost).
   * Envoyé automatiquement au login — jamais saisi par l’utilisateur.
   */
  schoolId: string;
  /** Libellé UI de l’école (branding déploiement). */
  schoolDisplayName: string;
  /** Nom produit affiché (souvent SMELS). */
  appDisplayName: string;
  /** Personas UI sans API (dev seulement). */
  enableDemoLogin: boolean;
};

function browserHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.trim().toLowerCase();
}

/**
 * schoolId effectif :
 * 1. NEXT_PUBLIC_DEFAULT_SCHOOL_ID (.env)
 * 2. sinon le nom de domaine (hors localhost / IP)
 */
export function resolveSchoolId(override?: string | null): string {
  const fromOverride = override?.trim();
  if (fromOverride) return fromOverride;

  const fromEnv = trimEnv(process.env.NEXT_PUBLIC_DEFAULT_SCHOOL_ID);
  if (fromEnv) return fromEnv;

  const host = browserHostname();
  if (!host) return "";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "";
  return host;
}

export function getTenantConfig(schoolIdOverride?: string | null): TenantPublicConfig {
  return {
    apiBaseUrl: trimEnv(process.env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:8090"),
    schoolId: resolveSchoolId(schoolIdOverride),
    schoolDisplayName: trimEnv(process.env.NEXT_PUBLIC_SCHOOL_DISPLAY_NAME, "School"),
    appDisplayName: trimEnv(process.env.NEXT_PUBLIC_APP_DISPLAY_NAME, "SMELS"),
    enableDemoLogin: readBool(process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN, false),
  };
}

/**
 * Paramètres multi-tenant / déploiement — jamais d’identifiants école en dur
 * dans la logique métier. Tout passe par env + (optionnel) nom d’hôte.
 */

function readPublic(name: string, fallback = ""): string {
  const value = process.env[name];
  return typeof value === "string" ? value.trim() : fallback;
}

function readBool(name: string, fallback: boolean): boolean {
  const raw = readPublic(name);
  if (!raw) return fallback;
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

export type TenantPublicConfig = {
  /** URL de base de l’API SMELS (ex. http://localhost:8090). */
  apiBaseUrl: string;
  /**
   * Identifiant établissement résolu (env prioritaire, sinon hostname).
   * Envoyé automatiquement au login — jamais saisi par l’utilisateur.
   */
  schoolId: string;
  /** Libellé UI de l’école (branding déploiement), pas un id technique. */
  schoolDisplayName: string;
  /** Nom produit affiché (souvent SMELS). */
  appDisplayName: string;
  /**
   * Autorise le mode démo local (personas sans API).
   * À laisser false dès qu’on branche un vrai backend.
   */
  enableDemoLogin: boolean;
};

/** Hostname navigateur, sans port (ex. elshammah.cm, localhost). */
function browserHostname(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname.trim().toLowerCase();
}

/**
 * schoolId effectif :
 * 1. NEXT_PUBLIC_DEFAULT_SCHOOL_ID
 * 2. sinon le nom de domaine (hors localhost / IP)
 */
export function resolveSchoolId(): string {
  const fromEnv = readPublic("NEXT_PUBLIC_DEFAULT_SCHOOL_ID");
  if (fromEnv) return fromEnv;

  const host = browserHostname();
  if (!host) return "";
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return "";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "";
  return host;
}

export function getTenantConfig(): TenantPublicConfig {
  return {
    apiBaseUrl: readPublic("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8090"),
    schoolId: resolveSchoolId(),
    schoolDisplayName: readPublic("NEXT_PUBLIC_SCHOOL_DISPLAY_NAME", "School"),
    appDisplayName: readPublic("NEXT_PUBLIC_APP_DISPLAY_NAME", "SMELS"),
    enableDemoLogin: readBool("NEXT_PUBLIC_ENABLE_DEMO_LOGIN", false),
  };
}

/** Rôles alignés sur le module `user` / docs/05 (backend Kotlin). */
export const APP_ROLES = [
  "STUDENT",
  "PARENT",
  "TEACHER",
  "SURVEILLANT_GENERAL",
  "ADMINISTRATION",
  "DIRECTOR",
  "SUPER_ADMIN",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Ordre de priorité pour choisir l’espace UI quand un compte cumule des rôles. */
export const ROLE_PRIORITY: readonly AppRole[] = [
  "SUPER_ADMIN",
  "DIRECTOR",
  "ADMINISTRATION",
  "SURVEILLANT_GENERAL",
  "TEACHER",
  "PARENT",
  "STUDENT",
] as const;

/** Rôles proposés en connexion démo (si NEXT_PUBLIC_ENABLE_DEMO_LOGIN). */
export const DEMO_LOGIN_ROLES: AppRole[] = [
  "TEACHER",
  "PARENT",
  "ADMINISTRATION",
  "DIRECTOR",
  "SUPER_ADMIN",
  "STUDENT",
  "SURVEILLANT_GENERAL",
];

export type ProfileType = "STAFF" | "STUDENT" | "GUARDIAN" | "NONE";
export type AccountStatus = "PENDING" | "ACTIVE" | "LOCKED" | "DISABLED";

/** Compte tel que renvoyé par l’API (`UserAccountResponse`). */
export type UserAccountDto = {
  id: string;
  schoolId: string | null;
  username: string;
  roles: AppRole[];
  profileType: ProfileType;
  profileId: string | null;
  hasAvatar?: boolean;
  status: AccountStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};

export type AuthUser = {
  id: string;
  username: string;
  /** Préférence UI locale éventuelle — la fiche métier (Staff/Student) viendra plus tard. */
  displayName?: string;
  email?: string;
  /** Photo de profil UI (pas bulletin). */
  hasAvatar?: boolean;
  /** Rôle principal pour l’espace UI. */
  role: AppRole;
  /** Union des rôles du compte (cumul possible). */
  roles: AppRole[];
  /** null pour SUPER_ADMIN plateforme. */
  schoolId: string | null;
  profileType: ProfileType;
  profileId: string | null;
  status: AccountStatus;
  lastLoginAt?: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
  /** Résolu automatiquement (env / domaine) ; SUPER_ADMIN détecté côté API. */
  schoolId?: string | null;
  deviceLabel?: string;
};

/** Réponse brute `AuthTokensResponse` du backend. */
export type AuthTokensResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
  sessionId: string;
  mustChangePassword: boolean;
  user: UserAccountDto;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  expiresInMs: number;
  mustChangePassword: boolean;
  user: AuthUser;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type AuthSession = {
  accessToken: string | null;
  refreshToken: string | null;
  sessionId: string | null;
  user: AuthUser | null;
  mustChangePassword: boolean;
  /** true uniquement si connexion personas locales. */
  isMock: boolean;
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function normalizeRoles(roles: unknown): AppRole[] {
  if (!Array.isArray(roles)) return [];
  return roles.filter((r): r is AppRole => typeof r === "string" && isAppRole(r));
}

export function pickPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  for (const candidate of ROLE_PRIORITY) {
    if (roles.includes(candidate)) return candidate;
  }
  return roles[0] ?? null;
}

export function mapUserAccountDto(
  dto: UserAccountDto,
  local?: Pick<AuthUser, "displayName" | "email">,
): AuthUser {
  const roles = normalizeRoles(dto.roles);
  const role = pickPrimaryRole(roles) ?? "TEACHER";
  return {
    id: dto.id,
    username: dto.username,
    displayName: local?.displayName,
    email: local?.email,
    hasAvatar: Boolean(dto.hasAvatar),
    role,
    roles,
    schoolId: dto.schoolId,
    profileType: dto.profileType,
    profileId: dto.profileId,
    status: dto.status,
    lastLoginAt: dto.lastLoginAt,
  };
}

export function primaryRole(user: AuthUser | null): AppRole | null {
  if (!user) return null;
  return user.role ?? pickPrimaryRole(user.roles);
}

/** Droit effectif = union des rôles du compte. */
export function userHasRole(user: AuthUser | null, role: AppRole): boolean {
  if (!user) return false;
  return user.roles.includes(role) || user.role === role;
}

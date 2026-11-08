# Front — authentification & multi-tenant

## Principes

- **Multi-tenant** : le `schoolId` est résolu automatiquement (`NEXT_PUBLIC_DEFAULT_SCHOOL_ID`, sinon le hostname). Il n’est **pas** saisi au login. Si le username est un `SUPER_ADMIN` plateforme, l’API retombe sur le compte `schoolId = null`.
- **Login = e-mail** (unicité `(schoolId, username)` côté Mongo). Futur élève : l’admin renseigne l’e-mail sur le compte lié ; envoi MDP auto = feature ultérieure (matricule ≠ login).
- **Source de vérité** : le backend (`/api/v1/auth/*`).
- **Rôles** : union des rôles JWT ; l’espace UI suit `pickPrimaryRole` (`types/auth.ts`).
- **Pages `(app)`** : `AuthGuard` → `RoleGuard` → shell. `/change-password` : `ChangePasswordGuard`.

## Stockage des jetons

| Élément | Comportement |
|---|---|
| Access / refresh | Scellés au repos (`token-vault`, pas JWT en clair dans le storage) |
| Cookie `smels_session` | Opaque (`1`) pour le proxy — **plus** le JWT |
| Se souvenir de moi | E-mail mémorisé + session `localStorage` ; sinon `sessionStorage` |
| Évolution | Cookies HttpOnly via BFF |

## Flux

1. `POST /api/v1/auth/login` → tokens + user → toast **après** arrivée dashboard
2. 401 → `POST /api/v1/auth/refresh` (single-flight + `navigator.locks`) puis retry
3. `GET /api/v1/auth/me` + avatar `GET/PUT/DELETE /api/v1/auth/me/avatar` (UI only, pas bulletin)
4. `POST /api/v1/auth/change-password` → **nouveaux** tokens (`mcp` à jour)
5. `POST /api/v1/auth/logout` + purge locale

## Variables

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL API |
| `NEXT_PUBLIC_DEFAULT_SCHOOL_ID` | schoolId auto |
| `NEXT_PUBLIC_SCHOOL_DISPLAY_NAME` | Branding UI |
| `NEXT_PUBLIC_APP_DISPLAY_NAME` | Nom produit |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Personas sans API (dev UI) |

## Comptes mock back (dev)

Voir `back-office/docs/mock-logins.md`.

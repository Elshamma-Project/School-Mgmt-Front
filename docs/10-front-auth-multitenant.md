# Front — authentification & multi-tenant

## Principes

- **Multi-tenant** : le `schoolId` est résolu automatiquement (`NEXT_PUBLIC_DEFAULT_SCHOOL_ID`, sinon le hostname). Il n’est **pas** saisi au login. Si le username est un `SUPER_ADMIN` plateforme, l’API retombe sur le compte `schoolId = null`.
- **Source de vérité** : le backend (`/api/v1/auth/*`). Le front stocke access/refresh tokens + snapshot utilisateur, jamais de secret métier.
- **Rôles** : union des rôles JWT ; l’espace UI suit `pickPrimaryRole` (`types/auth.ts`).

## Variables

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL API |
| `NEXT_PUBLIC_DEFAULT_SCHOOL_ID` | Préremplissage login |
| `NEXT_PUBLIC_SCHOOL_DISPLAY_NAME` | Branding UI |
| `NEXT_PUBLIC_APP_DISPLAY_NAME` | Nom produit |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Personas sans API (dev UI) |

## Flux

1. `POST /api/v1/auth/login` → tokens + user
2. 401 → `POST /api/v1/auth/refresh` (single-flight) puis retry
3. `GET /api/v1/auth/me` sur le profil
4. `POST /api/v1/auth/change-password`
5. `POST /api/v1/auth/logout` + purge locale

## Comptes mock back (dev)

Voir `back-office/docs/mock-logins.md` (`directeur` / `DemoPass123!` / `school-demo-elshammah`).

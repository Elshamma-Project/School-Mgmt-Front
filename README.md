# SMELS — Front-office

Back-office Next.js (App Router) pour El Shammah — école bilingue FR/EN, Cameroun.

## Lancer en local

```bash
npm install
cp .env.example .env   # si besoin
npm run dev
```

- App : [http://localhost:3000](http://localhost:3000) → redirige vers `/fr/login`
- API REST : `NEXT_PUBLIC_API_BASE_URL` (défaut `http://localhost:8090`)
- Multi-tenant : `NEXT_PUBLIC_DEFAULT_SCHOOL_ID` (prérempli au login) — voir `docs/10-front-auth-multitenant.md`
- Auth réelle par défaut ; personas UI si `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true`
- Locales : `/fr/...` et `/en/...` (UI indépendante de la section scolaire)

### Tester la connexion (back mock)

| Username | Mot de passe | schoolId |
|---|---|---|
| `directeur` | `DemoPass123!` | `school-demo-elshammah` |
| `enseignant` | `DemoPass123!` | `school-demo-elshammah` |
| `superadmin` | `DemoPass123!` | *(détecté auto — même formulaire)* |

## Docker (`setup/`)

```bash
cd setup
docker compose up --build
```

## Structure

`app/[locale]/(auth|app)` · `components/{ui,layout,auth}` · `i18n` · `lib/api` · `stores` · `messages`

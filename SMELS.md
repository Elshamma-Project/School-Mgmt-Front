# SMELS front-office — règles assistants

> Complète `AGENTS.md` (règles Next.js générées). Lire aussi `docs/10-front-auth-multitenant.md`.

## Multi-tenant

- Jamais d’identifiant d’établissement **hardcodé** dans la logique : `schoolId` vient du login, du JWT / `/me`, ou de `NEXT_PUBLIC_DEFAULT_SCHOOL_ID` (préremplissage uniquement).
- Branding (`NEXT_PUBLIC_SCHOOL_DISPLAY_NAME`, `NEXT_PUBLIC_APP_DISPLAY_NAME`) = paramètres de déploiement, pas de règles métier.
- Toute requête métier doit pouvoir cibler l’école du jeton (ou un `schoolId` explicite pour `SUPER_ADMIN`).

## Auth

- API réelle : `lib/api/auth.ts` + refresh 401 dans `lib/api/client.ts`.
- Mode démo personas uniquement si `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true`.
- Ne jamais stocker ni logger de mots de passe, ni d’identifiants élèves nominatifs.

## Stack UI

Next.js App Router, next-intl FR/EN, zustand, composants `components/ui`.

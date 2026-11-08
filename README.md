# SMELS — Front-office

Back-office Next.js (App Router) pour El Shammah — école bilingue FR/EN, Cameroun.

## Lancer en local

```bash
npm install
cp .env.example .env   # si besoin
npm run dev
```

- App : [http://localhost:3000](http://localhost:3000) → redirige vers `/fr/login`
- API REST attendue : `NEXT_PUBLIC_API_BASE_URL` (défaut `http://localhost:8090`)
- Locales : `/fr/...` et `/en/...` (UI indépendante de la section scolaire)

## Docker (`setup/`)

```bash
cd setup
docker compose up --build
```

## Structure

`app/[locale]/(auth|app)` · `components/{ui,layout,auth}` · `i18n` · `lib/api` · `stores` · `messages`

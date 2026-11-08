### SMELS front — Docker

Depuis `setup/` :

```bash
cp .env.example .env   # si besoin
docker compose up --build
```

L’image est construite depuis la racine du repo (`context: ..`). L’app écoute sur http://localhost:3000.

Variables dans `setup/.env` :
- `NEXT_PUBLIC_API_BASE_URL` — API depuis le conteneur (défaut `http://host.docker.internal:8090`)
- `NODE_ENV=production`

`NEXT_PUBLIC_*` est passé en **build-arg** (requis pour le bundle Next.js). Après un changement d’URL API : `docker compose up --build`.

Voir aussi le README racine pour le flux `npm run dev` (fichier `.env` à la racine).

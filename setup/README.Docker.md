### SMELS front — Docker

Depuis `setup/` :

```bash
docker compose up --build
```

L’image est construite depuis la racine du repo (`context: ..`). L’app écoute sur http://localhost:3000.

Variable utile : `NEXT_PUBLIC_API_BASE_URL` (défaut `http://host.docker.internal:8090`).

Voir aussi le README racine pour le flux `npm run dev`.

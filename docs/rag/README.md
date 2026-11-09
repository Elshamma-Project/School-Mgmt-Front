# Base d’aide SMELS (`docs/rag`)

Source unique des textes du menu **?** (topbar).

## Workflow

1. Éditer / ajouter un fichier `docs/rag/<id>.md` (sauf `README.md`).
2. Lancer `npm run help:sync` (aussi en `predev` / `prebuild`).
3. Le script écrit `lib/help/generated-catalog.ts`.
4. Le menu **?** résout l’article selon la route courante.

## Format Markdown

```md
---
id: academic-class-detail
priority: 50
routes:
  - path: /academic/classes/*
    excludeLast:
      - create
title:
  fr: Fiche classe
  en: Class detail
---

## FR

### Organisation

Paragraphe…

- Puce

## EN

### Organisation

Paragraph…

- Bullet
```

### Routes (chemin normalisé)

Sans préfixe rôle (`/administration`, `/director`…).

| Motif | Effet |
|---|---|
| `/academic` | exact |
| `/academic/classes/*` | un segment (fiche) |
| `/academic/**` | préfixe |
| `/**` | fallback |

`excludeLast` ignore p.ex. `create`.

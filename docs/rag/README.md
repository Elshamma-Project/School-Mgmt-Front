# Base d’aide SMELS (RAG / aide contextuelle)

Ces fichiers Markdown alimentent le menu **?** de la barre supérieure.

## Convention

Chaque article a un équivalent runtime dans `lib/help/catalog.ts` (bundle client).

Frontmatter logique (reproduit dans le catalogue) :

| Champ | Rôle |
|---|---|
| `id` | Identifiant stable |
| `priority` | Plus haut = gagne si plusieurs règles matchent |
| `routes` | Chemins **normalisés** (sans `/administration`, `/director`…) |
| `title` / sections | FR + EN |

### Chemins normalisés

Exemples :

- `/academic` — hub académique
- `/academic?tab=subjects` — onglet matières
- `/academic/classes/create` — création
- `/academic/classes/*` — fiche classe

## Ajouter une aide

1. Créer `docs/rag/<id>.md` (documentation + futur RAG).
2. Ajouter l’article dans `lib/help/catalog.ts` avec les mêmes `routes` / textes.
3. Le menu **?** affiche automatiquement l’article le plus prioritaire pour la page courante.

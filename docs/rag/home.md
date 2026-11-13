---
id: home
priority: 20
routes:
  - path: /
title:
  fr: Accueil
  en: Home
---

## FR

### Tableau de bord

L’accueil appelle `GET /api/v1/dashboard/summary` (module portal) : un seul agrégat adapté au rôle.

Blocs possibles : indicateurs (élèves, inscrits, personnel, séquences, fiches, corrections, notifications), répartition des séquences, progression de saisie, file des fiches de report, effectifs par cycle, échéances de saisie, charge enseignant (affectations / heures), activité récente et raccourcis modules.

Les pastilles d’attention signalent ce qui attend une action (visa, correction, échéance, non lues).

En mode démo, le badge Démo reste visible ; aucune donnée réelle d’élève n’est inventée.

## EN

### Dashboard

Home calls `GET /api/v1/dashboard/summary` (portal module): one role-aware aggregate.

Possible blocks: indicators (students, enrolled, staff, sequences, sheets, corrections, notifications), sequence breakdown, entry progress, report-sheet queue, headcount by cycle, entry deadlines, teacher workload, recent activity and module shortcuts.

Attention chips highlight what needs action (visa, correction, deadline, unread).

In demo mode, the Demo badge stays visible; no real student data is invented.

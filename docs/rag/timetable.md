---
id: timetable
priority: 30
routes:
  - path: /timetable
  - path: /timetable/**
title:
  fr: Emploi du temps
  en: Timetable
---

## FR

### Année scolaire

L’EDT s’appuie sur les classes, salles et matières de classe (`ClassSubject`) de l’année courante. C’est une **semaine type** valable toute l’année (pas un calendrier semaine par semaine).

### Qui voit quoi

- **Administration / directeur** : édition, publication, conflits, demandes de créneau, PDF.
- **Surveillant général** : consultation (édition seulement si l’école l’a autorisée).
- **Enseignant** : ses cours + vue générale ; peut **demander une modification** sur ses cases publiées.
- **Parent / élève** : consultation de la classe concernée + vue générale + PDF.

### Publication

Quand l’administration **publie** (ou republicie) l’emploi du temps, **tous** les comptes scolaires reçoivent une notification. Le bouton « Ouvrir » mène à la page EDT de votre espace.

### Nouvelle classe après publication

Si une **nouvelle classe** est ajoutée alors que l’EDT est déjà publié et qu’elle n’a encore **aucun cours**, l’administration (et le directeur) reçoivent une alerte « EDT à mettre à jour ». Ils créent une révision, saisissent les créneaux, puis republient — et tout le monde est alors notifié.

### Grille et examens

L’onglet **Grille** permet de modifier périodes, pauses et horaires. L’onglet **Examens** affiche les dates de composition des séquences (même données que Notes / Séquences) ; toute modification notifie tous les utilisateurs.

### Mise en page PDF

Une page **A4 paysage** par classe — jamais de deuxième page.

### Demande de modification (enseignant)

Sur une de vos cases publiées : ouvrez le détail puis **Demander une modification**. Indiquez un motif (au moins 15 caractères). L’administration ou le directeur valide ou refuse (BR-67).

### Conflits (administration)

Dans l’onglet **Conflits**, cliquez une ligne pour ouvrir la case dans l’éditeur.

- **TEACHER_OVERLAP** (même enseignant sur plusieurs classes) : **Lier en séance commune** ou **Lier automatiquement**.
- **CLASS_OVERLAP** / **ROOM_OVERLAP** : bloquants — à corriger avant publication.
- **HOURS_MISMATCH** : avertissement (volume EDT ≠ heures hebdomadaires de la matière).

### Options LV2 et samedi

Les options parallèles (ALL / ESP) partagent le même créneau avec des codes d’option distincts. Les cours du samedi utilisent des **heures libres** (hors grille lun–ven).

## EN

### School year

The timetable uses classes, rooms and class subjects of the current year. It is a **typical week** for the whole year (not a week-by-week calendar).

### Who sees what

- **Administration / director**: edit, publish, conflicts, slot-change requests, PDF.
- **Supervisor (SG)**: read-only (edit only if the school enabled it).
- **Teacher**: own lessons + general view; can **request a change** on published slots.
- **Parent / student**: class view + general view + PDF.

### Publication

When administration **publishes** (or re-publishes) the timetable, **every** school account gets a notification. “Open” goes to the timetable page of your workspace.

### New class after publication

If a **new class** is added while the timetable is already published and it still has **no lessons**, administration (and the director) get a “Timetable update needed” alert. They revise, add slots, then publish again — and everyone is notified.

### Grid and exams

The **Grid** tab edits periods, breaks and times. The **Exams** tab shows sequence exam dates (same data as Grades / Sequences); any change notifies all users.

### PDF layout

One **A4 landscape** page per class — never a second page.

### Request a change (teacher)

On one of your published slots: open the detail, then **Request a change**. Give a reason (at least 15 characters). Administration or the director approves or rejects (BR-67).

### Conflicts (administration)

In the **Conflicts** tab, click a row to open the slot in the editor.

- **TEACHER_OVERLAP** (same teacher across classes): **Link as joint session** or **Link automatically**.
- **CLASS_OVERLAP** / **ROOM_OVERLAP**: blocking — fix before publish.
- **HOURS_MISMATCH**: warning (scheduled periods ≠ weekly hours).

### LV2 options and Saturday

Parallel options (ALL / ESP) share a slot with distinct option codes. Saturday lessons use **custom times** (outside the Mon–Fri grid).

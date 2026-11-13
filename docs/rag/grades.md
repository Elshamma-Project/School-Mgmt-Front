---
id: grades
priority: 30
routes:
  - path: /grades
  - path: /grades/**
  - path: /sequences
  - path: /sequences/**
title:
  fr: Notes
  en: Grades
---

## FR

### Année scolaire

Les séquences et barèmes s’inscrivent dans l’année courante. Les classes sont liées à cette année.

### Trimestre actif et ouverture (BR-25)

Chaque séquence (DEV1…DEV6) correspond à une session d’évaluation. L’administration (ou le directeur) ouvre et clôture les sessions.

- Au plus **2** séquences peuvent être **ouvertes** en même temps.
- Ces séquences ouvertes appartiennent forcément au **même trimestre** (T1 = séq. 1–2, T2 = 3–4, T3 = 5–6).
- Il n’y a donc qu’**un trimestre actif** à la fois, paramétré par l’administration — pas un choix libre de l’enseignant.
- La saisie des notes n’est possible que sur une séquence **ouverte**. Un autre trimestre reste en consultation / fiche de report seulement.

### Saisie enseignant

Les enseignants saisissent les notes de leurs ClassSubject lorsque la séquence est ouverte.

Sur la fiche de report, saisissez **Comp. /20** dans les **cases bleues** (séquence ouverte uniquement). L’enregistrement est **automatique** et la fiche se **régénère** ensuite : **Coef.**, **Note × coef.**, **Rang** et **App.** se recalculent tout seuls (après une courte pause ou en quittant la case — pas de bouton Enregistrer). Une note non saisie reste PENDING, jamais 0.

Bonus et malus se gèrent via **Bonus / malus** (saisie complète ; même enregistrement automatique ; formule : moyenne + bonus − malus, plafond 20).

### Fiche de report

La fiche de report est un instantané trimestriel. Affichez une séquence à la fois par défaut, ou les deux si besoin. Soumission enseignant → visa Surveillant Général → visa Principal.

Le bouton **Actualiser** s’exécute immédiatement (sans confirmation) : il recharge l’effectif (nouveaux élèves ajoutés), recalcule rangs / appréciations **sans effacer** les notes déjà saisies, et **repasse la fiche en brouillon**. **Générer vierge** vide volontairement toutes les cellules de notes.

**Visa enseignant automatique (BR-79)** : lorsqu’un administrateur ou le directeur **clôture** une séquence, toutes les fiches de report du trimestre encore en brouillon (ou rejetées) passent automatiquement en « soumise » — le visa enseignant est posé sans action manuelle. Les fiches déjà visées SG / Principal ne sont pas touchées.

**Visa Principal (BR-83)** : dès que le Principal (directeur) pose son visa, les visas encore manquants (enseignant et Surveillant Général) sont **complétés automatiquement**. Les trois pastilles « verified » apparaissent alors sur la fiche.

**Correction après clôture (BR-80)** : une fois la séquence **clôturée**, une colonne **Corr.** apparaît sur la fiche de report. L’enseignant propose une nouvelle Comp./20 avec un **motif** (≥ 15 caractères) et jusqu’à **3 pièces** (JPEG/PNG/WebP/PDF, 5 Mo). La demande reste en attente. **Seul le directeur** (onglet Corrections) peut **approuver** (écrit la note + audit) ou **rejeter** (motif de revue).

Délai indicatif : déposer la fiche dans les **72 h** après la séquence (avertissement seulement tant que le barème ne bloque pas — BR-77).

## EN

### School year

Sequences and schemes belong to the current year. Classes are tied to that year.

### Active term and opening (BR-25)

Each sequence (DEV1…DEV6) is an evaluation session. Administration (or the director) opens and closes sessions.

- At most **2** sequences can be **open** at the same time.
- Open sequences must belong to the **same term** (T1 = seq. 1–2, T2 = 3–4, T3 = 5–6).
- So there is only **one active term** at a time, set by the administration — not a free teacher choice.
- Grade entry is only possible on an **open** sequence. Another term stays view / report-sheet only.

### Teacher entry

Teachers enter grades for their ClassSubjects while the sequence is open.

On the report sheet, enter **Mark /20** in the **blue cells** (open sequence only). Saving is **automatic** and the sheet then **regenerates**: **Coef.**, **weighted mark**, **rank** and **appreciation** recalculate on their own (after a short pause or when leaving the cell — no Save button). An unentered grade stays PENDING, never 0.

Bonus and malus are managed via **Bonus / malus** (full entry; same auto-save; formula: average + bonus − malus, capped at 20).

### Report sheet

The report sheet is a term snapshot. Show one sequence by default, or both if needed. Teacher submit → Supervisor visa → Principal visa.

The **Refresh** button runs immediately (no confirmation): it updates the roster (new students added), recalculates ranks / appreciations **without clearing** existing marks, and **returns the sheet to draft**. **Generate blank** intentionally clears all mark cells.

**Automatic teacher visa (BR-79)**: when an administrator or the director **closes** a sequence, every still-draft (or rejected) report sheet for that term is auto-submitted — the teacher visa is stamped without a manual action. Sheets already visaed by Supervisor / Principal are left unchanged.

**Principal visa (BR-83)**: as soon as the Principal (director) stamps their visa, any still-missing teacher and Supervisor visas are **completed automatically**. All three verified badges then appear on the sheet.

**Post-close correction (BR-80)**: once a sequence is **closed**, a **Corr.** column appears on the report sheet. The teacher proposes a new Mark/20 with a **reason** (≥ 15 characters) and up to **3 files** (JPEG/PNG/WebP/PDF, 5 MB). The request stays pending. **Only the director** (Corrections tab) can **approve** (persists the mark + audit) or **reject** (review note).

Indicative deadline: submit the sheet within **72 h** after the sequence (warning only unless the scheme blocks — BR-77).

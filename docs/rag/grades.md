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

Sur la fiche de report, saisissez **Comp. /20** dans les **cases bleues** (séquence ouverte uniquement). **Coef.**, **Note × coef.**, **Rang** et **App.** se recalculent automatiquement. L’enregistrement est **automatique** (après une courte pause ou en quittant la case) — pas besoin de bouton Enregistrer. Une note non saisie reste PENDING, jamais 0.

Bonus et malus se gèrent via **Bonus / malus** (saisie complète ; même enregistrement automatique ; formule : moyenne + bonus − malus, plafond 20).

### Fiche de report

La fiche de report est un instantané trimestriel. Affichez une séquence à la fois par défaut, ou les deux si besoin. Soumission → visa Surveillant Général → visa Principal.

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

On the report sheet, enter **Mark /20** in the **blue cells** (open sequence only). **Coef.**, **weighted mark**, **rank** and **appreciation** recalculate automatically. Saving is **automatic** (after a short pause or when leaving the cell) — no Save button. An unentered grade stays PENDING, never 0.

Bonus and malus are managed via **Bonus / malus** (full entry; same auto-save; formula: average + bonus − malus, capped at 20).

### Report sheet

The report sheet is a term snapshot. Show one sequence by default, or both if needed. Submit → Supervisor visa → Principal visa.

Indicative deadline: submit the sheet within **72 h** after the sequence (warning only unless the scheme blocks — BR-77).

---
id: notifications
priority: 25
routes:
  - path: /notifications
  - path: /notifications/**
title:
  fr: Notifications
  en: Notifications
---

## FR

### À propos

Canal officiel de l’établissement : alertes, accusés de réception et signalements.

### Canal professionnel

Espace professionnel uniquement. Pas de discussion entre enseignants. Les signalements partent vers l’administration ou la direction, avec suivi et accusé de réception.

La page Notifications est le **canal officiel** de l’établissement. Il n’y a **pas de discussion** entre enseignants, ni de messagerie libre.

### Clôture de séquence (BR-81)

Quand l’administration ou le directeur **clôture** une séquence, chaque enseignant titulaire concerné reçoit une notification bilingue. **Ouvrir** le message le marque lu et pose l’**accusé de réception** pour l’expéditeur. Vous pouvez le remettre **non lu** pour vous (relecture) : l’accusé reste.

### Signalements (BR-82)

Un enseignant peut **signaler** une erreur de données, un problème de notes, une information manquante ou un souci d’accès. L’administration / direction **accuse réception** puis **clôture**. Pas de réponses en chaîne : un seul message officiel, suivi par statut.

### Liens et synchronisation

Chaque notification peut porter un **lien métier** (deep link) : clôture → fiches enseignant (`/teacher/grades?term=…`), correction à revoir → `/director/sequences?tab=corrections`, fiche rejetée → matière concernée, signalement → onglet Signalements. Ouvrir le message le marque lu (et pose l’accusé si requis) ; le bouton d’action suit le lien dans l’espace de votre rôle.

### Cloche

Le badge dans l’en-tête indique le nombre de notifications non lues. Depuis la cloche, un clic ouvre la notification dans la boîte (`?open=`).

## EN

### About

Official school channel: alerts, acknowledgements and reports.

### Professional channel

Professional space only. No teacher-to-teacher chat. Reports go to administration or the director, with tracking and acknowledgement.

The Notifications page is the school’s **official channel**. There is **no teacher-to-teacher chat** and no free messaging.

### Sequence close (BR-81)

When administration or the director **closes** a sequence, each concerned assigned teacher gets a bilingual notification. **Opening** the message marks it read and records the **acknowledgement** for the sender. You may mark it **unread** for yourself (to re-read later); the acknowledgement stays.

### Reports (BR-82)

A teacher can **report** a data error, grade issue, missing information or access problem. Administration / director **acknowledge** then **close**. No reply threads: one official message, tracked by status.

### Links and sync

Each notification may carry a **deep link**: sequence close → teacher grades (`/teacher/grades?term=…`), correction review → `/director/sequences?tab=corrections`, rejected sheet → the related subject, staff report → Signals tab. Opening the message marks it read (and acknowledges when required); the action button follows the link in your role workspace.

### Bell

The header badge shows the unread notification count. From the bell, a click opens the notification in the inbox (`?open=`).

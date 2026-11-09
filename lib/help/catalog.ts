import type { HelpArticle } from "@/lib/help/types";

/**
 * Catalogue runtime (bundle client).
 * Garder synchronisé avec `docs/rag/*.md` — voir `docs/rag/README.md`.
 */
export const HELP_CATALOG: HelpArticle[] = [
  {
    id: "academic-hub",
    source: "docs/rag/academic-hub.md",
    priority: 30,
    routes: [{ path: "/academic" }],
    title: { fr: "Académique — référentiels", en: "Academic — references" },
    sections: [
      {
        heading: { fr: "À quoi sert cette page ?", en: "What is this page for?" },
        paragraphs: [
          {
            fr: "Le hub Académique regroupe les référentiels de l’établissement.",
            en: "The Academic hub holds the school’s reference data.",
          },
        ],
        bullets: [
          {
            fr: "Classes — année scolaire + niveau",
            en: "Classes — school year + level",
          },
          {
            fr: "Matières — catalogue bilingue permanent",
            en: "Subjects — permanent bilingual catalogue",
          },
          {
            fr: "Groupes — sous-totaux des bulletins",
            en: "Groups — report-card subtotals",
          },
          {
            fr: "Salles — emploi du temps",
            en: "Rooms — timetable",
          },
          {
            fr: "Niveaux — parcours pédagogique",
            en: "Levels — curriculum ladder",
          },
        ],
      },
      {
        heading: { fr: "Qui peut modifier ?", en: "Who can edit?" },
        paragraphs: [
          {
            fr: "Créer, modifier et désactiver : Administration et Direction. Les autres rôles consultent en lecture seule.",
            en: "Create, edit and deactivate: Administration and Director. Other roles are read-only.",
          },
        ],
      },
    ],
  },
  {
    id: "academic-class-detail",
    source: "docs/rag/academic-class-detail.md",
    priority: 50,
    routes: [{ path: "/academic/classes/*", excludeLast: ["create"] }],
    title: { fr: "Fiche classe", en: "Class detail" },
    sections: [
      {
        heading: { fr: "Organisation", en: "Organisation" },
        paragraphs: [
          {
            fr: "Langue des documents, salle principale, professeur principal et barème se règlent ici.",
            en: "Document language, home room, form teacher and grading scheme are set here.",
          },
        ],
      },
      {
        heading: { fr: "Matières de la classe", en: "Class subjects" },
        paragraphs: [
          {
            fr: "C’est ici que vous affectez une matière, fixez le coefficient et choisissez l’enseignant (ClassSubject).",
            en: "This is where you assign a subject, set the coefficient and choose the teacher (ClassSubject).",
          },
        ],
        bullets: [
          {
            fr: "Coefficient — poids dans la moyenne",
            en: "Coefficient — weight in the average",
          },
          {
            fr: "Enseignant — titulaire pour notes et EDT",
            en: "Teacher — titular for grades and timetable",
          },
          {
            fr: "Groupe — sous-total sur le bulletin",
            en: "Group — report-card subtotal",
          },
        ],
      },
    ],
  },
  {
    id: "academic-subject-detail",
    source: "docs/rag/academic-subject-detail.md",
    priority: 50,
    routes: [{ path: "/academic/subjects/*", excludeLast: ["create"] }],
    title: { fr: "Fiche matière", en: "Subject detail" },
    sections: [
      {
        heading: { fr: "Catalogue seulement", en: "Catalogue only" },
        paragraphs: [
          {
            fr: "Code, libellés FR/EN, abrégés, type et alias EDT. Pas de coefficient ni d’enseignant ici.",
            en: "Code, FR/EN labels, shorts, kind and timetable alias. No coefficient or teacher here.",
          },
          {
            fr: "Pour le coef et l’enseignant : ouvrez une classe → Matières de la classe.",
            en: "For coefficient and teacher: open a class → Class subjects.",
          },
        ],
      },
    ],
  },
  {
    id: "academic-level-detail",
    source: "docs/rag/academic-level-detail.md",
    priority: 50,
    routes: [{ path: "/academic/levels/*", excludeLast: ["create"] }],
    title: { fr: "Fiche niveau", en: "Level detail" },
    sections: [
      {
        heading: { fr: "Rôle du niveau", en: "Role of a level" },
        paragraphs: [
          {
            fr: "Ancre les classes dans le parcours (cycle, section, ordre, niveau suivant, barème par défaut).",
            en: "Anchors classes in the curriculum (cycle, section, order, next level, default scheme).",
          },
        ],
      },
    ],
  },
  {
    id: "academic-group-detail",
    source: "docs/rag/academic-group-detail.md",
    priority: 50,
    routes: [{ path: "/academic/groups/*", excludeLast: ["create"] }],
    title: { fr: "Fiche groupe", en: "Group detail" },
    sections: [
      {
        heading: { fr: "Sous-totaux bulletin", en: "Report-card subtotals" },
        paragraphs: [
          {
            fr: "L’ordre d’affichage contrôle la séquence des groupes sur le PDF. Le rattachement matière ↔ groupe se fait à l’affectation en classe.",
            en: "Display order controls group sequence on the PDF. Subject ↔ group is set when assigning to a class.",
          },
        ],
      },
    ],
  },
  {
    id: "academic-room-detail",
    source: "docs/rag/academic-room-detail.md",
    priority: 50,
    routes: [{ path: "/academic/rooms/*", excludeLast: ["create"] }],
    title: { fr: "Fiche salle", en: "Room detail" },
    sections: [
      {
        heading: { fr: "Usage", en: "Usage" },
        paragraphs: [
          {
            fr: "Type et capacité. Les classes qui utilisent cette salle comme salle principale sont listées. L’EDT pourra y placer des cours.",
            en: "Type and capacity. Classes using this room as home room are listed. The timetable may schedule lessons here.",
          },
        ],
      },
    ],
  },
  {
    id: "academic-create",
    source: "docs/rag/academic-hub.md",
    priority: 55,
    routes: [
      { path: "/academic/classes/create" },
      { path: "/academic/subjects/create" },
      { path: "/academic/levels/create" },
      { path: "/academic/groups/create" },
      { path: "/academic/rooms/create" },
    ],
    title: { fr: "Création académique", en: "Academic create" },
    sections: [
      {
        heading: { fr: "Création", en: "Create" },
        paragraphs: [
          {
            fr: "Renseignez les champs obligatoires. Les codes (niveau, matière, groupe) sont stables : évitez de les changer après coup.",
            en: "Fill required fields. Codes (level, subject, group) are stable — avoid changing them later.",
          },
        ],
      },
    ],
  },
  {
    id: "staff",
    source: "docs/rag/fallback.md",
    priority: 30,
    routes: [{ path: "/staff/**" }],
    title: { fr: "Personnel", en: "Staff" },
    sections: [
      {
        heading: { fr: "Fiches personnel", en: "Staff records" },
        paragraphs: [
          {
            fr: "Consultez identité, fonctions et affectations d’enseignement (ClassSubject) sur la fiche d’un enseignant.",
            en: "View identity, functions and teaching assignments (ClassSubject) on a teacher’s record.",
          },
        ],
      },
    ],
  },
  {
    id: "profile",
    source: "docs/rag/fallback.md",
    priority: 30,
    routes: [{ path: "/profile/**" }, { path: "/profile" }],
    title: { fr: "Profil", en: "Profile" },
    sections: [
      {
        heading: { fr: "Compte", en: "Account" },
        paragraphs: [
          {
            fr: "Identité d’affichage, photo (jamais sur les bulletins) et sécurité des sessions.",
            en: "Display identity, photo (never on report cards) and session security.",
          },
        ],
      },
    ],
  },
  {
    id: "fallback",
    source: "docs/rag/fallback.md",
    priority: 0,
    routes: [{ path: "/**" }],
    title: { fr: "Aide SMELS", en: "SMELS help" },
    sections: [
      {
        heading: { fr: "Menu d’aide", en: "Help menu" },
        paragraphs: [
          {
            fr: "Le bouton ? affiche l’aide de la page en cours. Les consignes métier sont centralisées ici plutôt que sous chaque bloc de l’interface.",
            en: "The ? button shows help for the current page. Business guidance lives here instead of under every UI block.",
          },
        ],
      },
    ],
  },
];

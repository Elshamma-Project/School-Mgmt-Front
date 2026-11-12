/* eslint-disable */
/**
 * GÉNÉRÉ — ne pas éditer à la main.
 * Source : docs/rag/*.md
 * Commande : npm run help:sync
 */
import type { HelpArticle } from "@/lib/help/types";

export const HELP_CATALOG: HelpArticle[] = [
  {
    "id": "academic-create",
    "source": "docs/rag/academic-create.md",
    "priority": 55,
    "routes": [
      {
        "path": "/academic/classes/create"
      },
      {
        "path": "/academic/subjects/create"
      },
      {
        "path": "/academic/levels/create"
      },
      {
        "path": "/academic/groups/create"
      },
      {
        "path": "/academic/rooms/create"
      }
    ],
    "title": {
      "fr": "Création académique",
      "en": "Academic create"
    },
    "sections": [
      {
        "heading": {
          "fr": "Création",
          "en": "Create"
        },
        "paragraphs": [
          {
            "fr": "Renseignez les champs obligatoires. Les codes (niveau, matière, groupe) sont stables : évitez de les changer après coup.",
            "en": "Fill required fields. Codes (level, subject, group) are stable — avoid changing them later."
          }
        ],
        "bullets": [
          {
            "fr": "Niveau : code, libellés FR/EN, cycle et section",
            "en": "Level: code, FR/EN labels, cycle and section"
          },
          {
            "fr": "Classe : année scolaire + niveau ; langue des documents",
            "en": "Class: school year + level; document language"
          },
          {
            "fr": "Matière : catalogue bilingue (ACADEMIC ou ACTIVITY)",
            "en": "Subject: bilingual catalogue (ACADEMIC or ACTIVITY)"
          },
          {
            "fr": "Groupe : bloc de sous-total bulletin, ordre d’affichage",
            "en": "Group: report-card subtotal block, display order"
          },
          {
            "fr": "Salle : type et capacité optionnelle",
            "en": "Room: type and optional capacity"
          }
        ]
      }
    ]
  },
  {
    "id": "academic-class-detail",
    "source": "docs/rag/academic-class-detail.md",
    "priority": 50,
    "routes": [
      {
        "path": "/academic/classes/*",
        "excludeLast": [
          "create"
        ]
      }
    ],
    "title": {
      "fr": "Fiche classe",
      "en": "Class detail"
    },
    "sections": [
      {
        "heading": {
          "fr": "Lecture seule",
          "en": "Read-only"
        },
        "paragraphs": [
          {
            "fr": "Sans le droit de gestion de la structure scolaire (Administration / Direction), la fiche est en consultation seule.",
            "en": "Without school-structure management rights (Administration / Director), the record is read-only."
          }
        ]
      },
      {
        "heading": {
          "fr": "Organisation",
          "en": "Organisation"
        },
        "paragraphs": [
          {
            "fr": "Langue des documents, salle principale, professeur principal et barème se règlent ici.",
            "en": "Document language, home room, form teacher and grading scheme are set here."
          }
        ]
      },
      {
        "heading": {
          "fr": "Matières de la classe",
          "en": "Class subjects"
        },
        "paragraphs": [
          {
            "fr": "C’est ici que vous affectez une matière, fixez le coefficient et choisissez l’enseignant (ClassSubject).",
            "en": "This is where you assign a subject, set the coefficient and choose the teacher (ClassSubject)."
          }
        ],
        "bullets": [
          {
            "fr": "Coefficient — poids dans la moyenne",
            "en": "Coefficient — weight in the average"
          },
          {
            "fr": "Enseignant — titulaire pour notes et EDT",
            "en": "Teacher — titular for grades and timetable"
          },
          {
            "fr": "Groupe — sous-total sur le bulletin",
            "en": "Group — report-card subtotal"
          }
        ]
      },
      {
        "heading": {
          "fr": "Élèves de la classe",
          "en": "Class students"
        },
        "paragraphs": [
          {
            "fr": "Inscriptions de l’année scolaire liée à cette classe.",
            "en": "Enrollments for the academic year linked to this class."
          }
        ],
        "bullets": [
          {
            "fr": "Liste paginée (10, 20, 50 ou 100 par page)",
            "en": "Paginated list (10, 20, 50 or 100 per page)"
          },
          {
            "fr": "N° d’ordre, matricule, statut et particularités (redoublant, nouveau)",
            "en": "Roll number, student ID, status and flags (repeater, new)"
          },
          {
            "fr": "Ajouter un élève via recherche nominative, modifier une inscription ou la retirer / la réactiver (Administration / Direction)",
            "en": "Add a student via name search, edit an enrollment or withdraw / reactivate it (Administration / Director)"
          },
          {
            "fr": "N° d’ordre automatique selon l’ordre alphabétique dans la classe",
            "en": "Roll number is automatic by alphabetical order in the class"
          }
        ]
      }
    ]
  },
  {
    "id": "academic-group-detail",
    "source": "docs/rag/academic-group-detail.md",
    "priority": 50,
    "routes": [
      {
        "path": "/academic/groups/*",
        "excludeLast": [
          "create"
        ]
      }
    ],
    "title": {
      "fr": "Fiche groupe",
      "en": "Group detail"
    },
    "sections": [
      {
        "heading": {
          "fr": "Sous-totaux bulletin",
          "en": "Report-card subtotals"
        },
        "paragraphs": [
          {
            "fr": "L’ordre d’affichage contrôle la séquence des groupes sur le PDF. Le rattachement matière ↔ groupe se fait à l’affectation en classe.",
            "en": "Display order controls group sequence on the PDF. Subject ↔ group is set when assigning to a class."
          }
        ]
      }
    ]
  },
  {
    "id": "academic-level-detail",
    "source": "docs/rag/academic-level-detail.md",
    "priority": 50,
    "routes": [
      {
        "path": "/academic/levels/*",
        "excludeLast": [
          "create"
        ]
      }
    ],
    "title": {
      "fr": "Fiche niveau",
      "en": "Level detail"
    },
    "sections": [
      {
        "heading": {
          "fr": "Rôle du niveau",
          "en": "Role of a level"
        },
        "paragraphs": [
          {
            "fr": "Ancre les classes dans le parcours (cycle, section, ordre, niveau suivant, barème par défaut).",
            "en": "Anchors classes in the curriculum (cycle, section, order, next level, default scheme)."
          }
        ]
      }
    ]
  },
  {
    "id": "academic-room-detail",
    "source": "docs/rag/academic-room-detail.md",
    "priority": 50,
    "routes": [
      {
        "path": "/academic/rooms/*",
        "excludeLast": [
          "create"
        ]
      }
    ],
    "title": {
      "fr": "Fiche salle",
      "en": "Room detail"
    },
    "sections": [
      {
        "heading": {
          "fr": "Usage",
          "en": "Usage"
        },
        "paragraphs": [
          {
            "fr": "Type et capacité. Les classes qui utilisent cette salle comme salle principale sont listées. L’EDT pourra y placer des cours.",
            "en": "Type and capacity. Classes using this room as home room are listed. The timetable may schedule lessons here."
          }
        ]
      }
    ]
  },
  {
    "id": "academic-subject-detail",
    "source": "docs/rag/academic-subject-detail.md",
    "priority": 50,
    "routes": [
      {
        "path": "/academic/subjects/*",
        "excludeLast": [
          "create"
        ]
      }
    ],
    "title": {
      "fr": "Fiche matière",
      "en": "Subject detail"
    },
    "sections": [
      {
        "heading": {
          "fr": "Catalogue seulement",
          "en": "Catalogue only"
        },
        "paragraphs": [
          {
            "fr": "Code, libellés FR/EN, abrégés, type et alias EDT. Pas de coefficient ni d’enseignant ici.",
            "en": "Code, FR/EN labels, shorts, kind and timetable alias. No coefficient or teacher here."
          }
        ]
      },
      {
        "heading": {
          "fr": "Affectation aux classes",
          "en": "Assignment to classes"
        },
        "paragraphs": [
          {
            "fr": "Pour attribuer cette matière à un enseignant ou fixer son coefficient, ouvrez la fiche d’une classe puis ajoutez / modifiez la matière dans « Matières de la classe ».",
            "en": "To assign a teacher or set the coefficient for this subject, open a class record then add / edit the subject under “Class subjects”."
          }
        ]
      }
    ]
  },
  {
    "id": "academic-hub",
    "source": "docs/rag/academic-hub.md",
    "priority": 30,
    "routes": [
      {
        "path": "/academic"
      }
    ],
    "title": {
      "fr": "Académique — référentiels",
      "en": "Academic — references"
    },
    "sections": [
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "School year"
        },
        "paragraphs": [
          {
            "fr": "Les classes sont liées à l’année courante ; niveaux, matières et groupes sont permanents.",
            "en": "Classes belong to the current year; levels, subjects and groups are permanent."
          }
        ]
      },
      {
        "heading": {
          "fr": "À quoi sert cette page ?",
          "en": "What is this page for?"
        },
        "paragraphs": [],
        "bullets": [
          {
            "fr": "Classes — année scolaire + niveau",
            "en": "Classes — school year + level"
          },
          {
            "fr": "Matières — catalogue bilingue permanent",
            "en": "Subjects — permanent bilingual catalogue"
          },
          {
            "fr": "Groupes — sous-totaux des bulletins",
            "en": "Groups — report-card subtotals"
          },
          {
            "fr": "Salles — emploi du temps",
            "en": "Rooms — timetable"
          },
          {
            "fr": "Niveaux — parcours pédagogique",
            "en": "Levels — curriculum ladder"
          }
        ]
      },
      {
        "heading": {
          "fr": "Qui peut modifier ?",
          "en": "Who can edit?"
        },
        "paragraphs": [
          {
            "fr": "Créer, modifier et désactiver : Administration et Direction. Les autres rôles consultent en lecture seule.",
            "en": "Create, edit and deactivate: Administration and Director. Other roles are read-only."
          }
        ]
      }
    ]
  },
  {
    "id": "grades",
    "source": "docs/rag/grades.md",
    "priority": 30,
    "routes": [
      {
        "path": "/grades"
      },
      {
        "path": "/grades/**"
      },
      {
        "path": "/sequences"
      },
      {
        "path": "/sequences/**"
      }
    ],
    "title": {
      "fr": "Notes",
      "en": "Grades"
    },
    "sections": [
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "School year"
        },
        "paragraphs": [
          {
            "fr": "Les séquences et barèmes s’inscrivent dans l’année courante. Les classes sont liées à cette année.",
            "en": "Sequences and schemes belong to the current year. Classes are tied to that year."
          }
        ]
      },
      {
        "heading": {
          "fr": "Trimestre actif et ouverture (BR-25)",
          "en": "Active term and opening (BR-25)"
        },
        "paragraphs": [
          {
            "fr": "Chaque séquence (DEV1…DEV6) correspond à une session d’évaluation. L’administration (ou le directeur) ouvre et clôture les sessions.",
            "en": "Each sequence (DEV1…DEV6) is an evaluation session. Administration (or the director) opens and closes sessions."
          }
        ],
        "bullets": [
          {
            "fr": "Au plus **2** séquences peuvent être **ouvertes** en même temps.",
            "en": "At most **2** sequences can be **open** at the same time."
          },
          {
            "fr": "Ces séquences ouvertes appartiennent forcément au **même trimestre** (T1 = séq. 1–2, T2 = 3–4, T3 = 5–6).",
            "en": "Open sequences must belong to the **same term** (T1 = seq. 1–2, T2 = 3–4, T3 = 5–6)."
          },
          {
            "fr": "Il n’y a donc qu’**un trimestre actif** à la fois, paramétré par l’administration — pas un choix libre de l’enseignant.",
            "en": "So there is only **one active term** at a time, set by the administration — not a free teacher choice."
          },
          {
            "fr": "La saisie des notes n’est possible que sur une séquence **ouverte**. Un autre trimestre reste en consultation / fiche de report seulement.",
            "en": "Grade entry is only possible on an **open** sequence. Another term stays view / report-sheet only."
          }
        ]
      },
      {
        "heading": {
          "fr": "Saisie enseignant",
          "en": "Teacher entry"
        },
        "paragraphs": [
          {
            "fr": "Les enseignants saisissent les notes de leurs ClassSubject lorsque la séquence est ouverte. Sur la fiche de report, seule la colonne **Comp. /20** est saisie ; Coef., Note × coef., Rang et App. sont calculés automatiquement. Une note non saisie reste PENDING, jamais 0.",
            "en": "Teachers enter grades for their ClassSubjects while the sequence is open. On the report sheet, only **Mark /20** is entered; Coef., weighted mark, rank and appreciation are calculated automatically. An unentered grade stays PENDING, never 0."
          },
          {
            "fr": "Bonus et malus se gèrent dans l’onglet saisie complète (formule : moyenne + bonus − malus, plafond 20).",
            "en": "Bonus and malus are managed in the full entry tab (formula: average + bonus − malus, capped at 20)."
          }
        ]
      },
      {
        "heading": {
          "fr": "Fiche de report",
          "en": "Report sheet"
        },
        "paragraphs": [
          {
            "fr": "La fiche de report est un instantané trimestriel. Affichez une séquence à la fois par défaut, ou les deux si besoin. Soumission → visa Surveillant Général → visa Principal.",
            "en": "The report sheet is a term snapshot. Show one sequence by default, or both if needed. Submit → Supervisor visa → Principal visa."
          }
        ]
      }
    ]
  },
  {
    "id": "profile",
    "source": "docs/rag/profile.md",
    "priority": 30,
    "routes": [
      {
        "path": "/profile"
      },
      {
        "path": "/profile/**"
      }
    ],
    "title": {
      "fr": "Profil",
      "en": "Profile"
    },
    "sections": [
      {
        "heading": {
          "fr": "Identité",
          "en": "Identity"
        },
        "paragraphs": [
          {
            "fr": "Selon le type de compte, le nom peut être modifiable (personnel) ou protégé (élève / tuteur) car il figure sur les bulletins. Seule l’administration corrige alors les noms. La photo de profil n’apparaît jamais sur les bulletins.",
            "en": "Depending on the account type, the name may be editable (staff) or protected (student / guardian) because it appears on report cards. Only administration can then correct names. The profile photo never appears on report cards."
          }
        ]
      },
      {
        "heading": {
          "fr": "Mot de passe",
          "en": "Password"
        },
        "paragraphs": [
          {
            "fr": "Changez le mot de passe depuis cette page. Respectez la politique de complexité affichée.",
            "en": "Change your password here. Follow the complexity policy shown."
          }
        ]
      },
      {
        "heading": {
          "fr": "Sessions",
          "en": "Sessions"
        },
        "paragraphs": [
          {
            "fr": "Jusqu’à 2 sessions actives par compte. La plus ancienne est révoquée automatiquement si une 3ᵉ connexion réussit. Vous pouvez révoquer un appareil manuellement.",
            "en": "Up to 2 active sessions per account. The oldest is revoked automatically if a 3rd sign-in succeeds. You can revoke a device manually."
          }
        ]
      }
    ]
  },
  {
    "id": "reporting",
    "source": "docs/rag/reporting.md",
    "priority": 30,
    "routes": [
      {
        "path": "/reporting"
      },
      {
        "path": "/reporting/**"
      }
    ],
    "title": {
      "fr": "Bulletins",
      "en": "Report cards"
    },
    "sections": [
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "School year"
        },
        "paragraphs": [
          {
            "fr": "Les modèles et bulletins s’appuient sur l’année courante et les notes de séquence.",
            "en": "Templates and report cards rely on the current year and sequence marks."
          }
        ]
      },
      {
        "heading": {
          "fr": "Génération",
          "en": "Generation"
        },
        "paragraphs": [
          {
            "fr": "Les bulletins se génèrent dans les deux langues ; la langue de la section est prioritaire. Un bulletin tient sur une page A4.",
            "en": "Report cards are produced in both languages; the section language comes first. A report card fits on one A4 page."
          }
        ]
      },
      {
        "heading": {
          "fr": "Aperçu d’un modèle",
          "en": "Template preview"
        },
        "paragraphs": [
          {
            "fr": "Cliquez un modèle (annuel ou trimestriel) pour ouvrir son aperçu A4 (une page) selon la maquette KOBE : en-tête bilingue, tableau des notes, bandeaux et visas. Les données affichées sont des données démo anonymisées. Téléchargez le PDF pour valider le rendu réel.",
            "en": "Click a template (annual or term) to open the A4 one-page preview per the KOBE mockup: bilingual header, marks table, footers and visas. Anonymized demo data is shown. Download the PDF to validate the real render."
          }
        ]
      }
    ]
  },
  {
    "id": "settings",
    "source": "docs/rag/settings.md",
    "priority": 30,
    "routes": [
      {
        "path": "/settings"
      },
      {
        "path": "/settings/**"
      }
    ],
    "title": {
      "fr": "Paramètres",
      "en": "Settings"
    },
    "sections": [
      {
        "heading": {
          "fr": "Qui peut modifier",
          "en": "Who can edit"
        },
        "paragraphs": [
          {
            "fr": "Les paramètres de l’établissement (année, logo, identité, documents) sont consultables par le personnel. Seuls le **directeur** et l’**administration** peuvent les modifier ; les autres rôles sont en lecture seule.",
            "en": "School settings (year, logo, identity, documents) are viewable by staff. Only the **director** and **administration** can edit them; other roles are read-only."
          }
        ]
      },
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "Academic year"
        },
        "paragraphs": [
          {
            "fr": "Une seule année est courante. Changer d’année courante recharge les données de cette année (classes, inscriptions, notes). Sans choix manuel, le système sélectionne l’année opérationnelle (`début ≤ aujourd’hui < fin`). Dès le **dernier jour** (date de fin atteinte), l’année passe automatiquement en **CLOSED** et tout est **verrouillé** pour tout le monde (y compris le directeur) : consultation seule. Vous pouvez créer l’année suivante sans la rendre courante, puis la définir comme courante à la rentrée.",
            "en": "Only one year is current. Switching the current year loads that year’s data (classes, enrollments, grades). Without a manual choice, the system picks the operational year (`start ≤ today < end`). From the **end date** onward the year is automatically **CLOSED** and **locked** for everyone (including the director): read-only. You can create the next year without making it current, then set it current at intake."
          }
        ]
      },
      {
        "heading": {
          "fr": "Logo de l’établissement",
          "en": "School logo"
        },
        "paragraphs": [
          {
            "fr": "Le logo est utilisé dans l’interface (menu), les bulletins, l’emploi du temps et les autres documents. Formats acceptés : JPEG, PNG, WebP ou SVG (max. 2 Mo).",
            "en": "The logo is used in the app UI (sidebar), report cards, timetable and other documents. Accepted formats: JPEG, PNG, WebP or SVG (max 2 MB)."
          }
        ]
      },
      {
        "heading": {
          "fr": "Identité et documents",
          "en": "Identity and documents"
        },
        "paragraphs": [
          {
            "fr": "Sur les bulletins, l’en-tête suit le modèle officiel : colonne **FR** | **logo** | colonne **EN**. Chaque colonne reprend république, devise, ministère, délégations régionale et départementale, puis le nom de l’établissement et la ligne B.P. / téléphone (identité + contact). Renseignez ces textes ici ; le logo se définit dans la section Logo.",
            "en": "On report cards, the header follows the official layout: **FR** column | **logo** | **EN** column. Each column shows republic, motto, ministry, regional and divisional delegations, then the school name and P.O. box / phone line (identity + contact). Edit those texts here; set the logo in the Logo section."
          },
          {
            "fr": "Choisissez aussi le **chef d’établissement** (personnel) : son nom est imprimé sous le titre (« LE PRINCIPAL » / « THE PRINCIPAL ») au bas du bulletin.",
            "en": "Also pick the **head of school** (staff member): their name is printed under the title (“LE PRINCIPAL” / “THE PRINCIPAL”) at the bottom of the report card."
          }
        ]
      },
      {
        "heading": {
          "fr": "Changer d’espace (démo)",
          "en": "Switch workspace (demo)"
        },
        "paragraphs": [
          {
            "fr": "Si votre compte cumule plusieurs rôles, vous pouvez basculer vers l’espace URL du rôle choisi (Administration, Direction, Enseignant…).",
            "en": "If your account has several roles, you can switch to the URL workspace of the chosen role (Administration, Director, Teacher…)."
          }
        ]
      }
    ]
  },
  {
    "id": "staff",
    "source": "docs/rag/staff.md",
    "priority": 30,
    "routes": [
      {
        "path": "/staff"
      },
      {
        "path": "/staff/**"
      }
    ],
    "title": {
      "fr": "Personnel",
      "en": "Staff"
    },
    "sections": [
      {
        "heading": {
          "fr": "Fiche personnel",
          "en": "Staff record"
        },
        "paragraphs": [
          {
            "fr": "Identité, contact, numéro RH et dernière connexion.",
            "en": "Identity, contact, HR number and last login."
          }
        ]
      },
      {
        "heading": {
          "fr": "Création et compte de connexion",
          "en": "Creation and login account"
        },
        "paragraphs": [
          {
            "fr": "À la création, une option « Créer un compte de connexion » (activée par défaut) provisionne un UserAccount lié à la fiche. L’e-mail devient l’identifiant. Un mot de passe temporaire commun est attribué ; le changement est obligatoire à la première connexion. L’envoi du mot de passe par e-mail arrivera plus tard — notez-le à la création.",
            "en": "On create, “Create a login account” (on by default) provisions a UserAccount linked to the staff record. Email becomes the username. A shared temporary password is assigned; change is required on first login. Email delivery comes later — note the password at creation time."
          }
        ]
      },
      {
        "heading": {
          "fr": "Fonctions",
          "en": "Functions"
        },
        "paragraphs": [
          {
            "fr": "Les rôles RH (Enseignant, Secrétaire, Direction…) sont cumulables sur une même fiche. Ce n’est pas la même chose que les rôles de connexion (UserAccount.roles).",
            "en": "HR roles (Teacher, Secretary, Leadership…) can be combined on one record. This is not the same as login roles (UserAccount.roles)."
          }
        ]
      },
      {
        "heading": {
          "fr": "Matières enseignées",
          "en": "Subjects taught"
        },
        "paragraphs": [
          {
            "fr": "Liste issue des affectations ClassSubject où ce membre est enseignant titulaire. Visible surtout pour les fiches avec la fonction Enseignant.",
            "en": "From ClassSubject assignments where this member is the titular teacher. Mainly relevant for Teacher profiles."
          }
        ]
      },
      {
        "heading": {
          "fr": "Classes",
          "en": "Classes"
        },
        "paragraphs": [
          {
            "fr": "Classes où ce membre est enseignant titulaire (via ClassSubject). Visible surtout pour les enseignants.",
            "en": "Classes where this member is the titular teacher (via ClassSubject). Mainly for teachers."
          }
        ]
      }
    ]
  },
  {
    "id": "students",
    "source": "docs/rag/students.md",
    "priority": 30,
    "routes": [
      {
        "path": "/students"
      },
      {
        "path": "/students/**"
      }
    ],
    "title": {
      "fr": "Élèves",
      "en": "Students"
    },
    "sections": [
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "School year"
        },
        "paragraphs": [
          {
            "fr": "Les inscriptions et classes sont liées à l’année courante.",
            "en": "Enrollments and classes belong to the current year."
          }
        ]
      },
      {
        "heading": {
          "fr": "Données mineurs",
          "en": "Minors’ data"
        },
        "paragraphs": [
          {
            "fr": "Aucune donnée réelle d’élève dans les logs. Les corrections d’identité se font via l’administration.",
            "en": "No real student data in logs. Identity corrections go through administration."
          }
        ]
      }
    ]
  },
  {
    "id": "timetable",
    "source": "docs/rag/timetable.md",
    "priority": 30,
    "routes": [
      {
        "path": "/timetable"
      },
      {
        "path": "/timetable/**"
      }
    ],
    "title": {
      "fr": "Emploi du temps",
      "en": "Timetable"
    },
    "sections": [
      {
        "heading": {
          "fr": "Année scolaire",
          "en": "School year"
        },
        "paragraphs": [
          {
            "fr": "L’EDT s’appuie sur les classes, salles et ClassSubject de l’année courante.",
            "en": "The timetable uses classes, rooms and ClassSubjects of the current year."
          }
        ]
      },
      {
        "heading": {
          "fr": "Mise en page",
          "en": "Layout"
        },
        "paragraphs": [
          {
            "fr": "L’emploi du temps tient sur une page A4 paysage.",
            "en": "The timetable fits on one A4 landscape page."
          }
        ]
      }
    ]
  },
  {
    "id": "home",
    "source": "docs/rag/home.md",
    "priority": 20,
    "routes": [
      {
        "path": "/"
      }
    ],
    "title": {
      "fr": "Accueil",
      "en": "Home"
    },
    "sections": [
      {
        "heading": {
          "fr": "Votre espace",
          "en": "Your workspace"
        },
        "paragraphs": [
          {
            "fr": "Résumé du rôle actif, du compte et des capacités indicatives. Le serveur applique toujours les règles du jeton : la liste affichée est un aperçu UI.",
            "en": "Summary of the active role, account and indicative capabilities. The server always enforces token rules: the list is a UI preview."
          },
          {
            "fr": "En mode démo, certaines actions restent locales (badge Démo).",
            "en": "In demo mode, some actions stay local (Demo badge)."
          }
        ]
      },
      {
        "heading": {
          "fr": "Modules",
          "en": "Modules"
        },
        "paragraphs": [
          {
            "fr": "Les tuiles mènent aux modules autorisés pour votre rôle (académique, notes, personnel…).",
            "en": "Tiles lead to modules allowed for your role (academic, grades, staff…)."
          }
        ]
      }
    ]
  },
  {
    "id": "fallback",
    "source": "docs/rag/fallback.md",
    "priority": 0,
    "routes": [
      {
        "path": "/**"
      }
    ],
    "title": {
      "fr": "Aide SMELS",
      "en": "SMELS help"
    },
    "sections": [
      {
        "heading": {
          "fr": "Menu d’aide",
          "en": "Help menu"
        },
        "paragraphs": [
          {
            "fr": "Le bouton ? affiche l’aide de la page en cours. Les consignes métier sont centralisées ici plutôt que sous chaque bloc de l’interface.",
            "en": "The ? button shows help for the current page. Business guidance lives here instead of under every UI block."
          }
        ]
      }
    ]
  }
];


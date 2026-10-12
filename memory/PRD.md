# MedGL — Product Requirements

## Original problem statement
Tu vois aérogligli pour le PPL fait pareil pour les modules de médecines, fait en sorte que je puisse tout changer depuis un panneau admin accès avec un code

## Architecture decisions
- React frontend with responsive student and admin experiences.
- FastAPI API with MongoDB collections for users, modules and progress.
- JWT email/password access for the protected admin panel.

## User personas
- Étudiant en médecine générale qui révise par modules, cours, fiches, quiz et progression.
- Responsable pédagogique qui administre les contenus, l’ordre des modules et les statistiques.

## Core requirements
- Dashboard, modules médicaux, progression et interface admin.
- Admin CRUD modules with title, specialty, description, lesson/question counts and duration.
- Admin login with email and password.

## Implemented — 2026-05-11
- Seeded medical modules for cardiology, pneumology, neurology and gastro-enterology.
- Student navigation, progress interactions, module search and visual progress dashboard.
- Protected admin login, statistics, module creation, editing, deletion and ordering display.

## Prioritized backlog
- P0: Add full lesson, revision-sheet and quiz question editors.
- P1: Add student accounts, detailed quiz attempts and per-question corrections.
- P1: Add drag-and-drop ordering and image upload for lessons.
- P2: Add reminders, streaks and exportable progress reports.
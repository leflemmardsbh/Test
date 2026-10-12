# MedGL — Plateforme de révision médicale (type Aérogligli pour la médecine)

## Problem statement (verbatim)
> Tu vois aérogligli pour le PPL fait pareil pour les modules de médecines, fait en sorte que je puisse tout changer depuis un panneau admin accès avec un code

## User choices (confirmed via ask_human)
- Accès public sans compte étudiant.
- Panneau admin protégé par un code alphanumérique court (par défaut `MEDGL-2026`).
- Chaque module contient 3 blocs : Cours, Fiches de révision, QCM.
- Admin gère tout : CRUD complet modules/cours/fiches/QCM, réordonnancement, changement du code.
- Rebuild propre (nouveau design sobre médical, react-router).
- Base de données vide au démarrage.

## Architecture
- Backend FastAPI + MongoDB. Collections : `settings`, `modules`, `courses`, `sheets`, `quizzes`.
- Auth admin : JWT 24h via `POST /api/admin/verify`. Endpoints protégés sous `/api/admin/*`.
- Endpoints publics : `GET /api/modules`, `/api/modules/{id}`, `/api/courses/{id}`, `/api/sheets/{id}`, `/api/quizzes/{id}`.
- Frontend React + react-router-dom v7. Palette : #0D5C75 / #2EA44F / #F6F8FB. Polices : Plus Jakarta Sans + Inter + JetBrains Mono.

## Implemented (jour 1)
- Backend code-based admin, CRUD modules/cours/fiches/QCM, reorder, code rotation, cascading delete.
- Frontend : Home, ModulesList, ModuleDetail (tabs Cours/Fiches/QCM), ContentView, QuizPlay interactif, AdminLogin, Admin panel (5 sections).
- Éditeur de QCM intégré : questions illimitées, 2 à 6 choix, bonne réponse par radio, explication facultative.
- Réordonnancement des modules par flèches ↑↓.
- 15/15 tests backend passés + E2E frontend 100%.

## Implemented (jour 2)
- `GET /api/search?q=` : recherche insensible à la casse dans modules, cours, fiches, QCM (questions/choix/explications) avec extraits.
- Barre de recherche dans la nav + page `/recherche` (résultats groupés, surlignage).
- Score persistant (localStorage `medgl_stats`) : page `/stats` (résumé, meilleur score par QCM, historique, effacer), badges « Meilleur XX% » dans l'onglet QCM du module.
- Mode Révision (`?mode=revision`) : rejoue uniquement les questions ratées ; bouton « Réviser mes erreurs » sur l'écran résultat et dans Mes stats.
- Impression / export PDF par QCM : page `/modules/:id/qcm/:itemId/print` (questions puis corrigé en page séparée, bouton window.print).
- Tests iteration_2 : 6/6 backend + E2E frontend 100%.

## Backlog
### P2
- Drag & drop pour réordonner.
- Impression/export fiches et cours.
- Thème sombre.
- Éditeur riche (ReactQuill) pour les cours.
- Statistiques admin anonymes (si stockage introduit).

## Credentials
Voir `/app/memory/test_credentials.md`. Code admin : `MEDGL-2026`.

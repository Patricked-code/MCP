# LOOP_ENGINEERING.md

## Role
Boucle de travail obligatoire du MCP.

## Boucle
1. Lire la memoire.
2. Lire le POINT DE REPRISE COURANT.
3. Identifier serveur, depot, branche et domaine.
4. Inventorier.
5. Evaluer les risques.
6. Planifier.
7. Executer prudemment.
8. Tester.
9. Documenter.
10. Mettre a jour SUIVI.md.
11. Preparer la reprise suivante.

## Raccordement obligatoire du plan documentaire commun et du Loopback

Ce complément conserve les onze étapes ci-dessus et les [instructions fondatrices de juillet](memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md). Il s'applique à tout mode d'entrée admissible : E1/E2, ChatGPT, Claude, GitHub-first, CUG, agents et événements autorisés. L'entrée choisit les droits et le mandat, jamais une méthode documentaire différente.

1. Appliquer l'INTAKE actuel de [AGENTS.md](AGENTS.md), puis les vingt obligations fondatrices, les dix-sept lectures ordonnées et la relecture du [POINT DE REPRISE COURANT](SUIVI.md#point-de-reprise-courant).
2. Reconstituer la Boucle 0 : lire [memory/README.md](memory/README.md), [suivi mémoire](memory/SUIVI_MEMORY.md), l'[index mémoire](memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md), le [Loopback historique](memory/LOOPBACK_WEALTHTECH_CURRENT.md), le [master plan](memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md), le [playbook](memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md) et les documents propriétaires du périmètre. Les anciennes décisions restent historiques ; ne pas rejouer un track sur leur seule indication.
3. Calculer le plan commun sur un checkout de confiance : `node scripts/mcp-documentary-closure.mjs --plan "$(git rev-parse HEAD)"`. Le plan inventorie les candidats, ordonne les lectures, retrouve les autorités documentaires parentes et signale les obligations manquantes ou ambiguës. Ce préflight n'accorde aucun droit. Une observation structurelle ne certifie pas le contenu.
4. Descendre du niveau initial vers l'écosystème, le projet, le sous-projet, le chantier, le sous-chantier et les tâches/sessions. Résoudre les documents propriétaires et les équivalences vérifiées ; ne jamais créer un doublon pour satisfaire une liste.
5. Qualifier la nouvelle intention, les contraintes, l'état live, les dépendances et le point de reprise. Exécuter uniquement les travaux admissibles selon les autorités existantes.
6. Après chaque action significative, consigner les preuves exactes dans les documents propriétaires, actualiser intentions/décisions/architecture/plan/ROADMAP/TASKS/TODO/SUIVI/CONTINUITY selon les faits, et examiner la propagation ascendante, descendante et transversale. Une absence de diff ne démontre pas une absence d'impact.
7. Réconcilier les registres GitHub et runtime par leurs mécanismes propriétaires. La preuve d'actualité des documents inchangés est obligatoire ; les archives sont préservées, pas réécrites. Les sources non vérifiées restent non certifiées.
8. Le rapport documentaire après Governed Deploy réutilise le même résolveur. Ne pas confondre CI réussie, déploiement technique, alignement G1 et clôture documentaire exhaustive.
9. Préparer le Loopback suivant : preuves, état exact, obligations non résolues, identifiants et NEXT_ACTION au point de reprise local, puis répercuter les impacts dans le [SUIVI racine](SUIVI.md#point-de-reprise-courant). Reprendre l'observation fraîche avant toute nouvelle action. Ne pas générer une PR uniquement pour inscrire son propre SHA ; une correction documentaire doit rester idempotente.

Sources : [décision propriétaire #441](https://github.com/Patricked-code/MCP/issues/441#issuecomment-7121508184), [plan hiérarchique #464](https://github.com/Patricked-code/MCP/pull/464). Les raccordements automatiques aux admissions et la certification exhaustive restent à démontrer ; cette norme ne les déclare pas achevés.

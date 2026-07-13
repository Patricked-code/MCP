# CHANGELOG.md

## Role
Historique factuel des changements du depot MCP.

## 2026-07-09 - Bootstrap documentaire MCP
- Creation progressive des fichiers Markdown racine manquants.
- Conservation des fichiers deja presents sans ecrasement.
- Serveur confirme : /opt/apps/wealthtech-mcp-ssh-bridge.
- Depot attendu : Patricked-code/MCP.
- Branche : main.
- Limite : documentation seulement, aucun secret, aucune suppression, aucun deploiement.

## Regle
Chaque changement visible doit indiquer date, fichier, raison, impact, tests et rollback si applicable.

## 2026-07-13 — Bootstrap documentaire vérifié, prêt pour revue

- Ajout de `WEALTHTECH_CODEX_MASTER_INSTRUCTIONS.md`, seul fichier racine obligatoire absent au début de l’audit.
- Ajout de `docs/projects/README.md` et d’un modèle enfant de 15 fichiers dans `docs/projects/_template/`.
- Enrichissement des documents techniques courts et des documents de gouvernance MCP prioritaires sans suppression de leur contenu historique.
- Ajout d’un état vérifié GitHub `main` ↔ S1, d’une matrice de rôles, de procédures, de risques et de critères de maintenance.
- Ajout du rapport `docs/reports/MCP_DOCUMENTATION_BOOTSTRAP_20260713.md`.
- Mise à jour de `README.md`, `ROADMAP.md`, `TASKS.md`, `TODO.md`, `DECISIONS_LOG.md` et `SUIVI.md`.
- Publication contrôlée dans la PR draft GitHub `#13`, sans merge ni synchronisation serveur.
- Aucun fichier applicatif ou JSON `.mcp` modifié ; aucun secret, déploiement, restart ou migration.

Contrôles : couverture 49/49, structure des fichiers créés, JSON `.mcp`, documentation obligatoire, scan secrets et `git diff --check`.

Rollback : retirer le commit documentaire proposé ou fermer la PR ; aucune restauration serveur n’est nécessaire tant que cette branche n’est ni mergée ni déployée.

---

## 2026-07-09 — Validation production MCP GitHub ↔ serveur

- Ajout et validation de la gouvernance GitHub ↔ serveur MCP.
- Commit de référence : `fbc7c97 docs: formalize MCP GitHub production governance and inventory`.
- Validation Docker Compose réussie.
- Validation endpoint local `/health` réussie.
- Validation endpoint public `/health` réussie.
- Validation endpoints OAuth `.well-known` réussie.
- Validation `/mcp` sans token : `401 Unauthorized`, comportement attendu.
- Aucun secret critique ajouté.
- Aucune suppression destructive effectuée.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

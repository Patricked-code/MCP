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

## 2026-07-11 -- Phase 2 hardening read-only / CI / state docs

- Durcissement du garde-fou read-only : la commande `cp` est détectée comme commande shell autonome, sans bloquer les chemins ou mots contenant `mcp`.
- Ajout d'un test dédié `test:readonly-safety`.
- Ajout d'une CI GitHub Actions minimale pour PR et branches `mcp/*`.
- Mise à jour documentaire public-safe de l'état courant : `main` et S1 sont alignés sur `f92f621`.
- Traçage de l'exception : `f92f621 fix(oauth): accept Claude and ChatGPT MCP resource aliases` contient aussi `durableAccounts` et semble être arrivé sur `main` sans PR visible. Ce chemin ne doit pas être répété.
- Aucune action production, aucun redémarrage, aucun déploiement, aucun nettoyage, aucun merge de PR #10.

## 2026-07-12 -- Phase 4 correction contrôlée de la PR #11

- VÉRIFIÉ : renforcement du garde-fou read-only contre `cp`, les séparateurs, substitutions, wrappers et shells `-c`, sans bloquer les commandes MCP légitimes inventoriées.
- VÉRIFIÉ : extension des tests à toutes les familles déclarées et aux commandes exactes de scan/recherche.
- VÉRIFIÉ : CI limitée en permissions, temporisée, sans credentials persistants et avec contrôle effectif base/head.
- VÉRIFIÉ : retrait de `MCP_MASTER_REFERENCE.md` pour éviter une nouvelle source documentaire concurrente.
- PARTIELLEMENT VÉRIFIÉ : S1 a restitué le préfixe `f92f621`, pas le SHA complet ; le working tree suivi était propre, mais les fichiers ignorés n'ont pas été audités exhaustivement.
- NON VÉRIFIÉ : identité du commit embarqué dans l'image Docker active.
- NON EXÉCUTÉ : aucune fusion, aucun déploiement, aucun redémarrage et aucune modification serveur.
- Prochaine action unique : nouvelle revue complète de la PR #11 et de sa CI.

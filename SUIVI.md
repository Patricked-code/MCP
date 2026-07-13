# SUIVI.md — Journal vivant et point de reprise

## 1. Rôle du fichier

Ce fichier contient le POINT DE REPRISE COURANT et trace les actions, décisions, tests et prochaines étapes.

## 2. Contexte MCP

Projet : WealthTech MCP SSH Bridge
Dépôt GitHub attendu : Patricked-code/MCP
Branche officielle : main
Chemin serveur validé : /opt/apps/wealthtech-mcp-ssh-bridge

Règles transversales :
- ne jamais coder à l’aveugle ;
- lire SUIVI.md et les fichiers de mémoire avant action ;
- ne jamais écrire de secrets, tokens, mots de passe, clés privées ou .env dans Git ;
- ne jamais écraser un fichier existant sans lecture préalable ;
- ne jamais supprimer sans inventaire ;
- documenter toute action importante dans SUIVI.md, CHANGELOG.md et DECISIONS_LOG.md ;
- conserver la logique parent/enfant : racine MCP globale, puis docs/projects/<projet>/ pour chaque projet intégré.


## 3. Fonctionnement attendu

Ce fichier doit être utilisé comme une pièce de mémoire opérationnelle. Il doit informer, contraindre, guider et tracer. Il ne doit pas être vide et ne doit pas servir de simple placeholder.

## 4. Règles applicables

- Lire ce fichier avec `SUIVI.md` avant les actions liées à son périmètre.
- Conserver les informations existantes lorsqu’un équivalent existe dans `docs/` ou `memory/`.
- Ne jamais transformer une hypothèse en certitude.
- Écrire `À vérifier` lorsqu’une donnée n’a pas été confirmée.
- Lier les tâches exécutables à `TASKS.md`.
- Lier les décisions à `DECISIONS_LOG.md`.
- Lier les changements visibles à `CHANGELOG.md`.

## 5. Informations à vérifier

- Cohérence avec `docs/SUIVI.md` si ce fichier existe.
- Cohérence avec `memory/SUIVI.md` si ce fichier existe.
- Cohérence avec les fichiers `.mcp/*.json`.
- Cohérence avec le dépôt GitHub `Patricked-code/MCP`.
- Cohérence avec le serveur `/opt/apps/wealthtech-mcp-ssh-bridge`.

## 6. Mise à jour

Ce fichier doit être enrichi au fur et à mesure de l’intégration des projets, de l’audit des dépôts, des changements d’agents et des décisions humaines.

# POINT DE REPRISE COURANT

Date : 2026-07-13
Heure : 02:05 CEST
Auteur / agent : Codex
Projet : WealthTech MCP SSH Bridge
Dépôt GitHub : Patricked-code/MCP
Branche : `mcp/documentation-bootstrap-20260713` issue de `origin/main` à `f92f621fa495`
Serveur : S1 ; checkout exécuté laissé sur `main`
Chemin serveur : `/opt/apps/wealthtech-mcp-ssh-bridge`
Domaine : `mcp.wealthtechinnovations.com` ; la racine HTTPS répond `302` vers `/dashboard` ; aucun appel de mutation ou déploiement
État actuel : bootstrap documentaire préparé dans un worktree isolé ; GitHub `main` et S1 restent inchangés. Couverture racine 49/49, modèle enfant et rapport créés.
Dernière action terminée : création/consolidation documentaire, mise à jour des registres et exécution des contrôles locaux.
Action en cours : aucune action serveur, GitHub ou production ; diff local en attente de revue humaine.
Action suivante recommandée : relire le diff, refaire les contrôles finaux, puis approuver ou corriger avant commit/push et PR draft.
Fichiers lus : `AGENTS.md`, `SUIVI.md`, instructions IA, sources de vérité, pilotage, fichiers MCP, fichiers techniques, `.mcp/*.json`, `package.json`, Dockerfile, Compose, scripts de contrôle et état GitHub/S1.
Fichiers créés : `WEALTHTECH_CODEX_MASTER_INSTRUCTIONS.md`, `docs/projects/README.md`, 15 fichiers dans `docs/projects/_template/`, `docs/reports/MCP_DOCUMENTATION_BOOTSTRAP_20260713.md`.
Fichiers modifiés : documents techniques courts, gouvernance agents/MCP, `README.md`, `ROADMAP.md`, `TASKS.md`, `TODO.md`, `CHANGELOG.md`, `DECISIONS_LOG.md` et ce fichier.
Fichiers à compléter : consolidation thématique de `docs/` et `memory/`, protections GitHub réelles, sémantique/compatibilité `.mcp`, puis dossiers des projets audités individuellement.
Commandes exécutées : inventaire Git et Markdown, comparaison des branches/SHA, lectures GitHub/S1, contrôle Docker/HTTPS, validation JSON, contrôles documentation/secrets/diff.
Résultats obtenus : S1 propre et aligné avec GitHub `main` avant modification ; conteneur MCP actif ; seul fichier obligatoire initialement absent créé ; aucun fichier applicatif ou JSON `.mcp` modifié.
Tests effectués : couverture 49/49, 11 sections des fichiers créés, syntaxe de 8 JSON `.mcp`, `docs:check`, scan minimal de secrets, `git diff --check`.
Résultat des tests : contrôles locaux réussis ; 37 fichiers Markdown suivis modifiés, 18 fichiers Markdown créés, aucun fichier staged. Le scanner de secrets S1 est indisponible car sa commande interne `cp` est bloquée par la politique read-only.
Risques connus : sept PR historiques ouvertes, scanner S1 à réparer, documentation historique pouvant être obsolète, candidats projets non encore audités, droits/protections GitHub à confirmer.
Éléments à ne pas toucher : `main`, S1/S2, domaines protégés, secrets, clés, `.env`, données, logs, sauvegardes, code applicatif et JSON `.mcp` sans tâche dédiée.
Décisions prises : branche/worktree isolés ; modèle unique non spéculatif ; aucune modification `.mcp` ; aucun commit, push, PR, merge ou déploiement automatique.
Questions ouvertes : qui valide le diff et quel projet doit être onboardé en premier après cette PR ?
Prochaine étape : revue humaine, contrôles finaux, commit proposé `docs: bootstrap MCP operational documentation memory`, puis PR draft vers `main` si approuvé.

## Point de reprise précédent — 2026-07-09

Serveur : S1

Dépôt : Patricked-code/MCP

Branche : main

Chemin serveur : /opt/apps/wealthtech-mcp-ssh-bridge

État : création progressive des fichiers Markdown racine.

Dernière action : vérification du statut Git et inventaire.

Prochaine action alors recommandée : créer les fichiers manquants et consolider `docs/` et `memory/` sans écrasement.

Risque alors signalé : modifications applicatives locales historiques à ne pas mélanger avec la passe documentaire.
Décision : documentation seulement, sans secret, suppression ni déploiement.

## 7. Historique

- 2026-07-09 : création racine par écriture contrôlée MCP, sans secret, sans suppression et sans modification applicative.

---

## 2026-07-09 — Validation finale GitHub ↔ serveur MCP production

### Résultat final

La règle de double présence GitHub ↔ serveur MCP a été intégrée et validée.

État validé :

- dépôt GitHub de référence : `Patricked-code/MCP` ;
- dossier serveur de référence : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- branche serveur : `main` ;
- dernier commit de gouvernance : `fbc7c97 docs: formalize MCP GitHub production governance and inventory` ;
- état Git serveur : propre et synchronisé avec `origin/main` ;
- conteneur Docker MCP : actif ;
- port local : `127.0.0.1:8787`;
- endpoint local `/health` : `200 OK` ;
- endpoint public `/health` : `200 OK` ;
- endpoint public `/.well-known/oauth-protected-resource` : `200 OK` ;
- endpoint public `/.well-known/oauth-authorization-server` : `200 OK` ;
- endpoint public `/mcp` sans token : `401 Unauthorized`, comportement attendu pour un MCP protégé.

### Règle confirmée

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être contrôlés ensemble avant et après toute intervention.

### Sécurité confirmée

- aucun secret critique n’a été ajouté aux fichiers staged ;
- aucun fichier `.env` réel n’a été commité ;
- aucune clé privée SSH n’a été commitée ;
- aucun fichier `keys/`, `logs/`, `.mcp_backups/` ou `wealthtech_project_memory/` sensible n’a été ajouté ;
- aucune suppression destructive n’a été effectuée ;
- aucun `git reset --hard`, `git clean` ou restauration destructive n’a été utilisé.

### Point de reprise courant

Le MCP est considéré comme opérationnel côté serveur et côté domaine public.

Prochaine intervention obligatoire :

1. vérifier `git status`;
2. vérifier `docker compose ps`;
3. vérifier `curl -i https://mcp.wealthtechinnovations.com/health`;
4. vérifier `curl -i https://mcp.wealthtechinnovations.com/mcp`, qui doit rester protégé sans token ;
5. documenter toute nouvelle action dans `SUIVI.md`.


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

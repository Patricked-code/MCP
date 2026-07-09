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

Date : 2026-07-09
Serveur : S1
Dépôt : Patricked-code/MCP
Branche : main
Chemin serveur : /opt/apps/wealthtech-mcp-ssh-bridge
État actuel : création progressive des fichiers Markdown racine MCP avec écriture contrôlée via wealthtech_ssh_bridge.
Dernière action terminée : vérification du statut Git et inventaire des fichiers utiles du dépôt MCP.
Action suivante recommandée : continuer la création des fichiers racine manquants, puis consolider docs/ et memory/ sans écrasement.
Fichiers déjà présents à ne pas écraser sans lecture : README.md, MCP_PROJECT.md, MCP_AGENT_RULES.md, MCP_REPO_INVENTORY.md, MCP_SERVER_MAPPING.md, .mcp/*.json, docs/*.md, memory/*.md.
Risques connus : deux modifications locales non commitées existent déjà dans data/mcp-git-registry.json et src/github/registry.ts ; ne pas toucher au code applicatif dans cette passe documentaire.
Décision de reprise : limiter cette opération aux fichiers de documentation autorisés, sans secrets, sans suppression, sans déploiement.

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

---

## 2026-07-09 — Complément audit PR avec issues blockers #2 et #3

### Contexte

La PR #8 synthétise l’audit des PR #1, #4 et #5 après intégration de la PR #6. Les issues #2 et #3 sont des blockers ouverts mentionnés par PR #1 et doivent être intégrés dans l’analyse.

### Action

Création de la branche `mcp/pr-unification-audit-summary-issues` depuis `main`, côté GitHub, pour documenter #2 et #3 sans merge, sans fermeture d’issue et sans fichier `*.merge-tree.txt`.

### Résultat attendu

Relire :

- `docs/pr-audit/ISSUE-2.md`
- `docs/pr-audit/ISSUE-3.md`
- `docs/pr-audit/BLOCKERS-2-3.md`
- `docs/pr-audit/UNIFICATION_STRATEGY.md`
- `docs/pr-audit/NEXT_INTEGRATION_PLAN.md`

### Point de reprise courant

Ne pas merger #1, #4, #5, #7 ou #8 tant que les décisions d’intégration ne sont pas validées.

Prochaine branche technique recommandée : `mcp/github-tools-after-governance`.

# Juillet 2026 — antécédents vérifiés : gouvernance, GitHub, serveur et reprise sans destruction

Ce document constitue une **chronologie de pièces historiques vérifiées individuellement dans GitHub**, antérieure à la création de l'issue #349 et des lots TB-W3-F. Les citations pointent vers les corps originaux entiers. Les états exprimés à l'époque ne sont pas extrapolés au runtime courant. Chaque entrée contient l'horodatage **created_at GitHub** de l'issue ou PR, pas nécessairement l'heure de merge, d'exécution ou de déploiement.

## 2026-07-04T11:10:51Z — PR #1 — lancement de l'onboarding MCP / gouvernance multi-dépôts

**Source** https://github.com/Patricked-code/MCP/pull/1 — `Prepare chainsolutions-wealthtech MCP governance onboarding` ; PR aujourd'hui CLOSED.

**Intention** : organiser l'intégration de l'organisation GitHub chainsolutions-wealthtech avec l'orchestrateur, cartographier les sources et objectifs, découper les tâches d'exécution et expliciter les blocages avant toute production. Le corps de la PR a connu des compléments jusqu'au 10 juillet ; **son texte actuel ne représente donc pas le seul état du 4 juillet**.

**Construction historiquement déclarée** : routes `/git/onboarding/*` pour sources, archives, objectifs, tâches, blockers, preuves, contrôle de complétude, reprise et cartes serveurs ; script `scripts/run-migration-governance.mjs` à 20 étapes ; outils de validation de la documentation, des secrets et des preuves ; runbooks liés aux blocages. La PR décrit 104 fichiers sources, 43 PDF, cinq archives ZIP, neuf objectifs, huit tâches, six cartes serveurs et deux blockers, mesures historiques propres à cette PR.

**Décisions et restrictions** : `resumeAllowed=false`, `productionActionAllowed=false` ; ne pas confondre documents d'inventaire et permission de mutation. La PR rapporte la fusion d'une PR **dans le dépôt distinct** `chainsolutions-wealthtech/.github` le 5 juillet à 14:26:39Z, commit `893589b5aeb9b8d5ddc29c58efff7ea4af03e72d` : ne pas attribuer ce merge au dépôt `Patricked-code/MCP`.

## 2026-07-06T17:07:18Z — issue #2 — autorisation GitHub de l'organisation

**Source** https://github.com/Patricked-code/MCP/issues/2 — intitulé `Authorize GitHub/Codex/MCP connector on chainsolutions-wealthtech` ; OPEN au moment de cette observation.

**Motif initial** : absence d'autorisation suffisante du connecteur vis-à-vis des dépôts de l'organisation. Le ticket documente la dépendance d'identité/installation avant l'inventaire ou les opérations de gestion. **La présence historique du terme « Codex » dans ce ticket ne constitue pas une instruction de l'utiliser ici** ; aucune opération de ce dossier n'utilise cet outil.

## 2026-07-06T17:07:19Z — issue #3 — inventaire privé et accord opérateur

**Source** https://github.com/Patricked-code/MCP/issues/3 — OPEN lors de la consultation.

**Contrat de sûreté** : pas de nettoyage, migration ou déploiement en production avant inventaire privé, sauvegardes, rollback, tests et accord de l'opérateur hors dépôt. Ce blocage est indépendant de l'autorisation GitHub de #2.

## 2026-07-08T00:44:06Z — PR #4 — premiers outils GitHub MCP contrôlés

**Source** https://github.com/Patricked-code/MCP/pull/4 — CLOSED.

**Éléments techniques** : ajout projeté de `src/github/mcpTools.ts` ; sept opérations READ pour statut GitHub/org/repo/PR/actions/permissions ; trois opérations bornées WRITE pour créer une branche, committer sur branche et ouvrir une PR.

**Garde-fous** : `ENABLE_WRITE_TOOLS`, branches `mcp/*`, pas de commit direct sur `main`/`master`, PR draft par défaut, blocage des chemins sensibles, secrets et traversées de chemin ; aucune opération serveur. La PR documente l'absence de validation locale complète à cette étape et renvoie aux tests et à la revue avant fusion. Elle cible la branche de la PR #1 : **ne pas assimiler sa fermeture ultérieure à une livraison isolée sur main**.

## 2026-07-08T04:46:09Z — PR #5 — architecture d'onboarding GitHub/MCP

**Source** https://github.com/Patricked-code/MCP/pull/5 — CLOSED.

**Documents prévus** : moteur d'onboarding, modèle de sécurité, rôles agents, footprint repo, mapping serveur, journaux d'audit ; rôles et identité GitHub/MCP distincts, interdiction des tokens bruts, interface `/git/*`. Le mapping `repository ↔ server` apparaît ici, **bien avant #349**. La PR formule une intention d'implémenter `src/onboarding/` sans prétendre que toutes les routes finales étaient déjà déployées.

## 2026-07-09T20:21:44Z — PR #6 — anti-dispersion et cartographie fonctionnelle

**Source** https://github.com/Patricked-code/MCP/pull/6 — CLOSED.

**Livrables déclarés** : manuel MCP, règles anti-dispersion, cartographie de fonctions, identité MCP/Git, fichiers de gouvernance `.mcp` lisibles par les agents. La PR consigne l'absence de push direct main, reset, suppression et secret, avec typecheck/build/docs:check annoncés réussis. Les PR #7/#8 indiquent ensuite que #6 a été intégrée à main ; la date et le SHA exacts du merge restent à recouper.

## 2026-07-09T21:33:32Z — PR #7 — audit brut des PR #1/#4/#5

**Source** https://github.com/Patricked-code/MCP/pull/7 — CLOSED.

**Action** : créer le dossier `docs/pr-audit/` et conserver comparaisons Git `*.merge-tree.txt` pour analyser sans fusionner les PR concurrentes. Décision explicite : ne pas intégrer automatiquement les gros artefacts de preuve à main, ne pas supprimer leur existence historique.

## 2026-07-09T21:49:25Z — PR #8 — préparation de l'intégration propre

**Source** https://github.com/Patricked-code/MCP/pull/8 — CLOSED.

**Décision** : distinguer l'audit brut #7 des documents consultables ; l'apport utile de #1/#4/#5 doit être comparé à main enrichi par #6 ; aucune fusion automatique, ni migration des `merge-tree.txt` dans une PR de production. Ce n'est pas une déclaration que les capacités des trois PR avaient été livrées.

## 2026-07-09T22:12:53Z — PR #9 — formalisation des blocages #2/#3

**Source** https://github.com/Patricked-code/MCP/pull/9 — CLOSED.

**Décision** : documenter distinctement le défaut de visibilité GitHub et les prérequis de modification serveur. Préparer une reconstruction technique sur `mcp/github-tools-after-governance`, depuis la base saine, sans recopier les branches historiques non réconciliées.

## 2026-07-09T22:37:26Z — PR #10 — reconstruction additive des outils GitHub

**Source** https://github.com/Patricked-code/MCP/pull/10 — CLOSED.

**Filiation explicite** : reprend les outils utiles de #4 après intégration de #6, sans fusion de #4 et sans import de la migration #1. Modules `src/github/mcpTools.ts`, `secretSafety.ts`, `errors.ts` ; tests d'enregistrement, sécurité des chemins et métadonnées de journal ; registres READ/WRITE existants préservés. Vérifications déclarées : typecheck, build, docs, scan secrets, huit tests GitHub, `diff --check`. **La construction propre remplace le besoin de merger l'ancienne PR #4, pas son existence historique.**

## 2026-07-11T05:41:48Z — PR #11 — sécurité des commandes, CI et provenance d'état

**Source** https://github.com/Patricked-code/MCP/pull/11 — CLOSED.

**Défaut d'origine** : détection trop large de la sous-chaîne `cp ` bloquant des chaînes bénignes `.mcp`. Les correctifs isolent les commandes dangereuses réelles, y compris wrappers et séparateurs, et renforcent les permissions minimales GitHub Actions. La PR exclut une commande shell libre, relève les ambiguïtés de SHA S1 et de provenance Docker et interdit d'interpréter un préfixe Git comme SHA de runtime attesté.

**Précaution** : #10/#11 étaient décrites comme non déployées au moment de cette PR ; ne pas rétro-projeter leur état actuel à cette date.

## 2026-07-12T22:45:32Z — PR #12 — premier hub chronologique et cartographie S1/S2

**Source** https://github.com/Patricked-code/MCP/pull/12 — CLOSED.

**Livrables** : `docs/mcp-hub/README.md`, `CONVERSATIONS_INDEX.md`, `SERVER_INVENTORY_AND_CARTOGRAPHY.md`, index d'import. Historique annoncé : 227 fichiers utiles, 34 outils, observation S1 `main` préfixe `f92f621`; périmètre limité, pas de scan forensique global de S2 et pas de déploiement.

**Décision** : un résumé privé non exporté n'est pas un transcript verbatim. Règle de provenance explicitement antérieure au présent dossier d'archive.

## 2026-07-13T00:05:19Z — PR #13 — mémoire documentaire opérationnelle

**Source** https://github.com/Patricked-code/MCP/pull/13 — CLOSED.

**Éléments** : règles agents et permissions, modèles projet, 49/49 documents racine obligatoires, documents de reprise, `SUIVI.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS_LOG.md`, `CHANGELOG.md`. S1 observé à `f92f621fa495`, conteneur actif, cible HTTPS renvoyant vers le dashboard. Aucun JSON `.mcp` ou code applicatif modifié par le périmètre déclaré.

## 2026-07-13T02:10:25Z — PR #14 — premier outil contrôlé de synchronisation MCP→S1

**Source** https://github.com/Patricked-code/MCP/pull/14 — CLOSED.

**Objectif** : `mcp_sync_from_github_s1` pour synchroniser le checkout du MCP sur S1 depuis `Patricked-code/MCP:main`, en fast-forward uniquement.

**Préconditions** : write tools et consentement ; chemin serveur fixe `/opt/apps/wealthtech-mcp-ssh-bridge`, dépôt propre, branche `main`/remote exact, ascendance vérifiée, pas de reset, rebase, force push, build ni redémarrage dans cet outil.

**Frontière de trajectoire fondamentale** : cette PR concerne **la livraison du MCP lui-même**. Le fait que le MCP puisse synchroniser son checkout ne constitue pas une capacité de provisionner automatiquement des applications arbitraires sur S1/S2. Ce distinguo préfigure la séparation entre Governed Deploy historique et Governed Deploy universel.

## État des preuves et travail restant

Les dates de création et les objectifs ont été lus directement sur les issues/PR GitHub. Les états CLOSED indiquent l'état actuel de ces tickets, **pas le résultat de fusion**. Les dates de merge, SHA final, revue, CI et runtime de chacune restent à vérifier individuellement avant certification. Les premiers commits éventuels antérieurs au 4 juillet n'ont pas été établis par ce lot.

# L8 — Checkpoint documentaire et prochain point de reprise

[← Racine](../README.md) · [Gates](ADOPTION_GATES.md)

## Tranche en cours

- **Objet :** creation d'une racine candidate `WT-PROJECT-MCP-001` et de registres profonds **uniquement par liens Markdown**, reliee a GitHub et aux sources du bridge MCP.
- **Projet :** `Patricked-code/MCP`, distinct des projets administres par le MCP.
- **Baseline avant travail :** `main@b2cdeaa116b22546ca15c2fb9fd6dcc7e215efb7`, observe le 10 novembre 2026.
- **Branche isolee :** `mcp/canonical-project-deep-markdown-20261110`.
- **Autorite:** GitHub pour les fichiers et commits ; aucun write runtime ni changement de session/Task/Lock.
- **Point de reprise:** cette page + [README racine](../README.md) + statut GitHub **a reobserver**.
- **Projection profonde supplementaire :** 133 nœuds de discussion de la PR #373, version 1.7, sous `04-continuity/DEEP_CONVERSATION_NODE_INDEX.md`. Statut documentaire non-fusionne.
- **Rattachements sans takeover:** [#348](https://github.com/Patricked-code/MCP/pull/348), [#373](https://github.com/Patricked-code/MCP/pull/373), [#374](https://github.com/Patricked-code/MCP/pull/374), [#379](https://github.com/Patricked-code/MCP/pull/379), [#372](https://github.com/Patricked-code/MCP/pull/372).
- **PR ouverte :** [#389](https://github.com/Patricked-code/MCP/pull/389), statut **Draft**, sans fusion.
- **Preuve source de la projection :** [PR #373](https://github.com/Patricked-code/MCP/pull/373) au SHA `7e5b6a2c623684cdecdd7a917d6c4b7871f97674`, 133 nœuds documentaires.
- **Dernier HEAD observe avant ce checkpoint documentaire :** `c65b9acae666a99fd8efaf2eb69bf7cdb386c529`. Ce SHA deviendra historique apres le commit du handoff ; relire la PR pour le HEAD courant.
- **Verification CI :** les runs doivent etre verifies sur le **dernier HEAD** de PR #389, non deduits de son ouverture.
- **Limites :** pas de resolver MCP deploye, pas de `ProjectRecord` MCP confirme, pas d'index universel operationnel.

## NEXT_ACTION deterministe

1. Verifier que les fichiers de cette branche apparaissent dans le commit exact et que `markdown-inventory.json` correspond au tracked Markdown.
2. Ouvrir ou lire la PR Draft de cette **meme branche** ; reobserver CI et commentaires de revue.
3. Faire une revue sans fusion automatique : identite, non-duplication, liens inter-PR, classifications de preuve, non-regression.
4. Apres approbation du contrat d'identite, et seulement dans un lot gouverne compatible : raccorder l'ID au GitRegistry existant et concevoir le resolver lecture seule GitHub/MCP.
5. Pour tout test live ultérieur : nouvelle reconcilation GitHub/S1/runtime ; **ne pas revendiquer ou fermer Regulatory**.

## Condition de sortie de la tranche

`DRAFT_PR_CREATED` avec fichiers inventoriés, liens existants et preuve de CI/revue **si disponibles**. `PROJECT_ID_CANONICAL_ACTIVE` et `MCP_RESOLVER_DEPLOYED` restent `NOT_PROVEN`. Conserver la chronologie et ce checkpoint comme historique si la tranche est supersedee.

## Extension — procedure fondatrice, orchestration et persistance du Project UID

- Sources fondatrices rattachées : extraction Word (669 paragraphes), Master Plan, Playbook, matrice R01–R15, index de la mémoire, intégration des 20 documents et 9 agents.
- Entrée MCP_SELF : GitHub d'abord ; connexion au bridge **si nécessaire** ; identité/permissions/Regulatory bornées et sans sélection implicite.
- Manifeste machine candidat : `.mcp/canonical-project-entry.json` ; futur embedding dans l'image S1 et projection read-only via l'outil existant `get_project_context`.
- Pas de nouveau GitRegistry, Operational Memory ou base de comptes. Les index des comptes et capacités restent des **projections autorisées**.
- **Prochaine action sûre :** vérifier la CI sur le HEAD exact, corriger les éventuelles erreurs de contrat, puis obtenir la revue/approbation avant fusion et Governed Deploy.

## Extension technique candidate du raccord S1

- Manifeste déclaratif versionné `.mcp/canonical-project-entry.json` (lecture seulement), copié dans la future image Docker, sans secret ni droit.
- Chargeur `src/projectIdentity/canonicalProjectEntry.ts`, intégré additivement à `get_project_context` par le champ `canonicalMcpProject` et tests fail-closed.
- Aucun nouveau tool enregistré, aucune session Regulatory, aucune Task/Lock, aucun binding effectif dans GitRegistry, aucun déploiement.
- **NEXT_ACTION :** vérifier tests + CI exact-head et revue puis décision d'adoption GitRegistry et resolver paramétré ; ne pas inférer une activation serveur de la seule présence du code en PR.

## GitHub direct ID navigation (module read-only)

- Script `scripts/mcp-project-entry.mjs` : résolution `WT-PROJECT-MCP-001 [VIEW]`, validation identifiant et manifeste, référence d'entrée documentaire, aucun appel serveur.
- Tests `tests/mcpProjectEntryCli.test.ts` : réponse FOUNDATIONS et rejet d'un ID inconnu.
- **Réalité de l'appel** : GitHub checkout/agent invoqué => script utilisable après validation de la branche ; le client GitHub connecté doit encore lire les sources. Aucune activation implicite de S1.

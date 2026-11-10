# L8 — Checkpoint documentaire et prochain point de reprise

[← Racine](../README.md) · [Gates](ADOPTION_GATES.md)

## Tranche en cours

- **Objet :** creation d'une racine candidate `WT-PROJECT-MCP-001` et de registres profonds **uniquement par liens Markdown**, reliee a GitHub et aux sources du bridge MCP.
- **Projet :** `Patricked-code/MCP`, distinct des projets administres par le MCP.
- **Baseline avant travail :** `main@b2cdeaa116b22546ca15c2fb9fd6dcc7e215efb7`, observe le 10 novembre 2026.
- **Branche isolee :** `mcp/canonical-project-deep-markdown-20261110`.
- **Autorite:** GitHub pour les fichiers et commits ; aucun write runtime ni changement de session/Task/Lock.
- **Point de reprise:** cette page + [README racine](../README.md) + statut GitHub **a reobserver**.
- **Rattachements sans takeover:** [#348](https://github.com/Patricked-code/MCP/pull/348), [#373](https://github.com/Patricked-code/MCP/pull/373), [#374](https://github.com/Patricked-code/MCP/pull/374), [#379](https://github.com/Patricked-code/MCP/pull/379), [#372](https://github.com/Patricked-code/MCP/pull/372).
- **Verification CI, PR, SHA de ce lot :** a remplir avec les **preuves GitHub reelles** apres commit et ouverture de PR ; ne pas inventer a l'avance.
- **Limites :** pas de resolver MCP deploye, pas de `ProjectRecord` MCP confirme, pas d'index universel operationnel.

## NEXT_ACTION deterministe

1. Verifier que les fichiers de cette branche apparaissent dans le commit exact et que `markdown-inventory.json` correspond au tracked Markdown.
2. Ouvrir ou lire la PR Draft de cette **meme branche** ; reobserver CI et commentaires de revue.
3. Faire une revue sans fusion automatique : identite, non-duplication, liens inter-PR, classifications de preuve, non-regression.
4. Apres approbation du contrat d'identite, et seulement dans un lot gouverne compatible : raccorder l'ID au GitRegistry existant et concevoir le resolver lecture seule GitHub/MCP.
5. Pour tout test live ultérieur : nouvelle reconcilation GitHub/S1/runtime ; **ne pas revendiquer ou fermer Regulatory**.

## Condition de sortie de la tranche

`DRAFT_PR_CREATED` avec fichiers inventoriés, liens existants et preuve de CI/revue **si disponibles**. `PROJECT_ID_CANONICAL_ACTIVE` et `MCP_RESOLVER_DEPLOYED` restent `NOT_PROVEN`. Conserver la chronologie et ce checkpoint comme historique si la tranche est supersedee.

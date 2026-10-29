# 04 — Sources et règles de conservation

[← Entrée unique](./README.md)

## Archives originelles immuables

- **Issue maître** : [#349](https://github.com/Patricked-code/MCP/issues/349) — décisions, mandats, checkpoints et commentaires.
- **Chaîne de PR** : [#350](https://github.com/Patricked-code/MCP/pull/350), [#351](https://github.com/Patricked-code/MCP/pull/351), [#352](https://github.com/Patricked-code/MCP/pull/352), [#353](https://github.com/Patricked-code/MCP/pull/353), [#354](https://github.com/Patricked-code/MCP/pull/354), [#355](https://github.com/Patricked-code/MCP/pull/355).
- **Registre JSON déjà existant** : [`MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028`](../universal-capabilities-bifurcation-20261028.json), non autoritatif et source de la cartographie des lots.
- **Checkpoint #350** : [document historique](../pr350-provisioning-grt-s1-checkpoint-20261023.md).
- **Évidences B3** : [B3b/B3c](../gd-u-02d-b3b-b3c-release-evidence-20261028.json), [B3d](../gd-u-02d-b3d-e3-single-use-20261028.json), [B3f](../gd-u-02d-b3f-http-mcp-admission-20261028.json), [B3g](../gd-u-02d-b3g-trusted-consumption-clock-20261028.json), [B3h](../gd-u-02d-b3h-review-integrity-20261028.json), [B3i](../gd-u-02d-b3i-authenticated-mcp-web-pairing-20261029.json).
- **Journaux du dépôt** : [`SUIVI.md`](../../../SUIVI.md), [`CHANGELOG.md`](../../../CHANGELOG.md), [`DECISIONS_LOG.md`](../../../DECISIONS_LOG.md), [`AGENTS.md`](../../../AGENTS.md), [`CLAUDE.md`](../../../CLAUDE.md).
- **Sources indexées** : [source-links.json](./source-links.json) — les liens individuels des **62 commentaires #349** et **149 entrées** issues de #350–#355 au moment de cette extraction. Il ne prétend pas archiver les contenus intégraux des commentaires/commits/CI.

## Règle de preuve et méthode de travail

`REQUESTED → DESIGNED → CODED → CI_VERIFIED → REVIEWED → MERGED → DEPLOYED → RUNTIME_VERIFIED` : chaque transition demande sa preuve datée et son SHA. Aucun statut n'est déduit d'un autre.

La bifurcation `GitHub-first / OIDC` concerne le transport de maintenance du MCP, pas un droit de contourner OAuth, E3, Task/Session/Lock, GitHub reviews, Plesk, ni le Governed Deploy. Préserver `PLESK_WRITE_HOLD` tant qu'aucune admission complète n'est prouvée.

## Protocole d'enrichissement append-only

1. Relire #349, les PR concernées, les HEAD exacts et les autorités de session/Task/Lock si nécessaires.
2. Ajouter des ancres vers les nouvelles preuves, sans réécrire les originaux.
3. Ne jamais inventer de Continuity ID pour une tranche qui n'en possède pas ; rattacher les IDs formels au bon nœud.
4. Actualiser l'inventaire Markdown versionné en même temps que tout nouvel `.md`; exécuter `npm run docs:check` et vérifier la CI exacte.
5. Ne publier de nouveaux liens canoniques qu'après un commit effectivement présent sur la branche.
6. Documenter et rapprocher tout éventuel drift après une fusion, sans réécriture destructive ni seconde mémoire.

## Limites constatées

La présente consolidation donne **un point d'entrée vers les sources**. Elle ne remplace pas une transcription exhaustive de tous les commits, reviews, lignes modifiées ou logs serveur, qui demanderait un dépouillement indépendant, une pagination/validation et une archive distincte contrôlée. Aucun élément antérieur n'est déclaré perdu faute d'un identifiant `CONT` formel.

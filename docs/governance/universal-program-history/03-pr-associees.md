# 03 — PR connexes #350 à #355 : propriétés et dépendances

[← Entrée unique](./README.md) · [Issue #349](https://github.com/Patricked-code/MCP/issues/349)

Cette carte est relationnelle, non une instruction de fusion. Les branches de PR ouvertes ne sont ni une Task possédée par cet agent, ni des permissions runtime.

**[PR #350](https://github.com/Patricked-code/MCP/pull/350) — feat(provisioning): additive S1/S2 Plesk planner and consented executor (TDD)** — état observé : FUSIONNÉE, HEAD historique `5e8e48d5d3d1886c6bb8996577446413589103cd`, 43 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

**[PR #351](https://github.com/Patricked-code/MCP/pull/351) — feat(pilot): TDD guarded runtime admission for GRT snapshot on S1** — état observé : DRAFT / OUVERTE, HEAD historique `58bcf5764e79f16c69301ec923b691e2a844953e`, 2 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

**[PR #352](https://github.com/Patricked-code/MCP/pull/352) — feat(provisioning): RED-GREEN exact Regulatory S1 /regulatory preflight** — état observé : DRAFT / OUVERTE, HEAD historique `ed8bc5f0463a52b87b3b7e90e9fc2f5548894760`, 1 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

**[PR #353](https://github.com/Patricked-code/MCP/pull/353) — docs(regulatory): scope governed S1 Plesk admission and acceptance gates** — état observé : DRAFT / OUVERTE, HEAD historique `0234a2ae3708d92993a2dc9b798b0ac95633ced1`, 19 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

**[PR #354](https://github.com/Patricked-code/MCP/pull/354) — GWC PRECODE candidate build — phase F happy path and beyond** — état observé : DRAFT / OUVERTE, HEAD historique `c4bd277495176de8adfb7c436a54f4b009968e68`, 3 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

**[PR #355](https://github.com/Patricked-code/MCP/pull/355) — feat(github): additive universal GitHub/Plesk/server capability foundations (GD-U-01)** — état observé : OUVERTE, HEAD historique `4424cc3cf217f676c462bb39d4b93b79d3a20e1b`, 81 entrées de discussion/revue indexées dans [le registre des sources](./source-links.json).

## Coordination anti-collision

- **#351** : pilote GRT / admission runtime. Respecter sa branche et son ownership propre.
- **#352** : préflight technique Regulatory sous-chemin `/regulatory`, pas sous-domaine.
- **#353** : contrats, admission et coordination Regulatory ; consulter les checkpoints propres à la PR.
- **#354** : GWC PRECODE, coordination Claude ; ne pas l'absorber automatiquement dans #355.
- **#355** : extension universelle sur branche existante ; les constructions GD-U-01/02 sont référencées par [les pages 01](./01-gd-u-01-compositions.md) et [02](./02-gd-u-02-branches.md).

Consulter le [registre exhaustif des liens de commentaires/revues disponibles](./source-links.json), puis les [commits](https://github.com/Patricked-code/MCP/pulls) et la CI par PR. Réconcilier le HEAD exact et les claims/locks avant toute écriture.

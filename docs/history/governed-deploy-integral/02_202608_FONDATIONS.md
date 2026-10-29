# Août 2026 — fondations et reprise non destructive

## 2026-07-29 — dérive locale mentionnée a posteriori
La PR #15 (créée le 2026-08-05T02:01:07Z) décrit une dérive locale « à partir du 29 juillet 2026 ». L'événement initial, ses auteurs, commits et preuves runtime restent à retrouver ; cette date n'est pas présentée comme origine du MCP.
Source : https://github.com/Patricked-code/MCP/pull/15

## 2026-08-05T02:01:07Z — PR #15
Titre : docs: cadrer la reprise non destructive du MCP.
Base mentionnée : `097dac93715c0af83fcfad82cd598bacec956125`.
Décisions : préserver l'état pré-dérive ; documenter GitRegistry V2 et la migration V1→V2 ; snapshot forensique avant alignement ; aucun reset, purge, déploiement, restart ni mutation Docker/S1 ; revue avant fusion.
Source : https://github.com/Patricked-code/MCP/pull/15

## 2026-08-05T06:56:08Z — PR #23
Titre : feat(registry): add GitRegistry v2 dry-run foundation.
Base `097dac93715c0af83fcfad82cd598bacec956125`; HEAD candidat `9a99c943bf07483836b5c39405abbe3b6f480bcd`.
Modules : `src/github/registryV2.ts`, `src/tools/githubRegistryV2.ts`, tests et documentation. Validation V1/V2, migration pure, hash canonique, dry-run read-only. Inventaire rapporté : 3 connexions, 3 dépôts, 2 mappings, 1 migration, 2 événements. PR conservée en draft à ce stade.
Source : https://github.com/Patricked-code/MCP/pull/23

## 2026-08-05T08:27:05Z — PR #27
Titre identique, reprise depuis main protégé `c4958d97ff67dbf4352b8a1f9c2716fe9cf25d7b`, HEAD `0d2098183afa4d32e3b3cc873be08ca42e1b242d`.
Décision : conserver PR #23 comme historique, fermer sans fusion, éviter les migrations actives et toute écriture S1.
Source : https://github.com/Patricked-code/MCP/pull/27

## À compléter sans inventer
Premier commit du dépôt ; workflows de déploiement initiaux ; première mise en production ; inventaires et attestations exact-SHA d'août ; événements GitRegistry intermédiaires ; relations PR #18/#19/#28.

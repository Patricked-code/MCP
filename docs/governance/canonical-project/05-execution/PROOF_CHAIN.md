# L5 — Chaine d'execution, controle et preuve exact-SHA

[← Racine](../README.md) · [Dependances](../03-planning/DEPENDENCIES.md) · [Continuite](../04-continuity/HIERARCHY.md)

## Invariants

`Design / mandat → branche autorisee → code additif → tests → PR → CI exact HEAD → revue independante → merge gouverne → CI main → Governed Deploy MCP → S1 → runtime/health → Live State → checkpoint`.

Chaque maillon exige **sa propre preuve**. Le canal GitHub-first peut effectuer une mutation GitHub autorisee sans creer artificiellement une Task MCP, mais ne peut pas se passer des permissions, de l'ownership, des protections de branche et de la revue. Les operations runtime utilisent leurs autorites effectives.

## Preuves minimales par transition

| Gate | Entree | Preuve de sortie | Si manquante |
| --- | --- | --- | --- |
| Scope | Issue + mandat | Perimetre et collisions evalues | Stop ecriture ciblee |
| Design | Spec + baseline | Approval si requis | Planification sans implementation READY |
| GitHub | SHA de base exact | Branche/HEAD verifies | HEAD_DRIFT |
| Code | Scope autorise | Diff, tests et scans | Pas de PR declaree prete |
| PR | HEAD cible | CI exact-head + revue | Pas de merge |
| Main | Merge SHA | CI main au SHA resultante | Pas de deploy declare complete |
| Deploy | Revision `main` | Run + attestation de livraison | Runtime non prouve |
| S1 | HEAD, origin/main, tree | Checkout exact et propre | Alignement refuse |
| Runtime | Revision image et health | SHA exact, service sain | Alignement refuse |
| Continuite | Tous recus disponibles | Checkpoint, preuves et NEXT_ACTION | Cloture refusee |

## Observation ponctuelle du 10/11/2026

En lecture seule, Live State a renvoye `stateVersion 1256`, `FULLY_ALIGNED` et le SHA identique GitHub/S1/runtime `b2cdeaa116b22546ca15c2fb9fd6dcc7e215efb7` avec runtime `healthy`. **C'est une observation datee, pas la preuve qu'une nouvelle PR/documentation est deployee.**

## Archives specialisees

- [PR #371](https://github.com/Patricked-code/MCP/pull/371) : registre historique des merges, candidat non incorpore a `main` par cette page.
- [PR #372](https://github.com/Patricked-code/MCP/pull/372) : UTL/matrice historique, ne pas repliquer les tables ni les ecrire dans une nouvelle memoire.
- [Live State](https://github.com/Patricked-code/MCP/tree/main/src/liveState) : reconciliation runtime.
- [Workflow MCP](https://github.com/Patricked-code/MCP/blob/main/.github/workflows/mcp-deploy.yml) : route de deploiement propre au MCP.

L'outil bridge est aussi utilisable pour des **deploiements d'applications**, mais cette chaine documente le **projet MCP lui-meme**. Ces pipelines ne doivent pas etre confondus.

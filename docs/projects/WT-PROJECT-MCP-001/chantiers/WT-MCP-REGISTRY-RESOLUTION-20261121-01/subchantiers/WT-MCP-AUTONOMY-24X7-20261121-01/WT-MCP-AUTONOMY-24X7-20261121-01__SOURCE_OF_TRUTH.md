# Autorités et précédence — autonomie 24/7
> Child `WT-MCP-AUTONOMY-24X7-20261121-01`, parent `WT-MCP-REGISTRY-RESOLUTION-20261121-01`. Les documents locaux sont des **projections**, jamais des autorités de runtime.

| Objet | Autorité et source d'écriture | Pourquoi |
| --- | --- | --- |
| Code, branches, PR, reviews, checks, rulesets | GitHub dépôt propriétaire, HEAD exact | Une branche PR n'est pas du code en production |
| Projet, repository mapping et cible | GitRegistry / Project Binding **existants** | Pas de nouveau registry ; numeric repo ID et preuve installation |
| CUG observations et receipts | CUG signé + GitHub App API selon droits | Signal, pas mandat d'exécution |
| Intentions et décision métier | Source autorisée + documentation/registre propre au chantier | L'histoire et la provenance survivent à une conversation |
| Task runtime, transition et claim | Governed Task Queue P2 | Un TODO Markdown n'est pas une Task |
| Identité agent, session, bootstrap | Governed Sessions / transport authentifié | Un agent ne choisit pas une autre session |
| Collision et locks | Existing Lock/Claim Services + UAC | Stale heartbeat != release/owner transfer |
| Plan de travail | Program Backlog V2 + Loop documents par scope | Ordre de programme non égal à permission de Task |
| Architecture et graphe de code | Code GitHub@SHA, runtime, décisions documentées | Cible de cartographie sourcée, pas dépendance SBOM seule |
| Déploiement MCP | GitHub Actions Governed Deploy OIDC→S1 Docker Compose | Aucun Kubernetes attesté |
| État de production | MCP Live State GitHub/S1/OCI + G1 doc | 4 preuves distinctes et attestation fraîche |
| Agents permanents UAES | UAES runtime attesté et ses propres fichiers/mandats | `runtime_operational=false` déclaré dans source état à revalider |
| Certification de cycle | C27 avec readers réels | Pas de PASS fondé sur fixtures/tests unitaires |
| Source DOCX | Fichier original SHA `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, analyse mission mère | Intention/plan, pas preuve de runtime |
| Documents de ce sous-chantier | GitHub branch/PR propriétaire (source) | Leur statut n'autorise rien tant que branch non revue/merge |

En cas de conflit, conserver toutes les preuves, classifier `CONFLICT`, refuser toute promotion automatique. `UNKNOWN` signifie absence d'observation, jamais `ALLOWED` ou `DISABLED`. Les versions datées de `SUIVI/CONTINUITY` sont append-only. Un ancien commit SHA historique reste référence historique, non current state.

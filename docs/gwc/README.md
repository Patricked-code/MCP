# GWC — Governed Workflow Contract : dossier permanent

## Objet

Ce répertoire est la source versionnée unique de l'architecture des 73 contrats GWC et du backlog qui en découle. Il est conçu pour être lu par un humain **et** par n'importe quel agent, et pour être complété au fil des révisions sans perdre l'historique.

L'autorité de départ reste `docs/superpowers/specs/2026-09-15-governed-workflow-contract-v1-design.md`. Ce dossier ne la remplace pas : il la prolonge par une architecture confrontée au code réel.

## État

| Champ | Valeur |
| --- | --- |
| Révision courante | `R2` |
| Statut | `AWAITING_HUMAN_RATIFICATION` |
| Dépôt | `Patricked-code/MCP` |
| SHA observé pour R2 | `d1f303955c4d368950da2307dda41d826fc85d0a` |
| Implémentation autorisée | **non** — aucune tâche GWC ne doit être exécutée avant ratification |

## Contenu

| Fichier | Rôle | Lecteur |
| --- | --- | --- |
| `docs/gwc/README.md` | porte d'entrée, protocole d'amendement | humain et agent |
| `docs/gwc/ARCHITECTURE_73_CONTRACTS.md` | architecture complète, 73 fiches, findings AF-01 à AF-30 | humain |
| `docs/gwc/BACKLOG.md` | backlog lisible et procédure de promotion | humain |
| `.mcp/gwc-contracts.json` | les 73 contrats en lecture machine | agent |
| `.mcp/gwc-task-seed.json` | backlog candidat au format `TaskRegistrySeed` | agent |
| `scripts/gwc-verify.mjs` | vérificateur déterministe des deux artefacts | CI, humain, agent |

## Protocole obligatoire pour tout agent

1. **Lire avant d'agir.** `CLAUDE.md`, `SUIVI.md`, puis ce `README.md`, puis `.mcp/gwc-contracts.json` pour l'état d'un contrat précis.
2. **Ne jamais déduire l'état courant d'un checkout local.** GitHub live est la source de vérité. Observer `main` et son SHA exact, les branches, les PR ouvertes avec leurs base et head SHA, les checks, les workflow runs et les rulesets avant toute conclusion. Étiqueter chaque affirmation dépendante de l'état : `GITHUB_LIVE` ou `LOCAL_CLONE`.
3. **Ne jamais transformer une hypothèse en certitude.** Une donnée non reproduite s'écrit `À VÉRIFIER`.
4. **Ne jamais renuméroter, supprimer ou fusionner un identifiant `GW-xx`.** Les 73 identifiants sont un espace de noms stable, pas une séquence d'exécution.
5. **Ne jamais créer une seconde autorité.** Pas de second Live State, de seconde Task Queue, de second moteur de session, de second gestionnaire de locks, de second GitRegistry, de second moteur de déploiement, de seconde base d'attestations.
6. **Ne jamais exécuter une tâche du seed avant ratification** et avant sa promotion dans `.mcp/task-registry.json`.
7. **Après toute modification de ce dossier**, exécuter `node scripts/gwc-verify.mjs` et documenter dans `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md`.

## Comment amender

Les révisions sont additives. Une révision ne réécrit pas la précédente, elle l'amende et le signale.

1. Créer une branche de travail dédiée ; jamais de push direct sur `main`.
2. Ajouter une section `R<n>` à la fin de `ARCHITECTURE_73_CONTRACTS.md`, avec son en-tête d'observation, ses corrections et son journal d'amendements.
3. Poser un marqueur court à l'endroit du texte amendé plutôt que de le réécrire, afin que la lecture historique reste possible.
4. Répercuter les changements structurants dans `.mcp/gwc-contracts.json` (champs `maturity`, `integrationStrategy`, `r2Note` et suivants) et, si la séquence change, dans `.mcp/gwc-task-seed.json`.
5. Recalculer les empreintes : `node scripts/gwc-verify.mjs --write`, puis vérifier : `node scripts/gwc-verify.mjs`.
6. Mettre à jour `docs/governance/markdown-inventory.json` si un Markdown est ajouté ou retiré.
7. Ouvrir une pull request draft.

## Empreintes et intégrité

`.mcp/gwc-contracts.json` et `.mcp/gwc-task-seed.json` portent un `registryDigest`, et chaque tâche du seed porte un `requestDigest`. Les deux reposent sur la même sérialisation canonique que `src/operationalMemory/taskQueue.ts`, afin qu'une empreinte calculée hors runtime soit identique à celle calculée par le runtime.

`scripts/gwc-verify.mjs` recalcule ces empreintes et échoue si un artefact a été édité sans les régénérer. Câbler ce script dans la CI fait partie du LOT 0, après ratification.

## Frontière assumée

Ce dossier est de la documentation et de la donnée. Il ne modifie aucun comportement runtime, n'ajoute aucun outil MCP, ne crée aucune tâche dans la Governed Task Queue, ne prend aucun lock et ne déclenche aucun déploiement. `.mcp/gwc-task-seed.json` est un fichier de préparation : il n'est chargé par aucun code. Seul `.mcp/task-registry.json` est lu au démarrage par `initializeSeed()`.

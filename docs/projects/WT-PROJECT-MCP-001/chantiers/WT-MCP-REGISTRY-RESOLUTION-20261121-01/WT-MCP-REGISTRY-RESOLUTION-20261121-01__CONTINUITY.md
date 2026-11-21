# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Point de reprise canonique de mission

> Alias verbal : « Rejoins la mission de résolution du problème des registres ».\
> Projet GitHub : `Patricked-code/MCP` ; UID parent candidat `WT-PROJECT-MCP-001` (PR #389).\
> Continuité de la mission : **`WT-MCP-REGISTRY-RESOLUTION-20261121-01`**.\
> Intervention : **P01 — Audit de couverture**, travail sur `mcp/registry-resolution-audit-20261121` ; fichier présent dans une PR draft après publication et non encore en production.
> Reprise opérateur : ne jamais présumer que le SHA et les comptes observés le 2026-11-21 sont toujours actuels.

## État au point d'arrêt

- MCP HTTPS répond ; Live State observé version 1410 ; GitHub main/S1/runtime au SHA `5bc5e2b4c0b2aa176c1f6131826afbea7af2f164` et runtime healthy lors de l'audit.
- Documentation courante non alignée : `DOCUMENTATION_DRIFT`, référence ancienne `fb0cb474...`.
- GitRegistry V1 : 3 connexions, 6 dépôts, 5 mappings, 2 projets, 1 migration en attente.
- GitHub comptes durables : 17 + 31 + 25 références non dédupliquées.
- Work Queue : 21 tâches (14 DONE / 3 READY / 4 SUPERSEDED), storeRevision=244 ; sessions visibles=31.
- `.mcp/server-map.json` : S1 targetProjectIds est vide.
- CUG webhook reçoit et déduplique ; pas encore de pipeline vérifié à la queue ni au cockpit universel.
- GitHub direct Patricked-code/MCP accessible ; chemin contrôlé MCP `github_get_repository_state` a retourné `GITHUB_CONTROL_ORG_NOT_ALLOWED`.
- Cette mission **n'a pas activé** de tâches, registres, cibles, hooks, écritures S1/S2 ou accès supplémentaires.

## NEXT_ACTION strict

1. Relire ce dossier, les instructions `GPT.md`, `AGENTS.md`, `SUIVI.md`, `SOURCE_OF_TRUTH.md`, les documents de #389 et les derniers points de reprise CUG.
2. Réobserver GitHub live, exact HEAD, S1/runtime/documentation, éviter collisions avec d'autres branches et déclarer les divergences.
3. Compléter et faire relire la matrice P01 : autorités de chaque projet, registres et identifiants réellement disponibles ; prouver les permissions et cibles, ne pas inférer depuis le nom.
4. Diagnostiquer le `GITHUB_CONTROL_ORG_NOT_ALLOWED` et le G1 drift ; préparer les corrections additives après preuve et admittance gouvernée.
5. Seulement après la revue et la clôture de P01, déclencher P02/P03, avant tout code d'auto-raccordement CUG ou frontend.

## Conditions de succès

L'identifiant de mission ramène aux mêmes documents, responsabilités, dépendances et blocages depuis toute nouvelle conversation ; aucune nouvelle Task Queue n'est déduite de ce fichier. Les checkpoints futurs sont ajoutés dans l'autorité de continuité existante puis référencés ici par leur ID, sans inventer leur existence.

## STOP CONDITIONS

Divergence d'HEAD, source/ownership absent, chemin GitHub interdit, identité de dépôt ambiguë, conflit entre registre et mémoire, absence de validation ou CI/revue pour mutation. En cas de STOP : documenter le motif et garder une action de reprise, sans supprimer ni remplacer l'historique.

## 2026-11-21 — Checkpoint audit P02 / gate E2

- Le parcours E2 demandé par le propriétaire a été exécuté : `mcp_e2_reconcile_preflight` → `BLOCKED/E2_DOCUMENTATION_DRIFT` ; `canStartOrdinaryWork=false`. Main/S1/runtime restent alignés à `5bc5e2b4c0b2aa176c1f6131826afbea7af2f164`, mais `PRODUCTION_STATE.json` déclare `fb0cb47417ace348176ff3218484783cc6978a8d`.
- La **PR #429** existante est le correctif documentaire G1 exact SHA ; seul `PRODUCTION_STATE.json` change. Son commit `b42aad9d145b4864c882683d4f869fea164cb5ba` possède une CI `MCP CI` #44742423754 terminée SUCCESS ; aucune revue GitHub n'a été renvoyée lors du contrôle. **Ne pas fusionner sans revue indépendante et autres gates**, ne pas créer un G1 concurrent.
- Diagnostic du refus Bridge : `src/tools/githubControlPlaneRead.ts` et `src/tools/githubLifecycle.ts` appliquent `assertOrg(organization, env.GITHUB_ORG)` ; `defaultTargetOwner=chainsolutions-wealthtech`, alors que l'appel cible `Patricked-code`. Les droits GitHub directs séparés sont attestés ; aucune politique élargie ou contournement n'a été appliqué.
- Le plan détaillé **35 opérations RG-001…RG-035** a été créé dans `WT-MCP-REGISTRY-RESOLUTION-20261121-01__IMPLEMENTATION_PLAN.md`. Il inclut l'intégration des modules existants, la fédération read-only, les admissions CUG/Queue, la UI cockpit, les tests historiques et la chaîne Governed Deploy.
- **Réalité déploiement :** `.github/workflows/mcp-deploy.yml` décrit OIDC → S1 Docker Compose. Aucun déploiement Kubernetes MCP actuel n'est attesté ; une migration Kubernetes ne saurait être annoncée ni intercalée sans mission/gates distincts.
- **NEXT_ACTION** : clore G1 en procédure documentée (PR #429 revue, merge admissible, Governed Deploy, attestation), revalider E2 ; compléter P01 en lecture, puis commencer P03 après gates. Aucun code runtime ni autre dépôt modifié dans cette session.

### Limites de poursuite automatique (constat après le checkpoint)

- La continuité est publiée sur la branche GitHub et la PR #430, mais **son enregistrement comme continuité E2 runtime visible par `mcp_e2_list_continuities` n'est pas attesté** : le préflight E2 reste BLOCKED.
- Une tentative de création d'une automation horaire propre à cette mission a échoué avec `too_many_active_automations` : 5 tâches existantes pour une limite de 5. **Aucune automation supplémentaire n'a été créée et aucune automation existante n'a été modifiée.** La poursuite sans nouveau message n'est donc pas garantie par cette tentative.
- Le dernier HEAD observé de la PR #430 est `94412a39a0cf9b20c38d3b9207690b9a2b29629f` ; run MCP CI #44933287364 `in_progress` lors de l'observation. Son issue doit être réobservée avant toute validation.

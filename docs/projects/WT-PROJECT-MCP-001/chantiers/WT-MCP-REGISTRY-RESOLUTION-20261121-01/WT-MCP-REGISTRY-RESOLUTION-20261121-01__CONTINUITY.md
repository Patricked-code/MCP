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

## 2026-11-21 — Correction chronologique du checkpoint précédent et exécution P03/P08/P09

> **Ce checkpoint est postérieur à la section « Limites de poursuite automatique » et prévaut pour les faits datés ci-dessous.** Le journal historique reste append-only : les blocages antérieurs ne sont pas supprimés, mais ils ne doivent pas être réutilisés comme état actuel.

- **G1 résolu et déployé :** PR #429 revue par `Wealthtechinnovations`, fusionnée sur `main@a0c7052fe72f65d604ec060a129977708c91d6f5`, GitHub/S1/runtime/OCI healthy et Live State v1416 `FULLY_ALIGNED`. Le préflight E2 renvoie `canStartOrdinaryWork=true` et aucun blocage de synchronisation : ne pas redemander la revue G1 déjà obtenue.
- **E2 activation séparée encore bloquée :** l'écriture append-only de journal canonique sur issue #359 via le credential GitHub *du serveur* reçoit `E2_JOURNAL_POST_HTTP_403`. Le connecteur GitHub ChatGPT autorisé ne peut pas remplacer cette permission dans l'outil runtime. [Diagnostic et demandes de remédiation](https://github.com/Patricked-code/MCP/issues/359#issuecomment-7067480197).
- **Automatisation de continuation :** contrairement au checkpoint ancien, **l'automatisation existante** `Automation_ed5206f7042c8191b454a1cda0d0c4af` « Continuité CUG GRT GRGS » **a bien été enrichie** du mandat distinct `WT-MCP-REGISTRY-RESOLUTION-20261121-01` et demeure active avec `RRULE:FREQ=HOURLY`. Elle reprend périodiquement le chantier et ne doit pas dupliquer les branches déjà possédées. **Elle n'est pas un worker codeur 24 h/24.**
- **RG-008..RG-012, PR #431 :** `mcp/registry-federation-projection-20261121`, dernier HEAD observé `2da41e1792bce2fae1bf1bfe9b09badbc272f1d0`, MCP CI #44938966678 **SUCCESS**. Projection fédérée pure sans second registre, adaptateurs GitRegistry V1/V2 + Governed Task Queue, tâches historiques, preuves, Project UIDs et dépendances inter-dépôts. Deux cycles de revue automatisée ont détecté sept constats P2 désormais corrigés par tests et réponses sur les fils ; nouvelle demande de revue sur ce HEAD [ici](https://github.com/Patricked-code/MCP/pull/431#issuecomment-7067777825). Ne pas prétendre à `APPROVED` tant que GitHub ne l'atteste pas.
- **RG-025..RG-029, PR #432 :** `mcp/registry-federation-cockpit-20261121` HEAD `018669f33b084c270d9daace006fc77d97bb6c9f`, CI #44938580442 **SUCCESS**. Frontend `/registry-cockpit` derrière l'auth web existante, lecture des autorités, filtres, historique terminal, échappement XSS et isolation entre dépôts. **PR empilée sur une ancienne révision de #431 : réconcilier la branche par changement additif avant toute fusion**. Aucune mise en production.
- **RG-030/RG-032, PR #433 :** `mcp/registry-governed-review-dispatch-20261121`, HEAD `f1227afa2024d2af73c9e587350607f23b3a9c63`, workflow GitHub Actions borné proposant automatiquement `@codex review` après CI verte et vérification des SHA/permissions. Le workflow est enregistré dans la politique `.mcp/provisioning-contracts.json` sous `NOT_PROVISIONING`, sans auto-approbation ou fusion. CI #44939759959 **in_progress au dernier contrôle**, revue bot en cours. N'annoncez pas une activation runtime avant merge/attestation/pilote réel.
- **Exécution réellement continue :** `src/cug/receiptConsumer.ts` contient un poller in-process pour le pilote CUG, mais ni lui ni les automations ChatGPT horaires ne constituent un agent de codage supervisé permanent. L'état UAES précédemment observé `runtime_operational=false` interdit de prétendre à la disponibilité d'un worker IA 24 h/24 sans pilote d'hébergement, credentials et supervision attestés.
- **Autorités et non-régression :** aucun des trois nouveaux lots #431/#432/#433 n'est fusionné sur main dans ce checkpoint. Les données historiques et secrets restent en place, GitRegistry et Governed Task Queue demeurent sources de vérité. Aucun autre dépôt n'a été modifié.

**NEXT_ACTION exécutable avec le présent mandat :** réobserver le dernier SHA/CI et les nouvelles remarques des PR #431 et #433, corriger les P2 éventuels, déclencher une revue automatisée indépendante et fusion/auto-merge seulement si les rulesets et la politique `CI_AND_REQUIRED_REVIEWS_ON_EXACT_SHA` le permettent ; après PR #431, réconcilier #432 sur base fraîche, valider CI/revue et effectuer Governed Deploy + Live State ; avancer ensuite les étapes CUG→admission/queue/cockpit enrichi, sans contournement du droit de journal E2. En parallèle, qualifier la permission `Issues:write` du credential serveur et les prérequis d'un worker durable sous supervision.

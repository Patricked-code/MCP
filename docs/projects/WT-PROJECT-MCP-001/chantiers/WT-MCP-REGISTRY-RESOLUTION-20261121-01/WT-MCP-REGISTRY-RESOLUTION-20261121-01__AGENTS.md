# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Instructions agents de cette mission

> Scope exclusif : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` ; dépôt `Patricked-code/MCP`. Aucune autorité supplémentaire. Hérite du `AGENTS.md` racine, de `CLAUDE.md` et des protections GitHub.

## Admission et reprise obligatoire

1. Lire `__SOURCE_OF_TRUTH.md`, `__DOCUMENT_AUTHORITIES.md`, `__MISSION.md`, `__DECISIONS.md`, puis `__CONTINUITY.md` **depuis l'ancrage D32 jusqu'au dernier checkpoint** ; lire `__MEMORY.md` et `__INTENTIONS.md`.
2. Lire `__ROADMAP.md`, `__SUIVI.md`, `__TASKS.md`, `__TODO.md`, `__IMPLEMENTATION_PLAN.md`, `__EVIDENCE_INDEX.md` et les audits. Lire les documents du sous-chantier UAES **uniquement si le scope le demande**, en conservant leur propriété.
3. Reconsulter le GitHub HEAD, les PR, CI exact SHA, revues, autorité GitRegistry, installations CUG, Task Queue, sessions/locks, S1/Live State et G1. La dernière valeur documentée reste historique tant qu'elle n'est pas reconfirmée.
4. Rattacher chaque demande au projet, à cette mission et à une opération RG ; classifier DUPLICATE, COMPLEMENT, NEW_INTENT, DECISION, CONTRADICTION, BLOCKER, EVIDENCE ou OUT_OF_SCOPE. Conserver l'original accessible, son horodatage, l'émetteur et la référence dans `__INTENTIONS.md`. Une intention n'admet jamais une Task runtime par elle-même.
5. Évaluer les dépendances, droits et collisions des branches/agents ; privilégier le travail déjà engagé, ensuite la première opération admissible **dans la mission**, en gardant le classement historique et en consignant toute modification de priorité dans `__SUIVI.md`/`__ROADMAP.md`.
6. Pour toute modification : branche et PR propriétaire, tests de non-régression, CI HEAD exact, revue indépendante admissible **sans Codex** (instruction actuelle), protections, fusion gouvernée, Governed Deploy, preuves GitHub/S1/runtime/G1 et checkpoint.
7. Après chaque action significative : mettre à jour l'intention, la tâche documentaire et le suivi **du même scope**, indexer les preuves et écrire `NEXT_ACTION_CURRENT` avec blocage/conditions. Si la PR n'est pas fusionnable, laisser un commentaire horodaté à la PR mère #430 avec référence de la branche, sans prétendre que `main` a été mis à jour.

## Conditions d'arrêt

STOP_WRITE si identité/authority manquante, PR possédée par autrui, droits/locks non vérifiés, CI/revue inadmissible, secrets, changement de HEAD ou conflit. Une mission bloquée ne bloque pas mécaniquement les autres. **Ne pas réactiver** l'automatisation horaire « Continuité mission registres MCP » et ne pas utiliser Codex sans instruction nouvelle.

## Sortie de chaque intervention

`continuityId` · `ownerScope` · `observedAt` · `sourceSha` · `intentionRef` · `operationRG` · `completedEvidence` · `remainingWork` · `dependencies` · `blockers` · `nextActionCurrent` · `actionHistoryRef` · `CI/review/deploy status`. Une valeur inconnue reste `UNVERIFIED` ; un Task ID fictif est interdit.


## Entrée universelle par un seul Continuity ID — contrat RG-011 (complément)

**Commande utilisateur attendue :** `Rejoins WT-MCP-REGISTRY-RESOLUTION-20261121-01`. Un nouveau client/agent authentifié doit d'abord rechercher l'outil MCP en lecture seule `mcp_rejoin_continuity` et l'appeler **avec le seul champ obligatoire** `continuityId`. Ne pas redemander les fichiers de passation si les autorités sont accessibles. Historique paginé au besoin via `historyOffset/historyLimit`.

**Gates de réalité :** tant que le code proposé par [PR #445](https://github.com/Patricked-code/MCP/pull/445) n'est pas fusionné et déployé avec attestation, l'outil n'existe **pas** dans le runtime : suivre alors les étapes documentaires 1–7 ci-dessus, en utilisant le checkpoint fondateur [#7068870350](https://github.com/Patricked-code/MCP/pull/430#issuecomment-7068870350) et le dernier commentaire de reprise effectivement accessible de la [PR maîtresse #430](https://github.com/Patricked-code/MCP/pull/430). Ne pas deviner l'état des PR ouvertes, du serveur ni du registre sur la base d'un commentaire.

**Interprétation des résultats :** `documentationIndex` et décisions liées au SHA peuvent être restaurées en lecture ; les mentions `PROJECT_BINDING_NOT_ATTESTED`, `CUG_INSTALLATION_NOT_ATTESTED`, `TASK_SCOPE_BINDINGS_NOT_ATTESTED` ou `LIVE_STATE_STALE` sont de **véritables blocages de certification**, pas une invitation à créer des rattachements ou tâches. L'état `DECLARED` de la prochaine action documentaire ne devient pas un droit `GOVERNED_WRITE`. Les liens parent/enfant sont consultables sans absorber leurs tâches ni leurs mémoires.

**Suite automatique permise :** après vérification des sources propriétaires et des dépendances, effectuer les lectures et contrôles admissibles ; pour toute écriture, passer par les sessions, admissions P2, locks, CI/revue indépendante hors Codex et déploiement gouverné. À chaque action autorisée, conserver l'intention, la preuve, la progression et le nouveau checkpoint dans les **registres propres au périmètre**. L'automatisation de cette mission reste désactivée.

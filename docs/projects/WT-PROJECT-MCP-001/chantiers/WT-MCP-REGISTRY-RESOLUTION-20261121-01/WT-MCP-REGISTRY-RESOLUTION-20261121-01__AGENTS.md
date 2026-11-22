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

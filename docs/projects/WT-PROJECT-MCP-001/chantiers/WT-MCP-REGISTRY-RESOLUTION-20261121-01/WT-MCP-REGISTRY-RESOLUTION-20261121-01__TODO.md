# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — TODO propre à la mission

> Checklist de **conception, validation et suivi**, distincte des Task IDs P2. Ordre dérivé de `__SUIVI.md` et `__TASKS.md`. Les cases cochées signifient livrable documentaire/technique précis prouvé, jamais mission entière DONE.

## Acquis attestés

- [x] Enregistrer R01–R07, RG-001…056, D32 et le dossier de mission sur `main` — [PR #430](https://github.com/Patricked-code/MCP/pull/430).
- [x] Livrer la projection fédérée en lecture seule des autorités existantes — [PR #431](https://github.com/Patricked-code/MCP/pull/431).
- [x] Livrer le crosswalk de cohérence d'identités fail-closed — [PR #442](https://github.com/Patricked-code/MCP/pull/442).
- [x] Réconcilier la documentation de production après #442 — [PR #443](https://github.com/Patricked-code/MCP/pull/443), attestation datée #7071333389.

## À exécuter — P2 / ordre de dépendance (ne pas effacer les travaux ouverts)

- [ ] `REG-WP-01` Réobserver les ProjectRecords/mappings GitRegistry, CUG installations/permissions et repository ID stables ; vérifier les cas 403 et les politiques de scope.
- [ ] `REG-WP-02` Clarifier le lien `mcp_bridge` ↔ `WT-PROJECT-MCP-001` sans promotion implicite, produire statuts `VERIFIED/UNVERIFIED/CONFLICT`.
- [ ] `REG-WP-03` Finaliser la PR #444 : index local/mémoire/intentions/suivi, inventaire Markdown exact, CI HEAD, revue indépendante **sans Codex**, fusion sous gates, réattestation G1.
- [ ] `REG-WP-03` Coder le lecteur universel **read-only** par Continuity ID sur les résolveurs existants (pas second store), avec sources path/ref/SHA/propriétaire/état.
- [ ] `REG-WP-03` Tester intentions et NEXT_ACTION propres à deux projets et deux missions d'un même projet ; contradiction, doublon, dépendance et absence d'autorisation doivent rester fail-closed.
- [ ] `REG-WP-04` Terminer #420 et #435 sous leurs propriétaires ; prouver la réception CUG et l'admission Governed Queue, puis le readback idempotent.
- [ ] `REG-WP-05` Terminer le cockpit #432 et afficher projets, sous-projets, missions, tâches, checkpoints et dépendances par scope autorisé.
- [ ] `REG-WP-06` Terminer Insights #436 et joindre les observations vérifiées aux bons projets et missions.
- [ ] `REG-WP-07` Prouver C26/UAES/C27 pour le sous-chantier enfant sans supposer de worker opérationnel.
- [ ] `REG-WP-08` Produire la matrice de clôture RG-001…056, preuves CI/revue/merge/Deploy/Live State/G1, et n'inscrire `MISSION_DONE` qu'après acceptation.

## Règle dynamique

Une nouvelle instruction : consigner `REG-INT-*` dans `__INTENTIONS.md`, vérifier son périmètre, ses dépendances et son autorité, proposer un changement documenté dans `__SUIVI.md` et `__ROADMAP.md`, puis mettre à jour cette checklist **sans réordonner tout le programme par réflexe**. Garder les tâches passées, superseded et bloquées dans la traçabilité. Codex et l'automatisation horaire de mission restent suspendus à cette date.

## 2026-11-22 — D39 / recette MCP froide / PR #447 (checkpoint additif)

> Les cases anciennes ci-dessus restent historisées. Le présent état *supersede* leurs assertions branch-only devenues périmées.

- [x] #444 : documents D39 et mémoire sur main, merge `1a569b0f3456946273d49f19c00f0131dcf50ad4`.
- [x] #445 : lecteur `mcp_rejoin_continuity` et projection sur main, merge `ef81174e2891bc4467079d4d3722cd0a3722d605`.
- [x] #446 : réconciliation documentaire G1, main/S1/runtime `b843818df0b00125f9dd319ab2f4b99b169f5892`, Live State v1458.
- [x] Deux appels froids parent/enfant `PARTIAL` exécutés ; anomalies identifiées avec preuves, pas de droits ni Task ID promus.
- [ ] REG-WP-03 : corriger cinq anomalies dans #447, tests de non-régression, CI HEAD exact, mise en production seulement sous gates, puis rejoin froid réel des deux scopes.
- [ ] REG-WP-01/02 : attester ProjectRecord, UID candidat, repository ID, GitRegistry et installation/permissions CUG.
- [ ] REG-WP-04/05/06 : raccorder CUG/P2/Operational Memory, cockpit #432 et Insights #436 après jointures prouvées.
- [ ] REG-WP-07/08 : garder l'autonomie enfant non certifiée et la mission RG-001…056 ouverte.

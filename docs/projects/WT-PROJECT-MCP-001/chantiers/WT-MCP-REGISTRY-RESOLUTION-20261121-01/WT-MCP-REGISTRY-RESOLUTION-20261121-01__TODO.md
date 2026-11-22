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

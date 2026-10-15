# MCP — Fil d'Ariane historique et protocole de mémoire inter-agents (16 octobre 2026)

> **Nature : INDEX DE NAVIGATION NON AUTORITAIRE, PAS UNE NOUVELLE MÉMOIRE CANONIQUE.** Dépôt exclusif : `Patricked-code/MCP`, distinct de Governed-Repository-Template. Cette page relie les **archives immuables d'audit**, la **carte PCM-00..14**, le **Program Backlog V2**, les **checkpoints GitHub** et les **autorités runtime existantes**. Elle ne crée ni une Task Queue, ni une session, un claim, une permission, un dispatcher, ni une décision d'audit. Sa date et ses comptes sont des **photographies**, pas des états live.

## Les sept questions qu'aucun agent ne doit laisser sans réponse

1. **D'où part le mandat ?** Lire [l'issue maîtresse #235](https://github.com/Patricked-code/MCP/issues/235), `ARCHITECTURE.md`, `ROADMAP.md` et la [chronologie reconstituée depuis #65](architecture-chronology-issue65-20261009.json). **#65 marque la frontière de l'audit historique**, pas nécessairement la naissance du projet MCP.
2. **Qu'a-t-on observé, et à quelle date ?** Conserver les SHA, dates, issues, PR, commentaires et limites de couverture ; utiliser les [six lots d'archives de conversations](architecture-chronology-issue65-20261009.json) et le [manifeste de couverture des revues](gwb02-review-coverage-manifest-20261015.json). Une source absente reste `UNKNOWN`.
3. **Qu'est-ce qui a réellement été livré ?** Vérifier chaque PR fusionnée contre son commit, sa CI, son Governed Deploy et, si applicable, l'attestation serveur exacte. Ne jamais déduire `DONE` d'un titre de PR, d'un chemin de fichier ou d'une réussite de test documentaire.
4. **Quels constats restent ouverts ?** Lire le [triage des 158 remarques historiques](gwb03-pr-review-findings-triage-20261015.json), les vérifications ciblées [F-03 / PR #261](gwb03-pr261-source-policy-evidence-20261015.json) et [F-04 / PR #267](gwb03-pr267-domain-evidence-20261015.json). Établir un verdict individuel, pas un total hypothétique de bugs.
5. **Où veut-on aller ?** Lire la [carte PCM-00..14](mcp-priority-convergence-map-20261015.json), le [workblock GWB-00..09](governed-audit-continuation-workblock-20261009.json) et le [Program Backlog V2 / 94 blueprints](program-backlog-convergence.json). La première carte oriente, le second archive l'ordre des travaux, le backlog projette le planning ; **aucun n'autorise une exécution runtime**.
6. **Qui fait quoi maintenant ?** Réobserver GitHub `main`, les PR ouvertes, `SUIVI.md`, les derniers commentaires #235 et, pour un write runtime, Governed Sessions / Governed Task Queue / Governed Locks par moyen autorisé. Une PR candidate n'est pas une identité de session ou un claim.
7. **Quel est le prochain geste sûr ?** Reprendre sa propre tâche possédée d'abord, sinon sélectionner `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`, respecter les dépendances et permissions, exécuter un lot borné, vérifier, laisser des preuves et un `NEXT_ACTION` déterministe.

## Fil chronologique : jalons prouvés et références à relire

| Ordre | Événement / mémoire conservée | Preuve et statut au checkpoint 16/10 |
| --- | --- | --- |
| 1 | **Frontière du chantier d'audit : issue #65 et suivantes**. Reconstitution des conversations d'issues/PR et architecture. | [Chronologie](architecture-chronology-issue65-20261009.json) : index de 208 entrées et six fichiers de commentaires ; archivage partiel, car fils de revue et commentaires sur commits non couverts à l'origine. |
| 2 | **Architecture et historique gouverné**. | [PR #273](https://github.com/Patricked-code/MCP/pull/273) — chronologie indexée depuis #65, avec limites de couverture explicitement conservées. |
| 3 | **Ordre successif et dépendances de l'audit et de la continuité**. | [PR #275](https://github.com/Patricked-code/MCP/pull/275) ; [workblock GWB-00..09](governed-audit-continuation-workblock-20261009.json), projection NON_AUTORITAIRE (pas de Tasks runtime). |
| 4 | **Présence de sources/tests pour le programme**. | [PR #290](https://github.com/Patricked-code/MCP/pull/290) ; [94 chemins de blueprints](gwb04-94-blueprint-source-test-trace-20261015.json), **comportements non certifiés**. |
| 5 | **Corpus des revues collectées**. | [PR #291](https://github.com/Patricked-code/MCP/pull/291) ; [GWB02](gwb02-review-coverage-manifest-20261015.json) : 135 PR, 282 commentaires inline, 215 soumissions de revue, exceptions documentées. |
| 6 | **Triage des observations historiques**. | [PR #292](https://github.com/Patricked-code/MCP/pull/292) ; [158 remarques P1/P2](gwb03-pr-review-findings-triage-20261015.json) (89 P1 / 69 P2), `resolutionVerified=0` **dans ce manifeste** ; aucun diagnostic global de 158 bugs actifs. |
| 7 | **Reprise à froid de l'audit**. | [PR #293](https://github.com/Patricked-code/MCP/pull/293) ; liens d'entrée et checkpoints historiques, sans identité runtime fictive. |
| 8 | **Séquence globale de convergence**. | [PR #294](https://github.com/Patricked-code/MCP/pull/294) ; [15 jalons PCM-00..14](mcp-priority-convergence-map-20261015.json), 94 blueprints, dépendances, preuves, scopes anti-collision. |
| 9 | **Revue ciblée F-03**. | [PR #295](https://github.com/Patricked-code/MCP/pull/295) ; 17 des 73 remarques PR #261 ont été rapprochées d'ancres code/tests ; 56 restent sans spotcheck individuel ; [issue #262](https://github.com/Patricked-code/MCP/issues/262). |
| 10 | **Revue ciblée F-04**. | [PR #296](https://github.com/Patricked-code/MCP/pull/296) ; 18 des 26 remarques PR #267 ont été rapprochées d'ancres code/tests, huit restent sans examen individuel ; [issue #268](https://github.com/Patricked-code/MCP/issues/268). |
| 11 | **Réconciliation des candidats READY et des collisions historiques**. | [PR #300](https://github.com/Patricked-code/MCP/pull/300) fusionnée à `cc31ce12bea236b4cfb31d99ecee700c543f0c17` ; [matrice des 18 READY](gwb04-ready-ownership-20261015.json) ; tests comportementaux en attente. |
| 12 | **Point d'entrée partagé pour tout nouvel agent**. | [PR #304](https://github.com/Patricked-code/MCP/pull/304) fusionnée à `cdae63af7140c10b411ed43a9ddfacc039c731eb` ; [directive #235](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6203867094) et test de cold-start. |
| 13 | **Poursuite GWB-04 : tracing H-01 et cockpit K-01**. | [PR #305](https://github.com/Patricked-code/MCP/pull/305) **OPEN** au checkpoint ; H-01 : inventaire de 7 hops/4 gaps candidats, revue complémentaire requise ; [issue cockpit #236](https://github.com/Patricked-code/MCP/issues/236) : pré-inventaire de la sécurité, sans certification K-01. |

Ces lignes sont des **repères de consultation**, non des ordres d'exécuter aveuglément des PR anciennes. Les numéros d'issues, de PR et de commits lient les événements et empêchent de réécrire l'histoire depuis une conversation particulière.

## Registre des lacunes à conserver jusqu'à leur clôture prouvée

| Périmètre | Ce qui est acquis | Ce qui est encore non certifié / NEXT |
| --- | --- | --- |
| **GWB-01/GWB-02 — exhaustivité historique** | Index des conversations, couverture des PR et archivage des revues | Commentaires sur commits non vérifiés ; certaines conversations postérieures non intégrées ; réponses de revue non réconciliées individuellement. Mettre un statut `NOT_VERIFIED`, ne jamais effacer la lacune silencieusement. |
| **GWB-03 — triage → verdicts** | 158 remarques historiques classifiées et audits bornés F-03/F-04 | La revue de métadonnées n'est pas une preuve de correction. Vérifier les 56 remarques PR261 et les 8 PR267 sans spotcheck, puis autres lots P1/P2 et les verdicts à l'aide du HEAD/test/CI/runtime exacts. |
| **GWB-04 — comportement et acceptation** | 94 correspondances de chemins sources/tests ; 18 READY avec chevauchements PR potentiels | Aucun des 18 READY certifié par la matrice ; H-01 PR #305 et K-01 issue #236 à poursuivre, sans doublon d'owner ; tests comportementaux et E2E réels requis. |
| **GWB-05/GWB-06 — consolidation/exécution** | Modèle de dépendances et Program Backlog V2 prêts ; DISPATCH-01/02/03 présents dans le code | Reconcilier uniquement les défauts encore prouvés, puis vérifier chaque dépendance et autorité. Les projections `nextWork` ne créent aucune Task ; le claim et la session restent gouvernés. |
| **GWB-07/GWB-08/GWB-09 — terminal** | CI, gouvernance et déploiement existent ; checkpoint et critères terminaux définis | Exécution incrémentale, plusieurs agents runtime, tests négatifs/concurrents, clients et cockpit, attestations et `GLOBAL_MCP_COMPLETE` non prouvés. |

**Éviter la double comptabilisation** : 73+26 sont deux sous-groupes des constats historiques ; 94 est un décompte de blueprints et non de bugs. Les `DONE` de planification sont différents des acceptations fonctionnelles attestées.

## Contrat de checkpoint obligatoire à chaque passage d'agent

**Avant toute opération :** `READ → REOBSERVE → RECONCILE`. Après chaque lot, événement significatif ou arrêt : **publier un checkpoint dans les canaux existants**, sans exposer de secrets.

Chaque checkpoint doit permettre de retrouver, de manière autonome :

- **IDENTITÉ ET MANDAT** : rôle, conversation/agent si une référence fiable est disponible ; identité/scope/session/lease runtime **uniquement s'ils sont attestés**. Une connexion GitHub n'est pas une session gouvernée.
- **ORIGINE / FILIATION** : origine historique applicable (issue, PR, commit, blueprint PCM/GWB) et liens vers le checkpoint parent et les décisions qui ont conduit à cette intervention.
- **BASELINE** : `observedAt` et fuseau, dépôt, branche, HEAD exact, PR/CI/deploy observés ; ne pas confondre tête de PR, HEAD main et HEAD S1.
- **FAIT / NON FAIT** : ce qui est effectivement `DONE_WITH_EVIDENCE`, `OPEN`, `BLOCKED`, `UNKNOWN`, `SUPERSEDED`, avec preuve par source et non simple opinion.
- **MODIFICATIONS ET PREUVES** : fichiers/PR, tests RED/GREEN et négatifs, liens vers runs/artifacts et digest si applicable, smoke/runtime, décisions et limites de validité.
- **RISQUES / COLLISIONS** : dépendances, `collisionDomains`, propriétaires et claims **réellement vérifiés**, branches voisines, HEAD_MOVED, licences et décisions réservées.
- **LIAISON AUX TÂCHES** : blueprint/backlog/intake existant, Task Queue et claim runtime si créés via l'autorité gouvernée ; pas de Task ID inventé.
- **TRANSMISSION** : un `NEXT_ACTION` clair, borné et testable, son critère de réussite, ce qui doit être revérifié à froid, ainsi qu'un `STOP_REASON` fondé sur une autorité quand nécessaire.

**Où écrire :** PR/issue du lot et [issue maîtresse #235](https://github.com/Patricked-code/MCP/issues/235) pour le handoff commun ; `SUIVI.md` pour les preuves et l'état documentaire versionné, `CHANGELOG.md` pour les changements livrés et `DECISIONS_LOG.md` seulement pour de vraies décisions. Ne pas modifier `SUIVI.md`/`CHANGELOG.md` depuis deux PR concurrentes sans réconciliation du HEAD et des domaines de collision.

**Règle de fidélité historique** : jamais d'effacement d'un checkpoint au seul motif qu'il est devenu ancien. Laisser son horodatage, pointer un successeur, et qualifier la photographie `HISTORICAL`. Un agent ne peut déclarer `AUDIT_CONSOLIDATED` que si le manifeste de couverture, les verdicts et la convergence backlog sont complets et prouvés ; il ne peut déclarer `GLOBAL_MCP_COMPLETE` qu'avec les acceptations terminales prévues.

## Lecture et exécution sans dispersion

- **Lecture obligatoire au cold-start** : `README.md` → `AGENTS.md`/`CLAUDE.md` → cette page → `docs/governance/README.md` → `SUIVI.md` en tête → [issue #235](https://github.com/Patricked-code/MCP/issues/235) et PR/issue du scope → `main`/Queue/Session/Locks live quand nécessaire.
- **Ordre de travail** : `RESUME_OWNED_FIRST` → `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`. Un constat historique ne devient pas automatiquement une nouvelle tâche runtime. L'audit restant peut progresser **en parallèle** des travaux indépendants déjà admissibles.
- **Critère de non-perte** : depuis GitHub seul, un nouvel agent doit retrouver l'origine, les preuves, les lacunes, les responsables réellement attestés, les dépendances et la prochaine action, **sans connaissance de nos conversations ChatGPT**.
- **Maintien** : mettre à jour ce fil d'Ariane quand un jalon historique vérifié est ajouté, et toujours pointer les vrais artefacts (au lieu de transformer cette page en nouveau registre de statuts). Les preuves live restent dans leurs autorités.

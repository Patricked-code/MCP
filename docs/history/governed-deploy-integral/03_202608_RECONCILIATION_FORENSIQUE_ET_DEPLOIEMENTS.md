# 5 août–31 août 2026 — reprise forensique et premiers déploiements MCP attestés

Les pièces ci-dessous sont distinctes des extensions universelles d'octobre. Les horodatages sont ceux de création GitHub de chaque issue/PR. Les états de fusion ou runtime indiqués dans les corps de PR sont des déclarations historiques à contrôler au run et au SHA exact avant certification finale.

## 2026-08-05T02:01:07Z — PR #15
Source https://github.com/Patricked-code/MCP/pull/15.
Documente la dérive locale apparue à partir du 29 juillet ; prépare la reprise sans écraser les fichiers locaux ni modifier le runtime. Fondations GitRegistry V2 et plan de migration versionnés, mais aucune migration serveur dans cette PR.

## 2026-08-05T02:40:43Z — PR #16
Source https://github.com/Patricked-code/MCP/pull/16.
Documente l'impossibilité d'un alignement direct tant que le checkout S1 est sale et que le runtime contient des fonctions postérieures au HEAD affiché. Statut historique `BLOCKED_SAFELY_PENDING_RECOVERY_TOOL`. Base `097dac93715c0af83fcfad82cd598bacec956125`, sans exécution de restauration.

## 2026-08-05T02:41:29Z — issue #17
Source https://github.com/Patricked-code/MCP/issues/17.
Définit l'exigence P0 de snapshot avant réalignement S1 : état Git complet, image Docker, archive des modifications, manifeste SHA-256, sauvegarde, restauration possible, consentement exact et impossibilité d'utiliser l'ancien fast-forward sur un arbre sale. **La demande ne constitue pas une restauration déjà exécutée**.

## 2026-08-05T04:53:15Z — PR #18
Source https://github.com/Patricked-code/MCP/pull/18.
Consolide l'audit de reprise ; HEAD `916ae0397703b30184142cc80553d7452336338b`, CI #77 déclarée SUCCESS ; matrice de réintégration des modules, plan de migration GitRegistry V1→V2, décisions de continuité inter-conversations. PR #15/#16 y sont présentées comme supersédées et conservées sans fusion ; aucune branche historique effacée.

## 2026-08-05T05:29:37Z — PR #19
Source https://github.com/Patricked-code/MCP/pull/19.
Snapshot forensique `7c8d9f782ae3195197345257f38fbc400504a848`. Les modules récupérés incluent plusieurs capacités métiers et scripts non bornés. Décision expresse `FORENSIC_SNAPSHOT_ONLY — DO NOT MERGE` : alias cachés de mutation, écritures Git directes, scripts de patch et chemins fixes empêchent d'assimiler ce snapshot à une release admissible.

## 2026-08-05T05:29:49Z — PR #20
Source https://github.com/Patricked-code/MCP/pull/20.
Essai de séparation des catalogues READ/WRITE empilé sur la récupération ; tests 11/11 annoncés. Son support n'étant pas une baseline de production, la PR est explicitement supersédée par une reconstruction propre #22, puis #26.

## 2026-08-05T05:46:58Z — PR #21
Source https://github.com/Patricked-code/MCP/pull/21.
Diagnostic GitHub read-only des erreurs HTTP 401/403/404, timeout, visibilité et scope exact ; HEAD `a648fdf8094fa5285b66af773aab5be16bf75bef`, CI #61 déclarée SUCCESS. Ne prétend pas inspecter les credentials des connecteurs tiers. Supersession propre ultérieure via #25.

## 2026-08-05T06:43:54Z — PR #22
Source https://github.com/Patricked-code/MCP/pull/22.
Séparation des outils READ/WRITE depuis main `097dac93715c0af83fcfad82cd598bacec956125`, HEAD `7fa892d5ca7bf02cd509dd7c5a9341e007470902`. Catalogues disjoints, `ENABLE_WRITE_TOOLS` pour les mutations et compatibilité des outils anciens, sans réintroduire la dérive #19. Reconstruction ultérieure depuis main protégé via #26.

## 2026-08-05T06:56:08Z — PR #23
Source https://github.com/Patricked-code/MCP/pull/23.
Première fondation GitRegistry V2 dry-run : `registryV2.ts`, migration pure, idempotence, outil READ. HEAD historique `9a99c943bf07483836b5c39405abbe3b6f480bcd`. Reprise ultérieure propre dans #27 ; conserver #23 sans lui attribuer la livraison de #27.

## 2026-08-05T06:59:22Z — issue #24
Source https://github.com/Patricked-code/MCP/issues/24.
Demande de protection de main : PR obligatoire, CI `MCP CI / validate`, vérification des threads, refus force-push, stratégie de bypass d'urgence documentée. Statut CLOSED au moment de lecture ; ne pas inférer que tous les paramètres historiques sont identiques à la politique actuelle.

## 2026-08-05T08:10:58Z — PR #25
Source https://github.com/Patricked-code/MCP/pull/25.
Reconstruction du diagnostic GitHub read-only #21 après protection main, base `3f79184eb6a647b39596ff408baa50c4a0c23c01`, HEAD `9ebdb59506975a9b16a137052d2d24d679123bc2`. Intègre tests et hostname HTTPS allowlist. PR #21 explicitement conservée comme historique à ne pas fusionner.

## 2026-08-05T08:21:22Z — PR #26
Source https://github.com/Patricked-code/MCP/pull/26.
Reconstruction propre de #22, base `26af37dee3abd0ba36d61b60e2674d78cf1bedbf`, HEAD `839e811816b7155806d1d89a8daca228eafc3895`. Préserve diagnostic GitHub déjà fusionné et garde mutations derrière `ENABLE_WRITE_TOOLS`.

## 2026-08-05T08:27:05Z — PR #27
Source https://github.com/Patricked-code/MCP/pull/27.
Fondation GitRegistry V2 rebased depuis `main@c4958d97ff67dbf4352b8a1f9c2716fe9cf25d7b`, HEAD `0d2098183afa4d32e3b3cc873be08ca42e1b242d`; aucune activation du registre actif ; PR #23 conservée comme historique.

## 2026-08-05T08:39:17Z — PR #28
Source https://github.com/Patricked-code/MCP/pull/28.
Déclare #18/#25/#26/#27 fusionnées et main protégé, mais S1/Docker **non alignés**. Préserve `SUIVI.md` ancien sous `docs/history/SUIVI_PRE_FOUNDATIONS_20260805.md` au lieu de le perdre. Une documentation « fondations achevées » ne prouve pas un alignement du runtime.

## 2026-08-05T08:41:00Z — issue #29
Source https://github.com/Patricked-code/MCP/issues/29.
Demande d'attestation read-only du bridge, du HEAD S1, de l'image Docker, des endpoints OAuth et des scopes avant tout déploiement ; intitulé courant mentionne un verdict NO-GO pour alignement direct. Le contenu de l'issue comprend une baseline `26452abda77e7f29ed27ac2f4d7f52d3daa88895` qui n'est pas attestée comme runtime active par ce seul document.

## 2026-08-05T09:07:11Z — PR #30
Source https://github.com/Patricked-code/MCP/pull/30.
Durcissement de journalisation OAuth pour ne pas exposer `clientId`, paramètres de requêtes et états sensibles ; HEAD candidat `959144c90520b464a415069dc53ccbbe185ac76b`. Distinguer confidentialité des logs et correction du protocole OAuth : cette PR déclare ne pas modifier le protocole ni déployer sur S1.

## 2026-08-31T21:54:04Z — PR #63
Source https://github.com/Patricked-code/MCP/pull/63.
Réconciliation documentaire d'un **Governed Deploy historique du MCP lui-même**.
- PR fonctionnelle #62, HEAD `2e8fa683296f4f1bf53b9875104598696ba9c6e2`.
- Merge fonctionnel `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`.
- CI PR #645, run `33442649238` : 258 tests, SUCCESS annoncé.
- CI main #646, run `33442929136` : SUCCESS annoncé.
- Governed Deploy #19, run `33442929180` : SUCCESS annoncé.
- Live State 63 : GitHub main, S1 checkout/origin et runtime déclarés alignés sur `878a1646fc7e5928cdb7951a3d2ad1f0639a1d53`, Docker healthy.
**Portée** : ces attestations concernent la livraison du MCP, non le provisioning de nouveaux projets.

## 2026-08-31T23:21:05Z — PR #64
Source https://github.com/Patricked-code/MCP/pull/64.
Stabilise les cartes ROADMAP/TODO/TASKS/SUIVI ; cite déjà les capacités Governed Connection, OAuth, GitHub Identity/Repository Resolution, GitRegistry, serveur, runtime, domaines, inheritance, provisioning et end-to-end tracing. Aucun nouveau runtime exécuté par cette seule PR documentaire.

## 2026-08-31T23:26:27Z — PR #65
Source https://github.com/Patricked-code/MCP/pull/65.
Corrige l'anti-pattern du « SHA courant » figé statiquement dans SUIVI. Décision : les états dynamiques doivent être relus dans GitHub/Live State/Operational Memory ; les SHAs documentaires restent des checkpoints historiques, pas une autorité qui remplace la réconciliation.

## Filiation explicite à maintenir
#15/#16 → #18 ; #19 conservée forensique ; #20 → #22 → #26 ; #21 → #25 ; #23 → #27 ; #25/#26/#27 → #28 ; #62 → déploiement attesté → #63 ; #64 → #65.

## Lacunes à réconcilier
Date exacte de création du dépôt ; PR #31–#62 événement par événement ; chaque revue/merge/CI des PR ci-dessus ; runs de migration S1 et état runtime successif ; première exécution absolue de Governed Deploy plutôt que seule preuve #19 de fin août.

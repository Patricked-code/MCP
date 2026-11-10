# L1 — Contrat de sources, de fraicheur et de resolution

[← Registre des registres](REGISTRY_OF_REGISTRIES.md)

## Une identite, plusieurs autorites

| Question | Autorite a consulter | Interdit |
| --- | --- | --- |
| Quel code est versionne ? | GitHub commit/branche live | Devenir autoritatif via copie de Markdown |
| Quel code est execute ? | Runtime S1 / image OCI / Live State | Deduire du `main` seulement |
| Quel travail runtime appartient a qui ? | Governed Task Queue, Sessions, Locks | Deduire du titre d'une PR |
| Quel est le programme ? | ROADMAP, Program Backlog, decisions applicables | Transformer blueprint `READY` en claim |
| Qu'a-t-on concu ? | Spec approuvee et decisions ancrees | Inferer une approbation depuis le nom du fichier |
| Quelle continuité documentaire ? | Issue, PR, checkpoint, bundle attestes | Convertir un ID de conversation en session runtime |
| Quels droits ? | Connexion GitHub / politique / autorite write effective | Inferrer permission de l'ID racine |

## Taxonomie de preuve

`VERIFIED` : preuve exacte, actuelle et liee. `HISTORICAL_VERIFIED` : preuve historique dont la date est delimitee. `PARTIAL` : tranche non exhaustive. `UNVERIFIED` : absence de preuve suffisante. `MISSING` : lien attendu mais absent. `CONFLICT` : sources incompatibles. `CANDIDATE` : proposition non adoptee. `SUPERSEDED` : reference remplacee avec successeur explicite.

Ne jamais convertir automatiquement `PARTIAL` ou `UNVERIFIED` en `DONE`. Un nom de branche n'est pas un claim. Un outil present dans le catalogue n'est pas necessairement autorise pour le demandeur.

## Conflits et revalidation

1. Conserver les deux enonces avec leurs autorites, revisions et dates.
2. Identifier **la nature** de la contradiction : version, source, mandat, domaine, session, permission, chrono.
3. Reobserver la bonne autorite ; ne pas choisir arbitrairement le document le plus recent.
4. Faire arbitrer la decision de gouvernance lorsqu'elle exige un responsable.
5. Garder le conflit `CONFLICT` tant qu'aucune preuve n'est obtenue.
6. Conserver l'historique de remplacement, sans ecraser une ancienne decision.

## Frontiere documentaire / runtime

Cette arborescence versionnee est une **projection documentaire**. Elle peut orienter l'agent connecte a GitHub sans necessiter de session runtime pour une lecture documentaire. Lorsqu'une action exige reellement le runtime, la couche MCP reste l'autorite de session/tache/lock/receipt. L'echec de connexion au bridge ne selectionne **pas** automatiquement la voie E2.

Voir [le protocole d'entree](../07-entry/GITHUB_AND_MCP_ENTRY.md).

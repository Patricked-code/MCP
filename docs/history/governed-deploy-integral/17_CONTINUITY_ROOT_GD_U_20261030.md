# Registre de filiation du chantier Governed Deploy universel — 30/10/2026

> **Index documentaire et historique dans la PR #356, non autorité runtime.** Toute décision exécutable demeure liée à l'issue [#349](https://github.com/Patricked-code/MCP/issues/349), au code/règles du MCP existant, à la Task Queue, aux sessions, aux locks, aux permissions et aux preuves GitHub/S1/S2. Cet index ne transforme aucune référence historique en nouveau claim, en accès serveur ou en consentement.

**Continuity root ID nouveau et publié : `GD-U-CONT-20261030-ROOT-01`.** Son [premier ancrage dans l'issue #349](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512613394) date du 30/10/2026. Il **n'existait pas** comme racine historique du programme ; il permet de retrouver toutes les ramifications du chantier sans changer les identifiants locaux d'origine.

## 1. Périmètre strict et relations PR

| Périmètre | Référence vivante / liaison retour vers le root | Dépendance / état historique |
|---|---|---|
| Issue #349 — chantier | [Ancrage racine](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512613394) ; [périmètre et regroupement](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512468496) | Autorité documentaire du chantier, pas du programme MCP global |
| PR #350 — socle | [Liaison #350](https://github.com/Patricked-code/MCP/pull/350#issuecomment-6512630214) | Fondations Plesk S1/S2 déjà fusionnées ; preuves historiques à préserver |
| PR #355 — capacité universelle | [Liaison #355](https://github.com/Patricked-code/MCP/pull/355#issuecomment-6512638033) | Tranches GD-U, GitHub/Plesk/S1/S2, E3, runtime ; OPEN non fusionnée à l'observation |
| PR #351 — pilote GRT | [Liaison #351](https://github.com/Patricked-code/MCP/pull/351#issuecomment-6512631839) | Admission GRT DRAFT, owner et tests distincts ; pas prérequis métier de Regulatory |
| PR #352 — préflight Regulatory | [Liaison #352](https://github.com/Patricked-code/MCP/pull/352#issuecomment-6512632687) | S1, `/regulatory`, contrôle read-only sans publication applicative |
| PR #353 — admission Regulatory | [Liaison #353](https://github.com/Patricked-code/MCP/pull/353#issuecomment-6512637024) | Suivre #352 pour sous-chemin réel et autorités Task/Session/Lock, sans changement de cible implicite |
| PR #356 — archive historique | [Liaison #356](https://github.com/Patricked-code/MCP/pull/356#issuecomment-6512638973) | Cette branche documentaire, non certifiée exhaustive |
| PR #354 — GWC PRECODE | [PR #354](https://github.com/Patricked-code/MCP/pull/354) | **HORS scope** ; seule compatibilité de primitives partagées |

**Hors mandat de construction #349** : issue MCP-global #235, Git/GitHub global #177, OAuth #207/#346, GWC #354, BUS et autres programmes. Leurs **interfaces existantes** restent des dépendances de compatibilité ; leurs work items ne sont pas absorbés. `Regulatory` est un **pilote** ; la cible globale demeure un mécanisme universel multi-projet.

## 2. Inventaire des identifiants par TYPE — ne pas mélanger

| Identifiant exact | Nature d'origine | Parent et provenance |
|---|---|---|
| `GD-U-CONT-20261030-ROOT-01` | **Nouveau Continuity ID documentaire racine** | Issue #349, [origine du 30/10](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512613394) |
| `GD-U-02D-CONT-20261029-B3I-ROOT-01` | Continuity ID **fils**, root de B3i seulement | PR #355, [premier ancrage](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506328959) ; [checkpoint source JSON](../../governance/gd-u-02d-b3i-authenticated-mcp-web-pairing-20261029.json) |
| `MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028` | ID de registre/plan historique | PR #355, [JSON existant](../../governance/universal-capabilities-bifurcation-20261028.json) |
| `GD-U-METHOD-20261028-01` | Version de méthode, pas continuité | Propriété `workingMethodology.version` du registre |
| `MCP-GD-U-02D-B3B-B3C-20261028` | `continuityId` local **B3b–B3c**, checkpoint de preuve de release | [Fichier original](../../governance/gd-u-02d-b3b-b3c-release-evidence-20261028.json), #355 |
| `GD-U-02D-B3D-E3-SINGLE-USE-20261028` | `continuationId` local B3d E3 | [Fichier original](../../governance/gd-u-02d-b3d-e3-single-use-20261028.json), #355 |
| `GD-U-02D-B3F-HTTP-MCP-ADMISSION-20261028` | `continuationId` local B3f, admission HTTP/MCP | [Fichier original](../../governance/gd-u-02d-b3f-http-mcp-admission-20261028.json), #355 |
| `GD-U-02D-B3G-TRUSTED-CONSUMPTION-CLOCK-20261028` | ID du checkpoint d'horloge B3g | [Fichier original](../../governance/gd-u-02d-b3g-trusted-consumption-clock-20261028.json), #355 |
| `GD-U-02D-B3H-GITHUB-INDEPENDENT-REVIEW-20261028` | `continuityId` local B3h, revue GitHub | [Fichier original](../../governance/gd-u-02d-b3h-review-integrity-20261028.json), #355 |
| `GD-U-02D-B3i-GITHUB-REVIEW-TIMESTAMP-AMBIGUITY-20261028` | ID de checkpoint de vérification horodatage de revue | [Fichier original](../../governance/gd-u-02d-b3i-review-timestamp-ambiguity-20261028.json), #355 |
| `EXTERNAL_GOVERNED_RECOVERY` | Profil d'exécution gouvernée, **pas continuité** | Politique/runbook existants, aucune nouvelle voie de déploiement |
| `GD-U-355-P1-BOOTSTRAP-RECEIPT-ATTESTATION` | Work/action ID documentaire, **pas Task ID runtime** | #355, [plan d'admission](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512084049) |
| `GD-U-01`, `GD-U-02`, `GD-U-02D-B3a…B3k`, `GD-U-A1/MAX/COMPOSE/CONTINUITY/EXPOSE` | IDs de lots/jalons | [Navigateur GD-U existant](../../governance/universal-program-history/README.md) |

**Précision nouvelle de cet inventaire :** plusieurs fichiers JSON portent des clés `continuityId` ou `continuationId` **locales** (B3b/B3c, B3d, B3f, B3h) qui ne figuraient pas dans le tableau résumé du [correctif de périmètre #6512468496](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512468496). Ils sont ici préservés **comme identifiants de provenance propre**, non renommés ni rétroactivement déclarés racines du programme entier.

## 3. Références opérationnelles Regulatory — ne pas transformer UUID en Continuity ID

| ID existant | Nature et statut historique | Source |
|---|---|---|
| `caa50d12-737c-47f9-9ee0-6cf8b763fdbe` | Governed Session, activité actuelle à réobserver | [PR #353 commentaire](https://github.com/Patricked-code/MCP/pull/353#issuecomment-6356258266) |
| `TASK-20261027-001` | Governed Task Regulatory, historiquement READY/non claimée | [Carte coordination](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6456632312) |
| `749defb6-a5d7-4153-bd66-67fd5f56af03` | Bootstrap Receipt historique, **pas** une permission permanente | [Checkpoint](https://github.com/Patricked-code/MCP/pull/353#issuecomment-6454577846) |
| `d0101c3a-32f5-4251-bd60-d547c2f678d0`, `92c025c6-f618-4ef7-949b-22369b88e815`, `7c677f79-e8cc-4826-8e21-4d30a69da070` | Checkpoints historiques | [Carte issue #349](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6456632312) |
| `81f65a33-85cf-428f-89ea-018016ffacb6`, `92583ce8-52e9-425e-a383-13f2a80134ac`, `a4ce337d-ff60-4aab-8746-4076e6d222e8`, `57e7b777-58d9-45fb-8dc0-7ac314238378` | Checkpoints historiques de conflit cible/admission/ingress | [PR #353](https://github.com/Patricked-code/MCP/pull/353), [coordination #349](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6456632312) |

Le mandat `wealthtechinnovations.com/regulatory` (sous-chemin) et le manifeste produit proposant un sous-domaine ont été en conflit ; [réconciliation d'autorité décrite ici](https://github.com/Patricked-code/MCP/pull/353#issuecomment-6457706873). Aucun état de session ou d'agrément de 2026-10-27/28 n'est présumé vivant aujourd'hui. **`TASK-20260929-001` appartient à OAuth et demeure hors scope.**

## 4. Plans déjà publiés et chaîne causale

- [Ordre de travail de #349, 00→10](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512084049)
- [49 étapes reliées A00→A48 et 165 cibles](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512318604)
- [Transitions dépendantes détaillées](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512322802)
- [Correctif strict de périmètre](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512468496)
- [Index GD-U des lots, branches, décisions et sources](../../governance/universal-program-history/README.md)
- [Archive historique et protocole de vérification](README.md)

**L'ordre documentaire est une représentation de dépendances, pas une ordonnance aveugle** : #355 sécurité bootstrap RED/GREEN→CI/revues→merge admis→Governed Deploy du MCP→non-régression→autorités GitHub/Plesk/S1/S2→GitRegistry (mapping existant ou absent)→pilotes #351 et #352→#353→greenfield→maintenance→certification du **chantier**, pas de tout le MCP. Des lectures indépendantes peuvent avancer sans claim ; aucune écriture avant admission et permission. Les 165 entrées sont **cibles**, pas 165 outils opérables.

## 5. Protocole de reprise et anti-collision

À la nouvelle conversation : rechercher **`GD-U-CONT-20261030-ROOT-01`** → ouvrir [l'ancrage #349](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512613394) → lire les six PR liées et leur HEAD exact, CI, reviews, claims et limites → examiner cet index et les registres d'origine → sélectionner uniquement le scope et owner réellement libre → RED/GREEN/CI+review→merge/deploy gouvernés→attestation S1/S2→checkpoint append-only référant root + ID historique + SHA + résultats + conséquences + successeur. **Aucun prétendu transfert de Task, claim, session ou permission depuis un index documentaire.**

**État de lecture du 30/10/2026** : #350 MERGED ; #351/#352/#353/#356 DRAFT non fusionnées ; #355 OPEN non fusionnée à `7e40f47b8ed2ffab9ea6d7993f8c721a98a0ca9f`, CI #40980779055 SUCCESS mais P1 bootstrap encore signalé ; aucun nouveau déploiement #355 n'est attesté. Le S1 relevé précédemment au SHA `48a529889517aa1c11974802d23acc3f35e0f187` doit être réobservé avant écriture. Documentation historique non certifiée exhaustive.

**Anti-régression** : ne pas éditer les anciens IDs ; ne pas créer de PR concurrente ; conserver la PR #356 documentaire et les scopes PR #351/#352/#353/#355 ; éviter les conflits sur les fichiers partagés, y compris `.github/workflows/mcp-ci.yml`. Ne pas utiliser Codex/Copilot. Le modèle global MCP reste distinct et encore en cours.

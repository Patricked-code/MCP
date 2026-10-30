# Navigation de l'archive historique — extension 2026-10-29

Ce document ajoute une **table de navigation complémentaire** au README original de la PR #356 sans en modifier le corps. L'arbre initial est préservé ; l'évolution de la recherche a trouvé des sources plus anciennes que la période août initialement étudiée.

## Arbre documentaire présent sur la branche

```text
docs/history/governed-deploy-integral/
├── README.md                              index d'origine
├── 00_ARBRE_HIERARCHIQUE.md                schéma de filiation initial
├── 01_PROVENANCE_ET_REGLES.md              conventions source/attestation
├── 02_202608_FONDATIONS.md                 première collecte août
├── 03_202609_GOUVERNANCE_GITHUB.md         première collecte septembre
├── 04_202610_TB_W3_F.md                    octobre / F-01..F-04
├── 05_202610_ISSUE349_PLESK.md             #349 et #350
├── 06_PILOTES_GRT_REGULATORY.md            pilotes
├── 07_GD_U_B3I.md                          premier état GD-U
├── 08_REGISTRE_PREUVES.md                  premiers contrôles
├── 09_PROCEDURE_EXHAUSTIVITE.md            protocole
├── 02_202607_ANTECEDENTS_ORIGINES.md       NOUVEAU : juillet PR #1..#14
├── 03_202608_RECONCILIATION_FORENSIQUE_ET_DEPLOIEMENTS.md
│                                            NOUVEAU : août détaillé
├── 04_202609_FIL_INTERDEPENDANCES_ET_DEPLOIEMENTS.md
│                                            NOUVEAU : septembre détaillé
├── 10_REGISTRE_EXHAUSTIF_COMMENTAIRES_349.md
│                                            NOUVEAU : 59 commentaires accessibles par liens intégraux
├── 11_REF_TECHNIQUES_ISSUE349_TRANCHE_1.md  SHA, CI, PR, liens #349
├── 11_REF_TECHNIQUES_ISSUE349_TRANCHE_2.md  SHA, CI, PR, liens #349
├── 11_REF_TECHNIQUES_ISSUE349_TRANCHE_3.md  SHA, CI, PR, liens #349
├── 12_20261028_JALONS_GD_U_ET_MANDATS.md   jalons individuels du 28/10
├── 13_20261029_EXECUTION_B3I_CONTINUITE.md jalons individuels du 29/10
├── 14_COUVERTURE_ET_LACUNES_CERTIFICATION.md
│                                            état de couverture et non-exhaustivité
└── 15_NAVIGATION_COMPLEMENTAIRE.md         cette navigation
```

## Accès à la lecture

1. [Origine juillet 2026](02_202607_ANTECEDENTS_ORIGINES.md) : PR #1 à #14 et issues #2/#3.
2. [Août — forensic et GitRegistry](03_202608_RECONCILIATION_FORENSIQUE_ET_DEPLOIEMENTS.md) : #15..#30, #62/#63, #64/#65.
3. [Septembre — identité, mapping et SSH](04_202609_FIL_INTERDEPENDANCES_ET_DEPLOIEMENTS.md) : livraisons, candidates, conflits et blockers.
4. [Provisioning F-01/F-03/F-04](04_202610_TB_W3_F.md) : lot précédant #349.
5. [Issue #349 et PR #350](05_202610_ISSUE349_PLESK.md).
6. [GRT et Regulatory](06_PILOTES_GRT_REGULATORY.md).
7. [28 octobre — GD-U](12_20261028_JALONS_GD_U_ET_MANDATS.md).
8. [29 octobre — B3i et CI](13_20261029_EXECUTION_B3I_CONTINUITE.md).
9. [59 commentaires #349 en texte intégral par leurs URL](10_REGISTRE_EXHAUSTIF_COMMENTAIRES_349.md).
10. [Références techniques des pièces #349 — 1](11_REF_TECHNIQUES_ISSUE349_TRANCHE_1.md), [2](11_REF_TECHNIQUES_ISSUE349_TRANCHE_2.md), [3](11_REF_TECHNIQUES_ISSUE349_TRANCHE_3.md).
11. [Couverture des sources, limites et actions non réalisées](14_COUVERTURE_ET_LACUNES_CERTIFICATION.md).

## Filiation chronologique et architecturale

```text
JUILLET 2026 — premiers contrats de gouvernance
PR #1 / #4 / #5 / #6 / #10 / #14
       |
       v
AOÛT 2026 — reconstruction non destructive + GitRegistry + READ/WRITE
PR #15 → #18 | PR #19 (forensic) | #20 → #22 → #26 | #23 → #27
       |
       +----> Governed Deploy historique : PR #62 → CI → fusion → S1 → #63
       |
       v
SEPTEMBRE — identity → repo → project → target + consentement + transport
#67 → #68 → #69 ; #73 → #75 → #76 ; #78 → #80 ; #83 → #84
#88/#89/#90 (candidates) ; #92/#93 ; SSH #188/#191/#193
       |
       v
OCTOBRE — PB-F / TB-W3-F
#257 → #258 ; #259 → #260 → #261 → #263 ; #267 → #271
       |
       v
ISSUE #349 — extension universelle gouvernée S1/S2
       |
       +--> PR #350 : planner/executor Plesk + deploy MCP
       +--> PR #351 : pilote GRT
       +--> PR #352 / #353 : préflight/admission Regulatory
       +--> PR #355 : GD-U, B3i, E3/OAuth, sécurité
                   |
                   v
               HOLD_WRITE : aucune livraison Regulatory attestée
```

Cette présentation est une **cartographie de filiation**, pas une preuve que chaque PR candidate fut fusionnée ou qu'un droit Plesk est ouvert. La PR #356 reste un chantier **documentaire** indépendant, sans remplacer les contrats des autres branches.

## Continuité et anti-collision

Programme global : https://github.com/Patricked-code/MCP/issues/235

Extension universelle : https://github.com/Patricked-code/MCP/issues/349

Branche active de code universel (ne pas modifier depuis cette archive) : https://github.com/Patricked-code/MCP/pull/355

Continuité fille B3i : `GD-U-02D-CONT-20261029-B3I-ROOT-01` ; **pas de continuity ID global unique démontré**.

Pilote : https://github.com/chainsolutions-wealthtech/Regulatory ; état de produit distinct.

## Limite de provenance

Les commentaires originaux restent à leur URL intégrale ; leur duplication brute en fichiers a été bloquée par la sécurité de l'outil. Les index dérivés ont été créés, sans suppression des sources. Les runs exacts n'ont pas tous été interrogés individuellement. Les tableaux et arbres ne remplacent pas les pièces primaires.

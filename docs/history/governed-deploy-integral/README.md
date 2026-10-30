# Dossier historique intégral — Governed Deploy et provisioning universel

Statut: dossier documentaire additif, en cours de vérification. Ce dossier ne remplace ni CLAUDE.md, ni AGENTS.md, ni SUIVI.md, ni les autorités runtime. Il ne constitue ni claim, ni lock, ni consentement, ni autorisation de déploiement.

## Autorités et rattachements
- Programme MCP global : https://github.com/Patricked-code/MCP/issues/235
- Programme de capacités : https://github.com/Patricked-code/MCP/issues/177
- Extension universelle : https://github.com/Patricked-code/MCP/issues/349
- Carte directrice documentaire : https://github.com/Patricked-code/MCP/pull/348 (ouverte lors de l'observation)
- Tranche opérationnelle fille B3i : `GD-U-02D-CONT-20261029-B3I-ROOT-01`, https://github.com/Patricked-code/MCP/pull/355

**Identifiant racine historique : NON ATTESTÉ.** Aucun nouvel ID n'est présenté comme préexistant ou comme autorité runtime. L'issue #349 reste l'ancrage documentaire du programme d'extension ; les travaux précurseurs sont reliés par leurs propres références.

## Parcours de lecture sans réduction
1. [Arbre hiérarchique](00_ARBRE_HIERARCHIQUE.md)
2. [Provenance et règles de preuve](01_PROVENANCE_ET_REGLES.md)
3. [Reprise historique août](02_202608_FONDATIONS.md)
4. [Gouvernance et GitHub septembre](03_202609_GOUVERNANCE_GITHUB.md)
5. [Provisioning initial octobre](04_202610_TB_W3_F.md)
6. [Extension universelle et Plesk](05_202610_ISSUE349_PLESK.md)
7. [Pilotes GRT et Regulatory](06_PILOTES_GRT_REGULATORY.md)
8. [GD-U et B3i](07_GD_U_B3I.md)
9. [Registre de preuves et lacunes](08_REGISTRE_PREUVES.md)
10. [Protocole d'exhaustivité](09_PROCEDURE_EXHAUSTIVITE.md)

Les documents contiennent des événements individuels et liens primaires. **Ce n'est pas encore une archive exhaustive de tous les commits, CI, commentaires et checkpoints** : les lacunes sont conservées explicitement plutôt que comblées par supposition.


## Complément append-only : antécédents remontant à juillet 2026

La première collecte commençait en août ; une seconde collecte GitHub a retrouvé les premiers mandats dès le 4 juillet 2026. Le contenu initial est préservé et les nouvelles pièces sont rangées sur **la même branche et la même PR #356**.

- [Navigation chronologique complète de l'archive](15_NAVIGATION_COMPLEMENTAIRE.md)
- [Origines juillet (PR #1–#14)](02_202607_ANTECEDENTS_ORIGINES.md)
- [Août — récupération forensique et Governed Deploy](03_202608_RECONCILIATION_FORENSIQUE_ET_DEPLOIEMENTS.md)
- [Septembre — GitRegistry, identité, OAuth, transport et pilotes](04_202609_FIL_INTERDEPENDANCES_ET_DEPLOIEMENTS.md)
- [Registre des commentaires de #349, 59 pièces consultables en texte intégral à leur URL GitHub](10_REGISTRE_EXHAUSTIF_COMMENTAIRES_349.md)
- [28 octobre — jalons universels](12_20261028_JALONS_GD_U_ET_MANDATS.md)
- [29 octobre — B3i et correctifs CI/sécurité](13_20261029_EXECUTION_B3I_CONTINUITE.md)
- [Couverture, preuves à réconcilier et limites](14_COUVERTURE_ET_LACUNES_CERTIFICATION.md)

Le registre de suivi Markdown `docs/governance/markdown-inventory.json` est maintenu additivement pour les nouveaux fichiers afin de respecter la CI documentaire sans désactiver ses gardes. Cette archive n'autorise aucune action sur S1/S2 ni aucune fusion de PR de production.


## Preuve d'origine historique retrouvée : Governed Deploy du MCP lui-même

[Chronologie détaillée du premier autodeploy gouverné, Live State, sessions et Task Queue (août 2026)](16_202608_ORIGINE_AUTODEPLOY_ET_MEMORY.md).

La PR #39 (9 août) contient la première construction explicite de l'autodeploy MCP exact-SHA retrouvée dans ce corpus. La PR #42 documente un bootstrap manuel réussi ; la PR #43 (13 août) atteste le **premier push automatique** avec la CI `31658327373`, le workflow de déploiement `31658327435` et le merge SHA `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`. Cette filiation est antérieure aux lots de provisioning `TB-W3-F` d'octobre et ne prouve pas le déploiement universel d'applications.

## Renvoi vers l'index opérationnel GD-U — PR #355

Cette archive est le **dossier forensique approfondi** des origines, décisions, chronologies, commits, preuves historiques et lacunes documentées du Governed Deploy. Pour la **reprise opérationnelle du Programme d'extension universelle** (GD-U-01 / GD-U-02 / B3a–B3j), utiliser en complément [l'index hiérarchique GD-U de la PR #355](https://github.com/Patricked-code/MCP/blob/mcp/universal-github-plesk-server-capabilities-20261028/docs/governance/universal-program-history/README.md) et sa [PR de développement #355](https://github.com/Patricked-code/MCP/pull/355).

Le [registre de bifurcation déjà existant `MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028`](https://github.com/Patricked-code/MCP/blob/mcp/universal-github-plesk-server-capabilities-20261028/docs/governance/universal-capabilities-bifurcation-20261028.json) est une **projection documentaire non autoritative** : il ne remplace pas [l'issue canonique #349](https://github.com/Patricked-code/MCP/issues/349). L'identifiant `GD-U-02D-CONT-20261029-B3I-ROOT-01` est rattaché à **GD-U-02D/B3i**, pas au programme global.

**Anti-doublon et anti-collision :** poursuivre les enquêtes historiques sur la PR #356, poursuivre le développement et la reprise rapide sur la PR #355 ; conserver les sources originales et ne pas recopier ni modifier le code de la PR #355 depuis cette branche. Les deux branches gardent leurs inventaires Markdown propres jusqu'à une intégration gouvernée. Lors d'une combinaison ultérieure, réunir les entrées des deux inventaires, vérifier l'absence de collision de catégories et repasser la CI sur le SHA fusionné ; ne jamais remplacer l'un par l'autre.

## Point d'entrée racine du seul chantier #349 — 30 octobre 2026

- **[Registre de continuité GD-U-CONT-20261030-ROOT-01](17_CONTINUITY_ROOT_GD_U_20261030.md)** : relie les identifiants des sous-tranches GD-U, les PR #350, #351, #352, #353, #355, #356, les mémoires et les preuves Regulatory, avec leurs vrais types et des liens vers les branches propriétaires.
- **[Premier ancrage GitHub canonique](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512613394)** et **[index des liaisons croisées](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6512669875)** ; l'archive documentaire reste une *projection*, pas une deuxième autorité de programme.
- Le root est **nouveau au 30/10/2026** ; la continuité `GD-U-02D-CONT-20261029-B3I-ROOT-01` demeure **fille de B3i** ; la finalisation du MCP global et GWC #354 restent hors périmètre GD-U.

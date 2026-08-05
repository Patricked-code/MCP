# TODO.md

## Role
Liste large des idees, anomalies, points a verifier et besoins non encore ordonnes.

## A traiter
- Verifier tous les fichiers Markdown racine attendus.
- Consolider les doublons utiles entre docs/, memory/ et la racine.
- Verifier la coherence des fichiers .mcp.
- Ajouter les fichiers enfants par projet.
- Creer un rapport d'audit documentaire.
- Ne pas toucher aux secrets ni au code applicatif pendant cette passe.

## Passage vers TASKS.md
Lorsqu'un point devient executable, il doit etre transforme en entree dans TASKS.md.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## Alignement MCP — état au 2026-08-05

- [x] Snapshot forensique créé et conservé dans la PR #19 `DO NOT MERGE`.
- [x] Baseline `097dac9` testée.
- [x] Runtime récupéré dans GitHub.
- [x] Bundle Git vérifié.
- [x] Documentation canonique fusionnée par la PR #18.
- [x] Diagnostic GitHub read-only fusionné par la PR #25.
- [x] Séparation lecture / écriture fusionnée par la PR #26.
- [x] Fondation GitRegistry v2 dry-run fusionnée par la PR #27.
- [x] `main` protégé avec PR et CI obligatoires.
- [x] Issue de protection #24 clôturée.
- [ ] Reconnecter `wealthtech_ssh_bridge`.
- [ ] Attester en lecture seule Git S1, Docker, outils et endpoints.
- [ ] Produire un verdict Go / Go avec corrections / No-Go.
- [ ] Préparer une copie propre isolée avant tout build.
- [ ] Aligner S1 uniquement après verdict Go et procédure de rollback.
- [ ] Reconstruire l’image depuis un commit fusionné et attesté.
- [ ] Vérifier GitHub = S1 HEAD = image Docker.
- [ ] Migrer le registre actif vers v2 dans une PR et une opération séparées.

## Interdictions tant que S1 n’est pas attesté

- aucun pull, reset, clean ou checkout dans le working tree actif ;
- aucun build ni restart depuis le dossier sale ;
- aucun remplacement du registre actif ;
- aucun changement de remote ;
- aucun déploiement, nettoyage ou suppression.

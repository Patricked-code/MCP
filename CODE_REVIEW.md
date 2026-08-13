# CODE_REVIEW.md

## Rôle
Journal de revue technique et dette du MCP.

## Points initiaux
- Deux fichiers applicatifs étaient déjà modifiés avant la passe documentaire : data/mcp-git-registry.json et src/github/registry.ts.
- Ne pas les mélanger avec le commit documentaire sans revue spécifique.
- Vérifier CODEX.md après écriture pour corriger toute anomalie d’encodage ou typo.

## À documenter
Risques, dette, fichiers critiques, corrections faites, corrections restantes et tests.


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

## 2026-08-13 — PR #42 — Polling readiness MCP et artefact documentaire

- Thread source : PR #41, `PRRT_kwDOTJ-y6M6YoQ5j`, P2 ouvert et non obsolète au début du traitement.
- Cause : `sleep 5` suivi d’un unique `curl` ; `--max-time` borne une tentative mais ne retente pas un refus de connexion.
- Correction : jusqu’à 20 tentatives, requête bornée à 5 secondes, pause de 2 secondes, échec final non masqué.
- Test : RED `31657464793`, GREEN `31657546033`.
- Dette documentaire associée : le générateur d’artefact codait sept anciens snapshots ; il copie désormais les sources actives et la parité est testée.
- Risque restant : aucun merge avant CI finale et head exact ; aucune clôture du thread avant présence de la correction sur `main`.

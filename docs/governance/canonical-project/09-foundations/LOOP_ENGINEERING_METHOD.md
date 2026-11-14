# L9 — Boucle Loop Engineering et preuve de sortie par phase

[← Corpus](FOUNDING_DOCUMENTS.md) · [Ordre d'origine](ORIGINAL_READING_ORDER.md) · [Orchestration actuelle](../10-orchestration/PROJECT_SELF_WORKFLOW.md)

| Phase historique | Entrée vérifiable | Action | Sortie / registre |
| --- | --- | --- | --- |
| 01 Initialisation | Mémoire et dernier `POINT DE REPRISE COURANT` | Charger références | Contexte/baseline de la boucle |
| 02 Compréhension | Mandat, projet, module et serveur | Distinguer objectifs, contraintes et protections | Cadrage vérifié |
| 03 Inventaire | Cible définie | Observer fichiers, services, données, sauvegardes et dépendances | Inventaire daté avec provenance |
| 04 Risques | Inventaire et contraintes | Examiner impacts, secrets, régressions | Matrice risques / refus éventuel |
| 05 Plan | Risques + conception applicable | Définir micro-actions, tests, rollback | Plan séquencé admissible |
| 06 Exécution contrôlée | Admission/ownership/permissions | Action minimale, pas d'opportunisme | Diff/artefact et événement sourcés |
| 07 Tests | Changement réalisé | Vérifier invariants, santé, sécurité | Reçus de validation |
| 08 Documentation | Résultats et preuves | Actualiser les bons documents | `SUIVI` / `CHANGELOG` / `TASKS` selon leur périmètre |
| 09 Validation | Preuves disponibles | Qualifier terminé/ouvert/bloqué | Verdict et risques restants |
| 10 Reprise | État validé, checkpoint | Inscrire prochain geste | `POINT DE REPRISE COURANT` / `NEXT_ACTION` |

Le projet MCP moderne ajoute des gates techniques **sans remplacer** les étapes fondatrices : identité/permissions, audit de PR concurrentes, code sur branche, CI exact-SHA, revue, fusion, Governed Deploy MCP, Live State et attestation. Le DOCX fondateur n'avait pas besoin de prédire tous ces mécanismes : ils raffinent la boucle.

## Règle de continuité non destructrice

Chaque boucle a un identifiant documentaire ou une référence de travail **effectivement retrouvée** et plusieurs événements. Un checkpoint comprend : phase, inputs, sources, observedAt, changements, tests, décisions, risques, prochaine action, propriétaire et liens. Les snapshots anciens sont historiques, jamais une preuve d'état actuel.

## Invariant transversal

**Aucune étape n'est déclarée validée sans sortie et preuve exigées.** Une sortie `PARTIAL` permet de planifier la recherche manquante, pas de promouvoir arbitrairement le chantier en `READY_FOR_IMPLEMENTATION`.

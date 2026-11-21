# WT-MCP-REGISTRY-RESOLUTION-20261121-01 — Décisions, dépendances et risques (phase d'audit)

## Décisions portées par le mandat du 2026-11-21

- D01 — Nom de mission : « Mission de résolution du problème des registres » ; continuité stable `WT-MCP-REGISTRY-RESOLUTION-20261121-01`.
- D02 — Dépôt de travail initial exclusivement `Patricked-code/MCP`. Audit avant code, aucune mutation des autres dépôts.
- D03 — MCP fédère les autorités existantes ; pas de deuxième moteur Task Queue, GitRegistry, mémoire opérationnelle ou gestion de sessions.
- D04 — CUG ingère des observations, n'autorise ni projet ni tâche tout seul ; seule une observation vérifiée rattachée à un périmètre autorisé peut conduire à une inscription gouvernée.
- D05 — TODO.md MCP reste un index ; les suivis/TODO/TASKS de chaque projet et chantier conservent leur responsabilité.
- D06 — Identifiants historiques immuables ; toute projection porte la provenance et la fraîcheur.
- D07 — Frontend global/dépôt/chantier, fiches projets, historique terminal et filtrage de permissions.
- D08 — PR additives + tests de non-régression + exact-HEAD CI/revue/Governed Deploy ; pas de merge/deploy dans l'audit.

## Points non décidés / à investiguer

- U01 — `WT-PROJECT-MCP-001` est un **UID candidat** de PR #389 ; pas d'activation autonome sur runtime.
- U02 — Contrôle MCP `GITHUB_CONTROL_ORG_NOT_ALLOWED` sur `Patricked-code/MCP` tandis que GitHub direct permet l'accès ; identifier la policy exacte avant modification.
- U03 — Schéma V1→V2 : 5 mappings en attente de preuves, migration pendante, contraintes credential/TLS ; ne pas forcer l'activation.
- U04 — Aucun projet cible configuré pour S1 dans `.mcp/server-map.json` ; ne pas remplacer la liste vide par un catalogue de dépôts non vérifié.
- U05 — `DOCUMENTATION_DRIFT` avec main/S1/runtime à `5bc5e2b4...` et documentation `fb0cb474...`; synchroniser par démarche gouvernée distincte.
- U06 — Contrat des événements admissibles : whitelist, corrélation Event→Intention→TASK, handling NONE/AMBIGUOUS, backpressure et annulation à concevoir/tester.

## Collisions et non-régression

- PR #389 — Projet MCP canonique candidat. Ne pas usurper son registre/UID.
- PR #401–#407 / cockpit #423 / catalogue #425 — CUG/GRT historiques ; étendre en couches additives, pas de réécriture du récepteur.
- GWC/Program Backlog V2 — pas de création de Task par simple checklist ; publication seulement après admission.
- Global Work / #372–#374 — ne pas dupliquer les matrices/autorités.

**Risque dominant :** transformer un signal d'événement en décision gouvernée sans autorisation, ou afficher une vue fédérée incomplète comme exhaustive. Dans tous les cas, afficher couverture, provenance et limitations.

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

## Décisions additionnelles — usine logicielle gouvernée 24/7 (21 novembre 2026)

- **D09 — Une seule mission.** Les travaux RG-036…RG-056 étendent la résolution des registres ; même Continuity ID, mêmes propriétaires, mêmes autorités et checkpoints, sans nouveau projet MCP « usine » concurrent.
- **D10 — Runtime autonome distinct de ChatGPT.** ChatGPT est un client, pas la boucle de service ; le worker futur doit être un processus durable sur hôte contrôlé avec observation réelle de santé, reprise, logs, coûts et quotas. Les automatisations horaires ne constituent pas une preuve de 24/7.
- **D11 — C26/C27 et UAC/P2 sont des composants obligatoires, non des mécanismes à réécrire.** L'hôte agent doit se lier à une session de transport authentifiée, à une tâche réellement admise, au claim et aux locks. L'absence de port/hôte/permission = BLOCKED et non une session inventée.
- **D12 — Séparer observation/architecture/planification/codage/revue/vérification.** L'analyse d'impact et la carte à SHA exact précèdent chaque correctif ; le codeur n'est autorisé à traiter que les tâches déjà contextualisées et admises.
- **D13 — Insights sont des signaux.** Dependency graph, SBOM, Dependabot, CodeQL, Insights réseau, forks, PR, CI, rulesets et trafic doivent être lus avec permission réelle par dépôt, provenance, horodatage, status de couverture. Ils ne deviennent ni GitRegistry ni Task Queue ni autorité de projet.
- **D14 — Activation progressive des outils GitHub.** Ne pas supposer Dependabot/CodeQL/secret scanning ou l'export SBOM déjà activés ; mesurer d'abord les réglages GitHub et les limites de permissions / licence. Aucune désactivation de branch protection ou auto-approval fictive.
- **D15 — Pas de Kubernetes présumé.** Le déploiement MCP attesté reste GitHub Actions OIDC vers S1 Docker Compose ; une migration Kubernetes est un autre chantier avec gates adaptés.
- **D16 — Autonomie gouvernée signifie enchaînement sans sollicitation inutile, PAS transgression d'un blocage de sécurité.** Revues obligatoires, conflits et erreurs 403 restent des barrières à réparer via l'autorité adaptée. Chaque action en production doit être attribuable à un agent, un scope, un SHA et une preuve.
- **D17 — S1 isolé d'abord.** Un pilote sur un service hôte séparé, secrets non exposés, ressources bornées et tests de reprise précède toute généralisation CUG multi-dépôts. UAES et GRT restent leurs projets propriétaires.

**Décisions à revalider par preuve live :** droits GitHub Issues:write pour le journal E2 ; état GitHub Insights repository par repository ; identité/installation CUG réelle et scopes ; disponibilité et sécurité de l'hôte agent ; resource capacity et backup de S1 ; exigences d'approbation et auto-merge du ruleset.

## Décisions additionnelles liées au document utilisateur intégral (21 novembre 2026)

- D18 — Adopter le sous-chantier `WT-MCP-AUTONOMY-24X7-20261121-01` **comme enfant de la mission actuelle**, jamais une mission concurrente ni une autre queue. L'identifiant était **proposé non créé** dans la source.
- D19 — Méthode de l'usine : 10 phases Loop historiques + 15 opérations du parcours cible, rapprochées des **RG déjà planifiées**, sans nouveau backlog.
- D20 — La connaissance de code (graphe architecture) et l'ordonnancement de travail (graphe programme) sont deux graphes distincts ; la jointure exige source, SHA, statut de vérification et identité.
- D21 — Toute nouvelle intention doit chercher d'abord un complément à un lot ancien. Une nouvelle « tâche » issue de texte non autorisé reste candidate, non mutation P2.
- D22 — Les onze familles documentaires locales sont indexées, sans répéter intégralement les états parent ou la mémoire vivante MCP. L'historique append-only et la preuve original-DOCX-SHA restent liés.
- D23 — Pas de worker dans le conteneur MCP, pas de Docker socket production accessible au codeur ; UAES isolé après audit U02, C26 ports, C27 réel.
- D24 — Disponibilité permanente ≠ code permanent ; IDLE valide ; automate horaire ChatGPT ≠ host 24/7 ; supervision externe et reprise après crash indispensables.
- D25 — Rapport systématique de dette : branch-only / merged / deploy-run / runtime-readback / G1 / C27, statuts indépendants.

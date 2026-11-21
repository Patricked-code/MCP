# Mandat et périmètre — usine autonome 24/7
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**.
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

## Rattachement, pas de nouvelle autorité
Ce sous-chantier est **une unité de pilotage documentaire** des opérations RG-043…RG-056 déjà planifiées par la mission mère (RG-036…RG-042 en amont). Il ne crée ni nouvelle mission, ni Program Backlog, ni queue, ni hôte agent opérationnel. Le parent conserve l'ordre global ; le sous-chantier possède son SUIVI/TODO/TASKS/DECISIONS/ARCHITECTURE/CONTINUITY/EVIDENCE_INDEX sans recopier les autorités.

## But vérifiable
Installer et certifier un service d'orchestration durable, disponible indépendamment de ChatGPT, qui observe les événements autorisés, évalue les tâches selon l'ordre du programme, requiert P2/owner/session/locks, lance un hôte de code isolé via C26, obtient le résultat de CI/revue/merge/deploy, atteste SHA/runtime/doc, certifie C27 et réévalue la prochaine tâche. Le service peut être IDLE sans anomalie ; aucune génération d'IA en boucle pour « faire quelque chose ».

## Hors mandat
Modifier les dépôts UAES/GRT/Loop sans leur admission, installer un codeur dans le conteneur MCP, donner le Docker socket ou root S1 au codeur, bypass rulesets GitHub, auto-approval fictive, deuxième GitRegistry, Task Queue, session authority, IA sans budget, exécuter les textes d'issues/webhooks non fiables.

## Interfaces de responsabilité
MCP = autorités et Live State. CUG = identité/observations, jamais droit d'exécution. GRT/GRGS = admission/documentation des projets. Loop = ingénierie, classification et planification. UAES = exécuteur isolé et supervision après U02. GitHub = PR/CI/rulesets ; Governed Deploy OIDC = sortie vers S1. C27 = certificateur indépendant. Toutes les autorisations sont vérifiées en temps réel.

## Clôture
Un pilote de bout en bout réellement observé + reprise après panne + zéro double-claim + tests de permissions négatives + C27 + endurance démontrée, puis activation progressive dépôt par dépôt. Tant que l'un des gates est absent, statu `BLOCKED` ou `INTEGRATION_REQUIRED`, jamais `24X7_ACTIVE`.

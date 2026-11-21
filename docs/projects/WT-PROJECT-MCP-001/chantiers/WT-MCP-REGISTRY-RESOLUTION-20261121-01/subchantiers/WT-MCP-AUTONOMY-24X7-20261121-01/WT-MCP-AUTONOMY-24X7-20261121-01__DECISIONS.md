# Décisions / règles locales du sous-chantier
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**. 
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

- A24-01 — Périmètre **enfant**, pas projet concurrent ; lien obligatoire à la mission mère et ses RG-043…056.
- A24-02 — Opérateur 24/7 et agent d'IA appelable sont **distincts** ; l'horaire ChatGPT est un filet de reprise, pas la production.
- A24-03 — Garder P2/UAC/Session/Lock/MCP comme autorités ; le worker ne les recalcule ni remplace.
- A24-04 — UAES hôte isolé d'abord, déploiement selon sa propre admission ; MCP current runtime ne doit pas héberger arbitrairement le codeur.
- A24-05 — Classification et planification avant code ; deux graphes reliés ; codeur reçoit dossier contextualisé/contrats/tests.
- A24-06 — Tests RED/GREEN, exact-HEAD CI, revue indépendante, merge conditionnel, OIDC Deploy, Live State+G1 puis C27 requis.
- A24-07 — Aucune réattribution sur simple heartbeat expiré ; conflit CLAIM = BLOCKED.
- A24-08 — Aucune permission nouvelle à partir du texte d'un webhook/issue ; les modalités d'auto-admission et d'auto-merge devront être couvertes par une politique explicite et les rulesets en vigueur.
- A24-09 — L'« exécution non-stop » désigne la **disponibilité continue** et l'enchaînement d'actions réellement admissibles, pas du code inventé sans tâche ni une garantie absolue contre panne d'infrastructure.
- A24-10 — Un déploiement Docker sur S1 ne vaut pas certification d'un daemon UAES ni d'une capacité Kubernetes.

**Points à décider sur preuves** : placement S1 vs hôte séparé, capacités réelles, budget IA, contrat de tokens d'installation CUG, identités machine, règles de revue/merge du dépôt UAES, fréquence d'observation, seuils de récupération et stratégie d'endurance. Pas de valeur supposée.

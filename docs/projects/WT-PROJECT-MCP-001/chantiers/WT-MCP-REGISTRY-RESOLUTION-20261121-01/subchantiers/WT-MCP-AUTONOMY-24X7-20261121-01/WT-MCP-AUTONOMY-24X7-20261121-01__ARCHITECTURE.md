# Architecture d'intégration — MCP ↔ Loop ↔ UAES ↔ GitHub
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**.
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

## 1. Trois plans de responsabilités, sans confusion
- **PLAN DE CONTRÔLE MCP** : Project Binding/GitRegistry, Governed Task Queue, Governed Sessions, Lock Service, UAC, CUG receipts, Live State. Les projections ne possèdent aucun état de référence.
- **PLAN DE CONNAISSANCE Loop** : intake des intentions, détection DUPLICATE/COMPLEMENT/DECISION/FINDING/TASK/CONTRADICTION/MEMORY/OUT_OF_SCOPE, deux graphes (architecture et programme), current-state→delta→place→risk→tests→rollback, roadmap et dossiers de codeur.
- **PLAN D'EXÉCUTION UAES** : service superviseur en infrastructure isolée, agent host durable à clé d'idempotence, workspaces jetables, multiplexage de rôles sans partager identité/permissions, budgets CPU/RAM/disk et IA ; sortie vers GitHub et MCP via permissions contrôlées.

## 2. Parcours strict
`authenticated intake → original source/provenance → project identity/authority → semantic classification → architecture graph + program graph → impact & insertion into existing chantier → plan/acceptance tests → Governed Task admission → own P2/transport session/locks → C26 durable host → ephemeral workspace/code/tests → protected PR & independent review → exact-head CI → allowed merge → OIDC Governed Deploy → Live State/G1 → C27/Checkpoint → next program candidate`.

## 3. C26 ports vérifiés dans le dépôt actuel
`readOwnP2State`, `lookupExistingAgentRun`, `startOrResumeExistingAgent`, `readBoundAgentSession`, `admitExistingP2`, `atomicIdempotentHost=true`. Les mêmes idempotency keys doivent être durables entre les deux opérations host. Une session vieillie n'accorde aucun transfert d'ownership. L'agent doit être authentifié sur son **propre transport** et disposer d'un bootstrap receipt cohérent, pas récupérer une autre session en choisissant son ID.

## 4. Architecture de livraison et isolation
S1 MCP reste OIDC/Docker Compose ; le daemon UAES doit être **isolé** du conteneur MCP et des autres apps S1, avec accès GitHub minimal, partitions de travail éphémères, pas de socket Docker prod, pas de tokens dans les logs, redémarrage et restauration testés. Auditer capacité S1 avant le placement, ou choisir un hôte séparé. Une politique Docker restart n'est pas une preuve HA si le VPS échoue.

## 5. Observabilité et résistances
États autorisés : IDLE/RUNNING/WAITING_CI/WAITING_REVIEW/BLOCKED/RECOVERING/FAILED/COMPLETED ; heartbeat sourcé ; observateur externe au worker ; retries bornés, poison events en quarantaine, preuves de panne, cancellation gouvernée, backpressure, détecteur de collisions au claim. Aucun CLAIMED réputé libéré sur timeout seul.

## 6. Contrats d'admission et de sécurité
Un webhook, SBOM, issue ou commentaire n'est jamais un ordre d'exécution sans identité et mandat vérifiés. Les secrets de fournisseur modèle sont dans un secret store autorisé ; coûts/quotas observés ; revues et CI ne s'auto-approuvent pas. L'activation multi-dépôts exige la couverture exacte de l'installation CUG, le Project Binding et des mandats propres à chaque dépôt.

## 7. Graphe programmatique distinct du graphe code
Architecture = imports/API/data/service/infra. Programme = projets/chantiers/tâches/PR/ordres et dépendances. Jointure sourcée `taskId ↔ componentRef@SHA` ; une relation non prouvée demeure UNVERIFIED, aucune fusion par nom approximatif.

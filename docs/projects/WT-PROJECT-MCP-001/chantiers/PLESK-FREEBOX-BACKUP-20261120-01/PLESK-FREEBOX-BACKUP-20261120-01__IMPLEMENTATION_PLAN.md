# PLESK-FREEBOX-BACKUP-20261120-01 — IMPLEMENTATION_PLAN

> Project UID documentaire : WT-PROJECT-MCP-001. Continuité : PLESK-FREEBOX-BACKUP-20261120-01. État au 27/11/2026 ; aucun droit runtime implicite.

Réutiliser capacityProbe, maintenancePlan, backupReceipt, scriptRevision, service commun, dockerInventory, backupAutomation, prc17Operation, privateReceiptObservation et freeboxCapacity. Pas de second transport, scheduler ou store. Raccorder configuration privée, provenance des scripts, identité machine, admission tâches/sessions/verrous, revalidation à chaque effet, journal durable début/fin, rapprochement des réponses ambiguës, mesure physique avant/après. Le cockpit persiste les politiques dans le backend autoritaire. Tests : exact-head CI/CodeQL, appel réel, panne réseau/disque, crash/reprise, concurrence, expirations, corruption, restauration isolée et santé des services.

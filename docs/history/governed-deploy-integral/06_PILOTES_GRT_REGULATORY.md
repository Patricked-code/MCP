# Pilotes réels — GRT et Regulatory

## GRT — pilote distinct
Commentaire #6354667677 : dépôt chainsolutions-wealthtech/Governed-Repository-Template, cible expérimentale S1 /gouvern ; dépôt de gouvernance, pas application web prête à servir. PR #351, admission et snapshot contrôlés ; aucun staging réel autorisé par les seules pièces documentaires.
Sources : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6354667677 ; https://github.com/Patricked-code/MCP/pull/351

## Regulatory — mandat du 23 octobre
Commentaires #6355712365 et #6355773248 : raccorder chainsolutions-wealthtech/Regulatory à S1 sous `https://wealthtechinnovations.com/regulatory`, réutiliser #350, ne pas écrire directement sur S1/main. Le dépôt est accessible ; mapping et targetScope manquants au moment de l'observation.
Sources : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6355712365 ; https://github.com/Patricked-code/MCP/issues/349#issuecomment-6355773248

## PR #352
Préflight `/regulatory` exact et tests. L'adaptation Next.js `basePath` reste à réconcilier avec le produit.
Source : https://github.com/Patricked-code/MCP/pull/352

## PR #353
Admission gouvernée fail-closed. Carte du 28 octobre : HEAD historique `0234a2ae3708d92993a2dc9b798b0ac95633ced1`, CI #40590574895 SUCCESS sur ce HEAD ; absence de preuve de mutation autorisée. Session `caa50d12-737c-47f9-9ee0-6cf8b763fdbe`, checkpoints `d0101c3a-32f5-4251-bd60-d547c2f678d0`, `92c025c6-f618-4ef7-949b-22369b88e815`, `7c677f79-e8cc-4826-8e21-4d30a69da070`, `81f65a33-85cf-428f-89ea-018016ffacb6`. Ce sont des événements distincts, pas un continuity ID global.
Sources : https://github.com/Patricked-code/MCP/pull/353 ; https://github.com/Patricked-code/MCP/issues/349#issuecomment-6456632312

## 28 octobre — Regulatory comme produit ET pilote
Commentaire #6456422302 : Regulatory (« UMOA Prospectus Composer ») doit être développé comme produit réel, séparément de sa valeur comme pilote MCP.
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6456422302

## Conflit de cible
Le manifeste produit historique vise un sous-domaine ; le mandat #349 vise un sous-chemin. Issue dédiée https://github.com/chainsolutions-wealthtech/Regulatory/issues/3. Aucune réécriture silencieuse ; aucune activation avant ADR/consentement/réconciliation.
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6458160787

## Dépendance de sécurité
Task `TASK-20261027-001` rapportée READY/unclaimed dans la carte du 28 octobre ; `claim-next` pourrait sélectionner la tâche OAuth `TASK-20260929-001`. Ne jamais claim la mauvaise tâche. Aucun droit d'écriture n'est conféré par ce dossier.

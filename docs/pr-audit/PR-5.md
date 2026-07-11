# PR #5 — lecture issue-aware

Ce fichier ne remplace pas l’audit détaillé de la PR #5 dans la PR #8.

Il complète l’analyse avec les blockers #2 et #3.

## Décision

PR #5 ne doit pas être mergée maintenant.

## Pourquoi

- PR #5 apporte l’onboarding engine.
- L’onboarding dépend de la visibilité GitHub et des droits connecteur, donc de #2.
- L’onboarding doit aussi respecter les contraintes d’inventaire serveur privé et d’approbation opérateur, donc #3.
- Certaines documentations chevauchent la gouvernance déjà intégrée par #6.

## Prochaine branche documentaire/technique après #4

`mcp/onboarding-docs-after-governance`

## À reprendre plus tard

- specs onboarding utiles ;
- audit logs ;
- repo footprint ;
- server mapping public-safe ;
- routes onboarding seulement après outils GitHub contrôlés.

## À ne pas faire

- exposer inventaire privé ;
- stocker token brut ;
- déclencher production ;
- écraser la gouvernance #6.

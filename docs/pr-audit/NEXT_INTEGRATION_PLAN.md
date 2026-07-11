# Plan d’intégration complémentaire après audit des PR #1, #4 et #5

Date : 2026-07-09T21:39:49Z

## Principe

Ne rien merger directement depuis #1, #4 ou #5.

Ne pas réduire arbitrairement.

Ne pas supprimer arbitrairement.

Identifier ce qui manque réellement à `main`.

Intégrer uniquement ce qui complète la gouvernance actuelle.

## Base actuelle

La branche `main` contient déjà la PR #6, qui ajoute :

- gouvernance anti-dispersion ;
- manuel MCP ;
- cartographie fonctionnelle ;
- modèle d’identité ;
- mode d’utilisation intelligent ;
- fichiers .mcp de gouvernance.

## PR #1

À traiter comme source historique large.

Ne pas merger directement.

Découper en éléments plus petits après analyse.

## PR #4

À traiter comme candidate technique prioritaire pour les outils GitHub MCP contrôlés.

Ne pas merger dans l’état si elle vise encore une branche intermédiaire.

Créer une future branche propre :

`mcp/github-tools-after-governance`

## PR #5

À traiter comme source documentaire complémentaire.

Comparer avec la PR #6 pour éviter les doublons.

Reprendre seulement ce qui manque vraiment.

## Ordre recommandé

1. Finaliser et relire cette PR synthèse.
2. Décider ce qui manque vraiment.
3. Créer une PR technique courte pour les outils GitHub MCP contrôlés.
4. Créer une PR documentaire courte pour les éléments onboarding non déjà couverts.
5. Laisser #1 comme référence historique tant que son contenu n’est pas découpé.

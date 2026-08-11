# Gouvernance documentaire MCP

## Objet

Ce répertoire décrit le contrôle déterministe des documents Markdown du dépôt `Patricked-code/MCP`.

La gouvernance sépare deux surfaces qui ne doivent jamais être confondues :

1. **Markdown suivis par Git** : inventaire exact produit par `git ls-files '*.md'`, classifié et verrouillé par une baseline versionnée ;
2. **Markdown runtime uniquement sur S1** : surface observée séparément et qui exige une attestation S1 fraîche avant toute déclaration de complétude courante.

## Historique 209 Markdown

L’audit S1 antérieur a observé **209 Markdown** à cet instant : **183 suivis par Git** et **26 supplémentaires runtime-only** dans la mémoire projet. Cette valeur est conservée comme preuve historique ; elle n’est pas utilisée comme constante éternelle du dépôt, car de nouveaux documents gouvernés peuvent être ajoutés par PR.

La CI doit donc verrouiller **les chemins exacts actuels**, pas seulement un compteur `183` ou `209`.

## Catégories Git

Chaque Markdown suivi doit appartenir à exactement une catégorie déterministe :

- `canonical` : documents racine participant à l’état/gouvernance courants ;
- `root-documentation` : autres documents racine ;
- `documentation` : documentation générale sous `docs/` ;
- `history` : historique explicitement archivé sous `docs/history/` ;
- `engineering-plan` : plans d’implémentation Superpowers ;
- `engineering-spec` : spécifications d’implémentation Superpowers ;
- `migration-history` : corpus de migration historique ;
- `memory` : mémoire versionnée sous `memory/` ;
- `runtime-mirror-tracked` : sous-ensemble du miroir runtime qui est également suivi par Git.

Un chemin `.md` qui ne correspond à aucune catégorie fait échouer la CI.

## Baseline

`markdown-inventory.json` contient les chemins exacts et leur catégorie. Le contrôle CI échoue si :

- un chemin attendu disparaît ;
- un nouveau Markdown apparaît sans mise à jour explicite de la baseline ;
- un fichier devient non classifié ;
- le nombre ou la catégorie dérivent silencieusement.

Une mise à jour légitime de la baseline doit donc apparaître clairement dans la PR qui ajoute, déplace ou supprime un Markdown.

## Cohérence sémantique

Les documents d’état actif désignés publient un bloc borné :

```text
```canonical-state
{ ... JSON ... }
```
```

La CI compare uniquement les constantes structurelles qui doivent être identiques : dépôt, branche canonique, chemin S1, remote de lecture, push désactivé et conteneur MCP.

Les SHA Git courants, timestamps et états runtime ne sont pas placés dans cette constante sémantique afin d’éviter une boucle auto-référentielle à chaque commit. Ils restent observés par Live State et consignés dans les documents d’état avec leur fraîcheur réelle.

## Surface runtime S1

Les Markdown non suivis par Git observés sur S1 ne peuvent pas être attestés depuis GitHub Actions seul. Tant que le connecteur S1 n’est pas disponible pour un contrôle frais, leur état courant est **`requires_revalidation`**. Aucun contrôle GitHub ne doit transformer une ancienne observation des 26 fichiers runtime-only en preuve actuelle.

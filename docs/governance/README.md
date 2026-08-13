# Gouvernance documentaire MCP

## Objet

Ce répertoire contrôle déterministement les Markdown de `Patricked-code/MCP` et distingue les fichiers Git des miroirs runtime-only.

## Surface courante réattestée

La passe read-only post-workflow a observé :

- 189 Markdown suivis par Git et classifiés individuellement dans `markdown-inventory.json` ;
- 33 Markdown sous `wealthtech_project_memory/memory/` sur S1 ;
- 7 de ces 33 également suivis par Git ;
- 26 Markdown runtime-only ;
- surface courante observée : `189 + 26 = 215`.

## Historique 209

L’ancienne photographie reste `183 Git + 26 runtime-only = 209`. Elle ne doit jamais être substituée au courant. L’évolution Git est `183 → 189`, soit six Markdown supplémentaires. Les six anciens chemins différentiels exacts ne sont pas affirmés sans l’ancien snapshot individuel.

## Catégories Git

Chaque Markdown suivi appartient à exactement une catégorie déterministe : `canonical`, `root-documentation`, `documentation`, `history`, `engineering-plan`, `engineering-spec`, `migration-history`, `memory` ou `runtime-mirror-tracked`.

## Baseline et CI

`markdown-inventory.json` contient les 189 chemins et catégories exacts. La CI échoue sur ajout, disparition, catégorie divergente, document non classifié ou contradiction `canonical-state`.

L’artefact `mcp-autodeploy-governance` copie désormais exactement les sept documents actifs suivis ; il ne génère plus d’anciens candidats codés en dur.

## Limite de preuve

GitHub Actions contrôle Git. La surface runtime-only exige toujours une lecture S1 fraîche pour une déclaration courante ; la présente valeur 26 provient d’une telle lecture gouvernée, mais devra être réattestée lors d’un futur rapport si elle est alors utilisée comme état courant.

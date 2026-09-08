# MCP_PERMISSIONS_MODEL.md

## Rôle
Modèle de permissions MCP.

## Niveaux
- read_only
- documentation_write
- scoped_code_write
- deploy_controlled
- admin_human_only

## Règles
Les permissions doivent être explicites, minimales, traçables et révocables. Toute permission dangereuse demande validation humaine.

## Frontière avec GitHub Identity

B1 / SLOT-06 résout uniquement une identité GitHub et sa provenance. Un binding
`IDENTITY_ONLY`, même `RESOLVED`, ne produit aucune permission, aucun scope, aucun
grant et aucun `mayWrite`, `mayMerge` ou `mayDeploy`. Les organisations accessibles
ne valent pas davantage autorisation.

Les permissions et `Effective Capabilities` appartiennent au SLOT-11. Elles doivent
continuer à composer séparément les politiques de gouvernance, le WRITE gate, la
tâche, le receipt, les locks et les preuves d'autorisation nécessaires. Le WRITE
gate reste `shadow` ; B1 ne change ni `ENABLE_WRITE_TOOLS`, ni `allow_write`, ni les
contrats historiques.

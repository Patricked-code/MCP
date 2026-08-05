# Programme de reprise MCP — 5 août 2026

## Statut

Cette documentation consolide l’audit, la récupération forensique et le plan d’alignement du MCP WealthTech sans modifier la production.

- Branche documentaire canonique candidate : `mcp/forensic-state-docs-20260805`
- Base GitHub : `097dac93715c0af83fcfad82cd598bacec956125`
- Effet sur S1 pendant cette PR : aucun
- Effet sur Docker pendant cette PR : aucun
- Build, restart, déploiement, reset, clean, suppression et purge : non exécutés par cette PR

## État consolidé

Le dépôt serveur `/opt/apps/wealthtech-mcp-ssh-bridge` a été observé sur la branche locale `mcp/scoped-access-20260729_051313`, avec le même HEAD que `origin/main` (`097dac9`) mais un working tree modifié et plusieurs fichiers non suivis.

La dérive utile a ensuite été préservée sur la branche forensique `mcp/recover-runtime-drift-20260805`. Cette préservation ne signifie pas que la branche est prête à être fusionnée ou déployée.

Le runtime, le dossier Git S1 et `main` ne sont pas encore réalignés sur un commit fusionné, propre et attesté.

## Décisions

1. Ne jamais nettoyer la branche locale S1 avant snapshot et manifeste.
2. Conserver la dérive post-29 comme preuve forensique, sans la fusionner telle quelle.
3. Séparer strictement les catalogues READ et WRITE avant toute réintégration.
4. Tester toute baseline et toute image candidate dans un environnement isolé.
5. Réaligner GitHub, S1 et Docker uniquement avec rollback disponible.
6. Réintroduire progressivement les fonctions utiles par PR indépendantes.
7. Centraliser comptes, dépôts, mappings, chemins, domaines et capacités dans GitRegistry v2.
8. Ne jamais autoriser une écriture ou une suppression sur un objet absent du registre actif.

## Documents canoniques de cette reprise

- `MCP_RUNTIME_RECOVERY_ATTESTATION.md`
- `MCP_RUNTIME_TOOL_CATALOG_20260805.md`
- `MCP_PRE29_RECOVERY_AUDIT.md`
- `MCP_REGISTRY_UPDATE_SUMMARY.md`
- `MCP_REGISTRY_UPDATE_WORKFLOW.md`
- `MCP_GIT_REGISTRY_V2_SPEC.md`
- `MCP_GIT_REGISTRY_V1_TO_V2_MIGRATION_PLAN.md`
- `MCP_NON_DESTRUCTIVE_EXECUTION_PLAN.md`
- `MCP_CONNECTION_CONTINUITY_POLICY.md`
- `ALIGNMENT_EXECUTION_STATUS_PRE_RECOVERY.md`

Le fichier `MCP_REGISTRY_UPDATE_WORKFLOW.corrupted-original.md` est conservé comme preuve historique et ne doit jamais être utilisé comme procédure exécutable.

## PR techniques liées

- PR #19 : snapshot forensique uniquement, ne pas fusionner telle quelle ;
- PR #20 : séparation READ/WRITE validée dans son principe, à reconstruire sur une base propre ;
- PR #21 : diagnostic GitHub read-only, corrections de sécurité et de classification requises avant fusion.

## Point de contrôle

Aucune bascule de production ne doit intervenir avant :

- revue et consolidation de la documentation ;
- sélection des modules forensiques réellement conservés ;
- séparation READ/WRITE testée sur une base propre ;
- image candidate attestée ;
- validation des health checks et du rollback ;
- accord explicite de l’opérateur.

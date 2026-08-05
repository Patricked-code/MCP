# Programme de reprise MCP — 5 août 2026

## Statut

Cette documentation prépare la reprise du MCP WealthTech sans modifier la production.

- Branche documentaire : `mcp/audit-recovery-20260805`
- Base GitHub : `097dac93715c0af83fcfad82cd598bacec956125`
- Effet sur S1 : aucun
- Effet sur Docker : aucun
- Build, restart, déploiement, reset, clean, suppression et purge : non exécutés

## Situation observée

Le dépôt serveur `/opt/apps/wealthtech-mcp-ssh-bridge` est actuellement sur la branche locale
`mcp/scoped-access-20260729_051313`, avec le même HEAD que `origin/main` (`097dac9`) mais un
working tree modifié et plusieurs fichiers non suivis. Le runtime Docker exécute des capacités
postérieures à ce commit. GitHub, le répertoire S1 et l'image Docker ne sont donc pas alignés.

## Décision

1. Ne pas nettoyer ni modifier la branche locale avant snapshot.
2. Conserver la dérive post-29 comme source forensique.
3. Tester `097dac9` dans un worktree ou clone isolé.
4. Réaligner ensuite GitHub, S1 et Docker avec une image attestée.
5. Réintroduire progressivement les fonctions utiles par PR indépendantes.
6. Centraliser comptes, dépôts, mappings, chemins, domaines et capacités dans GitRegistry v2.
7. Administrer les mappings depuis le frontend avec validation, audit et rollback.
8. Ne jamais autoriser une écriture ou une suppression sur un objet absent du registre actif.

## Documents

- `MCP_PRE29_RECOVERY_AUDIT.md`
- `MCP_GIT_REGISTRY_V2_SPEC.md`
- `MCP_GIT_REGISTRY_V1_TO_V2_MIGRATION_PLAN.md`
- `MCP_NON_DESTRUCTIVE_EXECUTION_PLAN.md`
- `MCP_CONNECTION_CONTINUITY_POLICY.md`

## Point de contrôle

Aucune application technique de ces plans ne doit intervenir avant :

- revue de la PR documentaire ;
- snapshot complet de la dérive ;
- attestation de l'image Docker active ;
- validation de la baseline isolée ;
- accord explicite de l'opérateur.

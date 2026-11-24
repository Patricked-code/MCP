# SOURCE_OF_TRUTH.md

## Role
Registre des sources de verite du MCP.

## Ordre de priorite
1. Etat reel serveur et Git.
2. Fichiers .mcp/*.json pour la couche MCP.
3. SUIVI.md pour le point de reprise.
4. MCP_REPO_INVENTORY.md pour le depot.
5. MCP_SERVER_MAPPING.md pour le mapping serveur.
6. docs/ et memory/ pour historique et contexte.

## Regle
En cas de contradiction, documenter le conflit dans DECISIONS_LOG.md avant action.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## Cartographie des miroirs historiques et autorités actuelles — 2026-11-24

Cette annotation empêche de prendre les vingt documents miroirs à la racine de `docs/` pour des projections opérationnelles à jour. Sont concernés : `docs/SUIVI.md`, `docs/ROADMAP.md`, `docs/TODO.md`, `docs/TASKS.md`, `docs/CHANGELOG.md`, `docs/DEPLOYMENT_PRODUCTION.md`, `docs/GPT.md`, `docs/ARCHITECTURE.md`, `docs/DOCKER.md`, `docs/SECURITY.md`, `docs/MCP_TOOLS.md`, `docs/README_DEV.md`, `docs/CODE_REVIEW.md`, `docs/AGENTS_ARCHITECTURE.md`, `docs/AI_SKILLS.md`, `docs/BACKUP_RESTORE.md`, `docs/DATABASE.md`, `docs/MIGRATION.md`, `docs/KUBERNETES_FUTURE.md` et `docs/MONITORING.md`. Ils restent intacts et consultables comme contexte de départ. **Ne pas les supprimer, recopier automatiquement, ni réactiver leurs tâches historiques par défaut.**

| Nature du fait | Source active et vérification |
| --- | --- |
| Identité, gouvernance et ordre des sources | `SOURCE_OF_TRUTH.md`, `AGENTS.md`, politiques `.mcp/*.json` |
| Travail actuel et décisions | `SUIVI.md`, `ROADMAP.md`, `TODO.md`, `TASKS.md`, `DECISIONS_LOG.md` ; rapprocher avec les PR, la Queue, les sessions, les verrous et les preuves de l'autorité propre au chantier |
| GitHub/S1/Runtime maintenant | `mcp_reconcile_governed_context` et Live State frais ; contrôler ensemble révisions, santé Docker, worktree et provenance |
| Attestations historiques de production | `PRODUCTION_STATE.json`, preuve datée, peut rester en retard sur Live State et relève de la procédure G1 dédiée |
| Contexte initial MCP | Les vingt `docs/*.md` ci-dessus, annotés et conservés sans réécriture de leur contenu |
| Continuités spécifiques | `docs/projects/`, registres et checkpoints rattachés aux chantiers ; ne pas inférer un mandat ni un ownership d'un document |

**Anti-collision :** la PR #449 reste seule propriétaire du correctif exact-SHA G1 sur `PRODUCTION_STATE.json`. Aucune copie automatique du contenu des documents racine vers les miroirs historiques. Une modification de contenu actif n'est autoritaire qu'avec ses propres preuves de révision et de gouvernance ; l'existence d'un Markdown n'est pas une attestation runtime.

**Continuité :** `WT-MCP-REGISTRY-RESOLUTION-20261121-01`. Cette passe est documentaire et sans changement de code, runtime ou source de vérité. Les corrections de l'inventaire et les registres de projet en PR ouvertes restent propriétaires de leurs périmètres.

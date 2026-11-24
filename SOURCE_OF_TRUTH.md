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

## Équivalences documentaires du projet MCP — 24 novembre 2026

Pour la racine documentaire candidate `WT-PROJECT-MCP-001`, les documents racine du dépôt détiennent déjà les fonctions indiquées ci-dessous. Les rattachements se limitent à la navigation et à l'autorité **documentaire** du projet MCP ; ils ne prouvent pas un ProjectRecord runtime ni le rattachement d'autres projets. Ne pas créer de copies locales pour satisfaire mécaniquement une nomenclature. Une équivalence déclarée et lisible n'atteste ni l'actualité sémantique ni l'exhaustivité du contenu.

```documentary-authority-equivalence
{
  "schemaVersion": 1,
  "scopeKey": "docs/projects/WT-PROJECT-MCP-001",
  "identityStatus": "DOCUMENTARY_CANDIDATE",
  "equivalences": [
    {
      "type": "SOURCE_OF_TRUTH",
      "paths": [
        "SOURCE_OF_TRUTH.md"
      ]
    },
    {
      "type": "DOCUMENT_AUTHORITIES",
      "paths": [
        "SOURCE_OF_TRUTH.md"
      ]
    },
    {
      "type": "MISSION",
      "paths": [
        "PROJECT_BRIEF.md",
        "PROJECT_SCOPE.md"
      ]
    },
    {
      "type": "DECISIONS",
      "paths": [
        "DECISIONS_LOG.md"
      ]
    },
    {
      "type": "CONTINUITY",
      "paths": [
        "SUIVI.md"
      ]
    },
    {
      "type": "MEMORY",
      "paths": [
        "GPT.md",
        "memory/README.md",
        "memory/manifest.json"
      ]
    },
    {
      "type": "ROADMAP",
      "paths": [
        "ROADMAP.md"
      ]
    },
    {
      "type": "SUIVI",
      "paths": [
        "SUIVI.md"
      ]
    },
    {
      "type": "TASKS",
      "paths": [
        "TASKS.md"
      ]
    },
    {
      "type": "TODO",
      "paths": [
        "TODO.md"
      ]
    },
    {
      "type": "AGENTS",
      "paths": [
        "AGENTS.md",
        "CLAUDE.md",
        "GPT.md"
      ]
    },
    {
      "type": "ARCHITECTURE",
      "paths": [
        "ARCHITECTURE.md"
      ]
    },
    {
      "type": "CARTOGRAPHY",
      "paths": [
        "MCP_FUNCTIONAL_CARTOGRAPHY.md",
        "MCP_REPO_INVENTORY.md",
        "MCP_SERVER_MAPPING.md"
      ]
    },
    {
      "type": "INTENTIONS",
      "paths": [
        "PROJECT_BRIEF.md",
        "DECISIONS_LOG.md"
      ]
    },
    {
      "type": "IMPLEMENTATION_PLAN",
      "paths": [
        "ROADMAP.md",
        "docs/governance/program-backlog-convergence.json",
        "LOOP_ENGINEERING.md"
      ]
    },
    {
      "type": "EVIDENCE_INDEX",
      "paths": [
        "ACTIVITY_LOG.md",
        "DEPLOYMENT_PRODUCTION.md",
        "SUIVI.md"
      ]
    }
  ]
}
```

### Rattachement des trois fonctions projet restantes — 24 novembre 2026

- **INTENTIONS** : le [brief projet](PROJECT_BRIEF.md#intentions-du-projet-mcp) conserve les intentions explicites et leur provenance ; [DECISIONS_LOG](DECISIONS_LOG.md) conserve les décisions réellement adoptées. Une intention non décidée ne devient pas une autorisation.
- **IMPLEMENTATION_PLAN** : le [Programme d'évolution gouvernée](ROADMAP.md#programme-dévolution-gouvernée) fournit les chantiers et leur réalisation par lots ; [Program Backlog V2](docs/governance/program-backlog-convergence.json) fournit les `workItems`, `taskBlueprints`, `executionModel.waves`, dépendances et gates ; [Loop Engineering](LOOP_ENGINEERING.md) fournit la procédure commune de réalisation. Cette composition constitue le plan documentaire de référence, pas une file d'exécution ; les plans locaux restent propriétaires de leur détail.
- **EVIDENCE_INDEX** : le [journal des preuves](ACTIVITY_LOG.md) indexe les événements et leurs références GitHub ; [DEPLOYMENT_PRODUCTION](DEPLOYMENT_PRODUCTION.md) détient les attestations de déploiement historiques ; [SUIVI](SUIVI.md#point-de-reprise-courant) indique le checkpoint et les preuves à réobserver. Le journal n'est pas une preuve runtime actuelle.

Ces trois équivalences rendent les sources identifiables et lisibles ; elles ne certifient pas que toutes les intentions historiques ont été récupérées, tous les plans réconciliés ou toutes les preuves indexées. Le dossier candidat #389 reste distinct et son intégration ne se déduit pas de cette déclaration. La mission et les sous-chantiers conservent leurs propres documents propriétaires. La [carte d'autorités de la mission](docs/projects/WT-PROJECT-MCP-001/chantiers/WT-MCP-REGISTRY-RESOLUTION-20261121-01/WT-MCP-REGISTRY-RESOLUTION-20261121-01__DOCUMENT_AUTHORITIES.md) désigne déjà ses équivalences architecture/cartographie. Voir [#441](https://github.com/Patricked-code/MCP/issues/441) et [Loop Engineering](LOOP_ENGINEERING.md).

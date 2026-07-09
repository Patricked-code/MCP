# Audit Issue #2 — GitHub/Codex/MCP connector authorization blocker

## Identification

- Numéro : #2
- Type : Issue GitHub, pas Pull Request
- Statut : ouverte
- Titre : `[MCP blocker] Authorize GitHub/Codex/MCP connector on chainsolutions-wealthtech`
- Labels : `mcp-blocker`, `github-connector`, `external-action`
- Rôle propriétaire attendu : owner/admin de l’organisation `chainsolutions-wealthtech`

## Nature du blocker

`github_connector_not_authorized_on_target_org`

Le bootstrap public de l’organisation est en place, mais le connecteur GitHub/Codex/MCP ne peut pas encore lister ou gérer directement les repositories de `chainsolutions-wealthtech`.

## Ce que #2 bloque

- `authorize_github_connector_on_chainsolutions`
- `regenerate_ingestion_after_connector_access`
- `bootstrap_visible_org_repositories`
- `authorize_connector_on_target_org`
- `bootstrap_visible_org_repositories`

## Checklist issue #2

- ouvrir les paramètres de l’organisation `chainsolutions-wealthtech` comme owner/admin ;
- installer ou autoriser le connecteur GitHub utilisé par Codex/MCP sur l’organisation ;
- accorder uniquement les permissions nécessaires : visibilité repos, écriture de branche, pull requests ;
- vérifier que le connecteur voit `chainsolutions-wealthtech` comme organisation visible ou installée ;
- vérifier que l’onboarding MCP ne signale plus l’accès organisation comme bloqué.

## Critères d’acceptation

- les comptes installés du connecteur incluent `chainsolutions-wealthtech` ;
- l’onboarding MCP ne signale plus le blocage d’accès organisation ;
- `GET /git/repos` peut inclure les repositories de l’organisation après authentification ;
- aucun token brut, `.env`, clé privée ou inventaire privé n’est copié dans Git, logs, screenshots ou artefacts générés.

## Commentaires importants

Un commentaire indique que ChatGPT peut maintenant résoudre `chainsolutions-wealthtech/.github`. Cela constitue un progrès partiel, mais l’issue ne doit pas être fermée tant que le runtime MCP ne confirme pas lui-même la visibilité depuis ses vues onboarding et repository.

Un autre commentaire relie directement la PR #4 à cette issue : les outils `github_status`, `github_list_orgs`, `github_list_repos`, `github_repo_status` et `github_audit_permissions` doivent permettre au runtime MCP de vérifier lui-même la visibilité organisation/repository.

## Impact sur PR #1

PR #1 reste bloquée tant que l’accès connecteur à l’organisation cible n’est pas confirmé côté runtime MCP. Les éléments d’onboarding, de bootstrap organisation, de source registry et de tasks ne doivent pas être considérés comme finalisables sans cette preuve.

## Impact sur PR #4

PR #4 devient prioritaire parce qu’elle apporte les outils nécessaires pour lever ou diagnostiquer ce blocker côté runtime MCP. Mais elle ne doit pas être mergée telle quelle : elle doit être reconstruite depuis le nouveau `main` dans `mcp/github-tools-after-governance`.

## Impact sur PR #5

PR #5 dépend indirectement de #2, car son onboarding engine doit pouvoir vérifier les droits GitHub, les repos visibles, les comptes connectés et les permissions sans exposer de token brut.

## Décision provisoire

- Ne pas fermer #2.
- Ne pas considérer #2 comme résolu.
- Intégrer #2 comme blocker actif dans la stratégie d’unification.
- Prioriser une branche technique propre pour les outils GitHub MCP contrôlés.

Branche recommandée :

`mcp/github-tools-after-governance`

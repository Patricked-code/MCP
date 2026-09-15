# Git/GitHub Control Plane Completion — programme

## Objectif

Donner au MCP existant une couverture Git et GitHub complète, typée et gouvernée, sans shell libre, sans endpoint GitHub arbitraire et sans créer un second MCP.

## Autorités et invariants

- `Patricked-code/MCP` reste le repository canonique du MCP.
- `main` reste la référence stable ; aucun push direct.
- Chaque mutation sensible doit être liée aux autorités dynamiques Task / Session / Live State / Bootstrap Receipt / locks / exact-head.
- La présence d'un credential techniquement capable ne vaut jamais autorisation.
- Les secrets sont write-only : leurs noms peuvent être observés, jamais leurs valeurs.
- `git push --force`, `git reset --hard`, `git clean -fdx`, shell Git libre, GitHub raw API et suppression de repository restent hors surface.

## Source de vérité du programme

Le fichier `.mcp/git-github-capabilities.json` est le manifeste exhaustif de capacités. Chaque entrée possède :

- un ID stable ;
- une plateforme `git|github` ;
- une famille ;
- un effet `read|write|admin|security_sensitive|production_effect|forbidden` ;
- un statut `existing|candidate|planned|forbidden` ;
- un niveau de risque.

Le manifeste ne remplace pas la Governed Task Queue. Il décrit la couverture fonctionnelle cible et permet de mesurer ce qui est implémenté ou manque.

## Séquençage

1. Fondation : manifeste, invariants et première vague GitHub READ.
2. GitHub lifecycle : branches, commits, fichiers, PR, reviews, checks.
3. GitHub administration : settings, rulesets, webhooks, environments, variables/secrets.
4. GitHub delivery : workflows, releases, deployments.
5. GitHub collaboration : issues, Projects, org/audit.
6. Git local READ générique sur projets gouvernés.
7. Git local WRITE sûr : fetch/FF, branches, stage/commit, revert.
8. Git intégration avancée : merge/rebase/cherry-pick/stash/worktrees/bisect.
9. Remotes/submodules/maintenance.
10. Revue finale de couverture : aucune capacité `planned` restante sauf éléments explicitement `forbidden`.

Chaque lot suit RED → GREEN → cartographie → docs → Draft PR → revue exact-head. Les lots peuvent être empilés mais ne sont jamais mergés/déployés sans leurs autorités runtime.

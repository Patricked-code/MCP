# Stratégie d’unification PR #1 #4 #5

Date : 2026-07-09T21:02:39Z

## Point de départ

La PR #6 est considérée comme base de gouvernance déjà intégrée à `main`.

Commit base :

```text
4ae1124 docs: add MCP anti-dispersion manual and function cartography (#6)
```

## PR #1 — Prepare chainsolutions-wealthtech MCP governance onboarding

Traitement recommandé :

- ne pas merger directement ;
- PR trop grosse ;
- PR historiquement bloquée ;
- contient des éléments structurants utiles ;
- doit être découpée en sous-PR plus petites après audit.

Actions probables :

1. garder les concepts encore utiles ;
2. isoler les fichiers docs non redondants ;
3. refaire les parties code sur une branche fraîche depuis `main` ;
4. ne reprendre aucun élément sans tests ;
5. vérifier les blockers #2 et #3 avant toute intégration structurante.

## PR #4 — Add controlled GitHub MCP tools

Traitement recommandé :

- ne pas merger directement dans `main` ;
- elle vise une branche intermédiaire, pas `main` ;
- elle semble utile pour ajouter des outils GitHub MCP contrôlés ;
- elle doit être rebasée ou reconstruite depuis le nouveau `main`.

Actions probables :

1. extraire uniquement les outils GitHub contrôlés ;
2. vérifier les tests de sécurité ;
3. conserver le principe `mcp/*` seulement ;
4. bloquer tout write direct sur `main` ;
5. créer une nouvelle PR propre : `mcp/github-tools-after-governance`.

## PR #5 — MCP GitHub Governance Onboarding Engine

Traitement recommandé :

- ne pas merger directement ;
- probablement chevauchement avec PR #6 ;
- récupérer uniquement les docs ou idées non présentes ;
- déplacer les specs utiles sous `docs/` ou `.mcp/` selon leur rôle.

Actions probables :

1. comparer avec `MCP_ANTI_DISPERSION_GOVERNANCE.md`;
2. comparer avec `MCP_FUNCTIONS_AND_TOOLS_MANUAL.md`;
3. comparer avec `.mcp/function-cartography.json`;
4. garder seulement ce qui ajoute une valeur nouvelle ;
5. éviter les doublons.

## Ordre recommandé

1. Auditer #1, #4, #5.
2. Ne rien merger.
3. Créer une PR d’audit documentaire.
4. Après validation humaine, créer une PR par sujet :
   - `mcp/github-tools-after-governance`
   - `mcp/onboarding-docs-after-governance`
   - `mcp/migration-governance-split`
5. Chaque PR doit être petite, testée, documentée et reliée à `SUIVI.md`.

## Interdictions

- pas de merge direct de #1 ;
- pas de merge direct de #4 vers main ;
- pas de merge direct de #5 ;
- pas de squash global massif ;
- pas de reprise de secrets ;
- pas de déploiement ;
- pas de reset.

---

## Décision de synthèse — 2026-07-09T21:39:49Z

Les fichiers `*.merge-tree.txt` ne sont pas inclus dans cette branche de synthèse pour éviter d’alourdir `main`.

La branche `mcp/pr-unification-audit` conserve l’audit brut complet.

Cette branche `mcp/pr-unification-audit-summary` est celle recommandée pour PR vers `main`.

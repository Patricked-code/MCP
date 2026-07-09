# GITHUB_AUTO_DISCOVERY.md

## Rôle

Ce document décrit la couche d’auto-découverte GitHub du MCP WealthTech.

Objectif : lorsqu’un compte ou une organisation GitHub est connecté au MCP, le serveur doit pouvoir inventorier les dépôts visibles, synchroniser le registre MCP GitHub et conserver l’alignement entre GitHub, le serveur et la documentation projet, sans destruction et sans régression.

## Règle permanente

Aucune action automatique ne doit supprimer, écraser, forcer un push, cloner dans un chemin non validé, déployer ou modifier un secret.

L’auto-découverte est additive :

1. elle lit GitHub ;
2. elle ajoute les dépôts manquants au registre ;
3. elle met à jour les mappings déjà connus ;
4. elle conserve les mappings existants ;
5. elle laisse `deployEnabled=false` pour tout nouveau dépôt ;
6. elle conserve les secrets hors Git ;
7. elle journalise les actions dans `auditEvents`.

## Fichiers applicatifs ajoutés ou modifiés

- `src/github/inventory.ts` : inventaire GitHub, pagination, normalisation des dépôts, synchronisation non destructive du registre.
- `src/github/registry.ts` : déclenchement de l’auto-découverte après l’enregistrement d’une connexion GitHub valide.
- `src/tools/githubInventory.ts` : outils MCP de lecture seule pour inventorier les dépôts visibles.
- `src/tools/readOnly.ts` : raccord des outils d’inventaire GitHub au serveur MCP.
- `docs/GITHUB_AUTO_DISCOVERY.md` : documentation du comportement, limites, point d’arrêt et commandes.

## Outils MCP ajoutés

### github_org_inventory

Liste les dépôts visibles pour l’organisation GitHub configurée ou fournie.

Lecture seule uniquement : aucun clone, aucune suppression, aucun push.

### github_account_inventory

Liste les dépôts visibles pour le compte authentifié par le token GitHub MCP.

Lecture seule uniquement : aucun clone, aucune suppression, aucun push.

## Comportement après connexion GitHub

Quand `/git/connect` ou `/github/connect` enregistre une connexion GitHub valide, `recordGithubConnection()` déclenche `syncGithubReposToRegistry()`.

La synchronisation du registre :

- garde les mappings existants ;
- ajoute les nouveaux dépôts ;
- conserve les chemins serveur existants ;
- crée seulement des chemins théoriques pour les nouveaux dépôts : `/opt/apps/wealthtech-github-repos/<owner>/<repo>` ;
- laisse `deployEnabled=false` sur les nouveaux mappings ;
- n’effectue ni clone, ni pull, ni commit, ni push, ni déploiement.

## Point d’arrêt actuel

Le serveur MCP peut maintenant inventorier les dépôts GitHub visibles et alimenter le registre MCP GitHub de manière non destructive.

Ce qui reste à faire dans une étape suivante :

1. créer des outils write-scoped explicites pour cloner un dépôt mappé dans son chemin serveur ;
2. créer des outils write-scoped pour générer les fichiers `.mcp/*`, `SUIVI.md`, `CLAUDE.md`, `GPT.md`, `CODEX.md`, `TASKS.md` dans chaque dépôt ;
3. ajouter un mécanisme de commit/push contrôlé, jamais automatique sans garde-fou ;
4. rattacher l’organisation cible définitive `chainsolutions-wealthtech/MCP` lorsque le remote Git sera confirmé ;
5. maintenir un workflow d’alignement : serveur → tests → commit → push → redémarrage MCP.

## Commande de vérification SSH

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge
git status -sb
npm run typecheck
npm run build
```

## Commande de commit/push recommandée

```bash
cd /opt/apps/wealthtech-mcp-ssh-bridge

git status -sb
git diff --stat

git add \
  src/github/inventory.ts \
  src/github/registry.ts \
  src/tools/githubInventory.ts \
  src/tools/readOnly.ts \
  docs/GITHUB_AUTO_DISCOVERY.md

git commit -m "feat(github): auto-discover repositories on MCP GitHub connection"
git push origin main
```

## Règle d’alignement serveur / GitHub

Tout changement validé sur le serveur doit suivre cet ordre :

1. vérifier l’état Git ;
2. lire le diff ;
3. exécuter typecheck/build ;
4. committer uniquement les fichiers cohérents ;
5. pousser vers GitHub ;
6. redémarrer le MCP seulement après build valide ;
7. vérifier `/health` ;
8. documenter le point d’arrêt.

Cette règle est permanente et vaut pour ChatGPT, Claude Code, Codex, les scripts MCP et toute intervention humaine.

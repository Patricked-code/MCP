# MCP Durable Account Management

Date: 2026-07-10  
Projet: `wealthtech_ssh_bridge`  
Mode: durable, sécurisé, non destructif, read-only-first

## Objectif

Le serveur MCP doit pouvoir gérer durablement les comptes explicitement déclarés et autorisés, sans jamais exposer de secrets, sans connexion forcée et sans action destructive implicite.

## Comptes concernés

Le registre actuel `data/github-accounts.json` déclare :

- `chainsolutions-wealthtech` comme cible principale ;
- `Patricked-code` comme source historique ;
- `Wealthtechinnovations` comme compte secondaire en attente de synchronisation du token dédié.

## Règles

1. Un compte n’est gérable que s’il est déclaré dans le registre.
2. Les tokens doivent rester hors Git.
3. Les tokens doivent être sous `/app/secrets/`.
4. Les tokens ne doivent jamais être affichés dans les réponses, logs ou documents.
5. Le mode nominal reste `read-only-first`.
6. L’inventaire ne clone rien, ne supprime rien et n’écrit rien.
7. Les droits write/admin ne deviennent actifs que via des outils contrôlés et des mappings autorisés.
8. `deployEnabled=false` bloque tout déploiement.
9. Un compte dont le token est absent, invalide ou expiré doit être marqué comme non connecté.
10. Toute nouvelle connexion doit être additive.
11. Une observation `GET /user` prouve un utilisateur GitHub authentifié ; elle ne transforme pas une organisation accessible en principal.
12. Un binding B1 sélectionne contextuellement une connexion existante mais ne crée ni connexion, credential, permission ou rôle.

## Outils ajoutés

### `github_durable_accounts_status`

Vérifie tous les comptes déclarés, leurs fichiers secrets, leur validation GitHub et leurs accès de base.

### `github_durable_accounts_inventory`

Inventorie les dépôts visibles par les comptes déclarés, sans écrire, sans cloner, sans supprimer.

## Réutilisation par GitHub Identity B1

La résolution B1 réutilise le même observateur borné `GET /user` que les outils
durables. Les token files identiques sont dédupliqués pendant une collecte ; aucun
cache durable supplémentaire n'est créé. La projection exportée contient seulement
le compte configuré, la preuve de principal assainie, la fraîcheur et le statut du
contexte de compte. Elle exclut le chemin du secret, le token, les scopes et toute
capability.

`data/github-accounts.json` reste l'autorité des connexions configurées.
`.mcp/identity-policy.json` porte seulement la sélection/binding contextuel. Le
secret storage reste l'autorité du credential et GitHub API celle de la preuve live.

## Réutilisation par Repository Resolution B2

B2 étend ce même module par un batch de collecte interne. Le batch expose les
observations B1 existantes et une fonction éphémère `observeRepository` qui
accepte uniquement un `authenticationContextId` créé pendant cette collecte. Un
identifiant inconnu est refusé sans bascule vers un autre credential.

L'appel exact `GET /repos/{owner}/{repo}` est réduit à l'identifiant numérique,
owner/type, nom canonique, branche par défaut éventuelle, visibilité éventuelle,
état archived/fork et fraîcheur. Token, tokenFile, scopes, `permissions`, URLs,
réponse brute et corps d'erreur ne quittent jamais l'observateur. Les wrappers B1
historiques restent inchangés et aucun deuxième observateur ou cache n'est créé.

## Limite volontaire

Le MCP ne peut pas se connecter durablement à tous les comptes “par magie”. Il ne peut gérer durablement que les comptes déclarés et autorisés par des secrets valides. Cette limite protège les comptes, les dépôts et les serveurs WealthTech.

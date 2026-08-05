# Résumé opérationnel — mise à jour du registre MCP

## Statut

Documentation uniquement. Aucun build, redémarrage, déploiement, suppression, purge, reset, clean, pull ou merge n’est autorisé pendant cette phase.

## Sources canoniques retrouvées

- `data/github-accounts.json`
- `data/mcp-git-registry.json`
- `.mcp/server-map.json`
- `.mcp/permissions.json`
- `.mcp/function-cartography.json`
- `.mcp/identity-policy.json`
- `.mcp/branch-governance.json`

## Persistance vérifiée

Le déploiement Docker monte notamment :

- `./data:/app/data`
- `./secrets:/app/secrets`
- `./logs:/app/logs`
- `./keys:/app/keys:ro`

Les registres et comptes GitHub sont donc persistants indépendamment de l’image Docker. Les secrets restent hors Git sous `/app/secrets`.

## Comptes GitHub durables

- `chainsolutions-wealthtech` : organisation cible
- `Patricked-code` : compte source
- `Wealthtechinnovations` : compte secondaire, synchronisation de token S2 encore à confirmer

Les fonctions de comptes durables sont en lecture seule et ne doivent jamais afficher les tokens.

## Limites du registre v1

- absence de cycle de vie `discovered → proposed → path_verified → validated → active` ;
- confusion possible entre dépôt découvert et mapping opérationnel ;
- absence de distinction explicite entre dépôt source, cible et actif ;
- absence de vérification persistée de `realpath`, remote et domaine ;
- permissions trop grossières par mapping ;
- absence de rollback propre du registre ;
- frontend sans CRUD administratif complet ;
- auto-découverte capable de proposer des chemins théoriques sous `/opt/apps/wealthtech-github-repos/...`.

## Décisions permanentes

1. L’auto-découverte reste strictement en lecture seule.
2. Un dépôt découvert n’est jamais administrable automatiquement.
3. Aucun chemin serveur n’est fiable avant vérification explicite.
4. Aucune écriture n’est autorisée hors d’un mapping actif.
5. Aucun push direct sur `main` ou `master`.
6. Le déploiement est séparé de l’écriture.
7. La quarantaine est séparée de la purge.
8. Les opérations destructives sont désactivées par défaut.
9. Aucun dépôt GitHub n’est supprimé pendant une migration de domaine.
10. Aucune racine Plesk n’est supprimée.
11. Aucun working tree sale n’est nettoyé avant snapshot forensique.
12. La parité GitHub, S1 Git et runtime Docker doit être attestée avant toute évolution.

## Workflow cible

```text
discovered repository
→ proposed mapping
→ path_verified
→ validated
→ active
```

Un mapping actif peut ensuite être suspendu ou archivé sans perte d’historique.

## Frontend cible

Le frontend doit gérer :

- connexions GitHub durables ;
- dépôts découverts ;
- mappings proposés ;
- mappings actifs ;
- capacités ;
- migrations de domaines ;
- historique d’audit ;
- état du serveur MCP ;
- disponibilité de l’app ChatGPT ;
- état de la connexion GitHub.

Le frontend ne doit jamais écrire directement le JSON ; il doit passer par un service de validation, d’audit et de rollback.

## Étapes d’implémentation

1. finaliser GitRegistry v2 ;
2. écrire le migrateur v1→v2 en dry-run ;
3. ajouter les tests de schéma et d’idempotence ;
4. ajouter la lecture duale v1/v2 ;
5. créer le CRUD frontend sécurisé ;
6. vérifier chemins, remotes et domaines ;
7. séparer READ, WRITE, DEPLOY et DESTRUCTIVE ;
8. photographier la dérive postérieure au 29 juillet ;
9. tester la baseline `097dac9` dans un environnement isolé ;
10. réaligner GitHub, S1 et le runtime ;
11. réintroduire les fonctions projet par projet.

## État au 5 août 2026

- audit du registre v1 : réalisé ;
- persistance Docker : vérifiée ;
- comptes durables : vérifiés ;
- spécification v2 : rédigée ;
- migration exécutée : non ;
- runtime modifié : non ;
- build : non ;
- redémarrage : non ;
- déploiement : non ;
- suppression : non.

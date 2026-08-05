# Plan de migration GitRegistry v1 vers v2

## Principes

La migration doit être :

- non destructive
- idempotente
- réversible
- atomique
- auditée
- exécutée d'abord en dry-run
- sans secret dans Git
- sans activation automatique de droits sensibles

## Sources v1

- `data/github-accounts.json`
- `data/mcp-git-registry.json`
- `.mcp/server-map.json`
- `.mcp/permissions.json`
- `.mcp/function-cartography.json`
- `.mcp/identity-policy.json`
- `.mcp/branch-governance.json`

## Comptes connus

- `chainsolutions-wealthtech` : organisation cible
- `Patricked-code` : compte source
- `Wealthtechinnovations` : compte secondaire, validation live à confirmer

Les tokens restent sous `/app/secrets/*` et ne sont jamais copiés dans le registre.

## Mappings v1 à traiter

### MCP cible

`chainsolutions-wealthtech/MCP` pointe actuellement dans le registre vers le même chemin S1 que le
dépôt source. Il doit être converti en dépôt cible de migration, non actif.

### MCP source

`Patricked-code/MCP` est le remote réellement observé. Il reste le dépôt actif tant que la migration
organisationnelle n'est pas validée.

### Civitech

Le mapping `chainsolutions-wealthtech/civitech-commune-saas` doit être converti en `proposed` jusqu'à
vérification du realpath, du remote, de la branche et du vhost.

## Conversion

1. sauvegarder le JSON v1 et son SHA-256
2. valider le schéma v1
3. convertir les comptes en `connections`
4. créer un objet unique par dépôt
5. convertir chaque mapping avec le statut `proposed`
6. ne jamais inventer `realPathVerified=true`
7. désactiver toutes les capacités sensibles par défaut
8. conserver les événements d'audit historiques
9. créer la migration MCP source vers cible
10. écrire un candidat temporaire
11. valider le schéma v2
12. générer un rapport de diff
13. exécuter une seconde conversion et vérifier l'idempotence
14. attendre une validation humaine

## Remplacement futur

Le code compatible v1/v2 doit être déployé avant le remplacement du registre actif.

Après validation :

1. écrire le candidat dans le même filesystem
2. `fsync`
3. valider
4. renommer atomiquement
5. relire
6. comparer le hash
7. tester `/health`, `/mcp`, `/git/status` et le frontend
8. conserver la sauvegarde v1

## Rollback

Restaurer immédiatement v1 en cas de :

- lecture impossible
- mapping manquant
- contexte non résolu
- erreur de permissions
- régression frontend
- divergence de hash
- anomalie d'audit

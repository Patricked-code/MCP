# Modèle de reconnaissance connexions MCP/Git

<!-- MCP-CONNECTION-IDENTITY-MODEL -->

## Objectif

Ce fichier définit comment reconnaître qui est connecté au MCP ou au repo Git, et comment coordonner les humains et agents IA.

## Acteurs

- humain SSH ;
- ChatGPT superviseur ;
- Claude Code ;
- Codex ;
- MCP ;
- GitHub PR/commit ;
- automatisation cron/script/action.

## Signaux actuellement disponibles

- outil MCP appelé ;
- serveur ciblé ;
- intention de l’outil ;
- horodatage ;
- branche Git ;
- auteur de commit ;
- auteur de PR ;
- chemin serveur ;
- logs MCP masqués ;
- utilisateur SSH visible côté serveur.

## Limites actuelles

Le MCP peut reconnaître la session technique, l’outil, le serveur, la branche et l’intention, mais ne garantit pas seul l’identité humaine réelle derrière chaque client.

## Règle de coordination

Toute action structurante doit documenter :

Date :
Acteur :
Outil :
Serveur :
Projet :
Branche :
Objectif :
Risque :
Sauvegarde :
Tests :
Résultat :
Point de reprise :

## À améliorer ensuite

- étendre additivement `.mcp/identity-policy.json` lorsque de nouveaux bindings contextuels sont approuvés ;
- relier GitHub user à rôle projet ;
- relier agent IA à permissions ;
- ajouter une matrice d’approbation ;
- produire un audit log structuré exploitable.

L'ancienne instruction de créer `.mcp/identity-registry.json` est explicitement
supersédée. Ce fichier ne doit pas être créé : il doublerait les autorités déjà
présentes et confondrait politique de sélection, connexions configurées et preuve
GitHub live.

## Résolution GitHub B1 — SLOT-06

La résolution GitHub conserve cinq notions distinctes :

| Notion | Autorité | Effet |
|---|---|---|
| Principal OAuth | authentification vérifiée puis `ConnectionContext` | input de corrélation uniquement |
| Binding contextuel | `.mcp/identity-policy.json` | règle versionnée `IDENTITY_ONLY` |
| Connexion GitHub configurée | `data/github-accounts.json` et mécanismes durables existants | sélection d'une connexion existante |
| Credential | secret storage `/app/secrets/*` | utilisé par la couche de connexion, jamais projeté |
| Principal GitHub | réponse live `GET /user` | preuve de l'utilisateur authentifié |
| Contexte organisationnel | compte organisation accessible observé séparément | contexte accessible, jamais login authentifié |
| GitHub Identity | `Governed Context` | projection dérivée, non persistante |

Le binding actuellement approuvé relie `oauth:wealthtech-mcp-admin` au compte
utilisateur `Patricked-code` uniquement lorsque le `ConnectionContext` prouve le
repository `Patricked-code/MCP`. Il n'est ni global, ni exclusif, ni irréversible ;
un futur binding peut viser une autre connexion ou un autre repository sans
modifier celui-ci. Zéro correspondance produit `NONE`, plusieurs correspondances
produisent `AMBIGUOUS`, et une preuve absente, périmée ou contradictoire produit
`UNVERIFIED`. Un contexte de compte configuré mais non vérifié produit également
`UNVERIFIED` avec `GITHUB_IDENTITY_ACCOUNT_CONTEXT_UNVERIFIED` et ne peut jamais
devenir le `selectedAccountContext`. Aucun de ces états n'accorde une permission.

`Human Identity`, `Agent Role`, résolution repository B2 et Effective Capabilities
SLOT-11 restent hors de B1. GitRegistry V2 conserve exclusivement les mappings
repository ↔ projet ↔ serveur ↔ domaine.

## Identité de déploiement GitHub S1

Identité cible : `S1_MCP_GITHUB_DEPLOY_READ_ONLY`.

```text
Type             : GitHub deploy key SSH
Dépôt            : Patricked-code/MCP uniquement
Usage            : fetch de refs/heads/main
Contents read    : oui
Contents write   : non
Push             : interdit côté GitHub et neutralisé côté Git
Alias SSH        : github.com-mcp-patricked-ro
Push URL locale  : disabled://mcp-s1-read-only
Secret           : clé privée locale S1, jamais lisible par le MCP ni versionnée
```

Le fingerprint public, la date de création, la date de rotation et l'identifiant
GitHub de la deploy key doivent être consignés sans inclure la clé privée.

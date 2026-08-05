# Diagnostic d’autorisation GitHub pour les Pull Requests

Date : 2026-08-05

Statut : procédure en lecture seule. Aucun merge, déploiement, redémarrage ou changement de secret n’est autorisé par ce document.

## Objectif

Diagnostiquer un échec GitHub `401`, `403 FORBIDDEN` ou `404` lors de la lecture d’un dépôt ou de ses pull requests, sans déduire à tort qu’une PR est absente, invalide ou non fusionnable.

Le diagnostic vérifie successivement :

1. l’authentification du credential GitHub utilisé par le serveur MCP ;
2. la visibilité du dépôt ciblé ;
3. la capacité à lister les pull requests ;
4. facultativement, la capacité à lire une pull request précise.

## Outil MCP

```text
github_pr_authorization_diagnostic
```

Arguments :

```json
{
  "owner": "Patricked-code",
  "repo": "MCP",
  "pullRequestNumber": 20
}
```

`pullRequestNumber` est facultatif. L’outil n’exécute que des requêtes HTTP `GET` vers l’API GitHub.

## Résultats possibles

- `none` : toutes les lectures testées fonctionnent ;
- `token_missing` : aucun credential GitHub n’est monté dans le runtime MCP ;
- `authentication_failed` : GitHub refuse l’authentification ;
- `token_expired_or_revoked` : credential expiré, révoqué ou invalide ;
- `repository_not_visible_or_not_selected` : dépôt absent de la sélection GitHub App ou non visible par le compte ;
- `pull_request_permission_missing` : permission `Pull requests: Read` absente ou accès PR refusé ;
- `resource_not_accessible_by_integration` : ressource non autorisée pour l’installation GitHub App ;
- `sso_authorization_required` : autorisation SSO/SAML requise ;
- `rate_limited` : limite API GitHub atteinte ;
- `insufficient_repository_role` : rôle insuffisant ;
- `forbidden` : interdiction générique nécessitant une vérification de la sélection, des permissions et du SSO ;
- `network_error` : échec réseau avant réponse GitHub.

## Informations retournées

Pour chaque probe, l’outil peut retourner :

- le statut HTTP ;
- la catégorie d’échec ;
- le message public de GitHub, borné à 500 caractères ;
- `X-GitHub-Request-Id` ;
- `X-Accepted-GitHub-Permissions` lorsqu’il est fourni ;
- les scopes OAuth lorsqu’ils sont exposés par GitHub ;
- l’expiration communiquée par GitHub.

L’outil ne retourne jamais :

- le token ;
- l’en-tête `Authorization` ;
- un fichier secret ;
- un corps brut non borné ;
- une valeur `.env`.

## Limite importante

Ce diagnostic teste le credential GitHub monté dans le **serveur MCP WealthTech**. Il ne peut pas lire le token interne du connecteur GitHub natif de ChatGPT.

Par conséquent :

- si le diagnostic MCP réussit mais que le connecteur GitHub ChatGPT renvoie encore `FORBIDDEN`, il faut réautoriser ou reconfigurer l’installation depuis les paramètres GitHub/ChatGPT ;
- si les deux échouent de la même manière, les résultats MCP fournissent une preuve plus précise sur la permission ou la visibilité manquante ;
- aucun verdict sur le contenu, l’état ou la qualité d’une PR ne doit être déduit d’un échec d’autorisation.

## Procédure de correction

### Dépôt non visible ou non sélectionné

1. ouvrir les paramètres de l’installation GitHub App ;
2. vérifier que le dépôt ciblé est inclus ;
3. enregistrer la sélection ;
4. relancer le diagnostic.

### Permission PR absente

1. vérifier que l’installation demande `Pull requests: Read` ;
2. approuver toute mise à jour de permissions en attente ;
3. conserver le principe du moindre privilège ;
4. relancer le diagnostic.

### Credential expiré ou révoqué

1. renouveler ou réautoriser le credential hors de Git ;
2. monter le secret dans le runtime par le mécanisme prévu ;
3. ne jamais copier le credential dans une PR, un issue, un log ou un fichier Markdown ;
4. relancer le diagnostic.

### SSO/SAML

1. autoriser le credential auprès de l’organisation ;
2. confirmer que le dépôt est visible ;
3. relancer les probes dépôt et PR.

## Critères d’acceptation

Pour `Patricked-code/MCP`, le diagnostic est sain lorsque :

```text
authenticated_user: HTTP 200
repository: HTTP 200
pull_request_list: HTTP 200
pull_request: HTTP 200, lorsqu’un numéro valide est fourni
primary_failure: none
ok: true
```

Une liste de commentaires ou de reviews vide n’est pas une erreur d’autorisation. Seul le statut HTTP et la catégorie de probe permettent de conclure.

## Interdictions

- aucun push direct sur `main` ;
- aucun secret dans Git ;
- aucun élargissement de permission sans nécessité ;
- aucun redémarrage de production pour corriger le connecteur GitHub natif de ChatGPT ;
- aucun `reset`, `clean`, `stash`, `rebase` ou suppression du working tree S1 ;
- aucun merge ou déploiement automatique après le diagnostic.

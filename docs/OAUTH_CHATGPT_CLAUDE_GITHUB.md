# Documentation publique — OAuth, ChatGPT, Claude, GitHub et MCP WealthTech

Date de génération : 2026-07-01 01:43:52 UTC

Ce document ne contient aucun secret complet.

---

## Mise à jour public-safe 2026-07-11

Cette page a été générée le 2026-07-01 et contient des éléments historiques. L'état vérifié le 2026-07-11 est différent : le MCP expose maintenant un OAuth minimal compatible Authorization Code + PKCE. Les endpoints publics `/.well-known/oauth-protected-resource`, `/.well-known/oauth-authorization-server`, `/oauth/authorize` et `/oauth/token` sont actifs. Le chemin `/mcp` reste protégé et retourne `401 Unauthorized` sans token.

Les sections ci-dessous doivent donc être lues comme historique ou comme cadrage initial lorsqu'elles disent que OAuth n'est pas encore implémenté.

## 1. État actuel du MCP

| Élément | Valeur |
|---|---|
| Nom MCP | wealthtech_ssh_bridge |
| URL MCP | https://mcp.wealthtechinnovations.com/mcp |
| Healthcheck | https://mcp.wealthtechinnovations.com/health |
| Auth actuelle | Bearer token statique |
| OAuth minimal | Actif au 2026-07-11, compatible Authorization Code + PKCE |
| Mode courant | read-only-first |

Le serveur fonctionne aujourd’hui avec un token statique dans le header :

```text
Authorization: Bearer <MCP_AUTH_TOKEN>
```

Cette méthode est suffisante pour certains clients MCP qui permettent de configurer manuellement des headers HTTP. En revanche, l’écran OAuth avancé de ChatGPT exige un vrai flux OAuth si l’on veut utiliser l’authentification OAuth native.

---

## 2. Interprétation des paramètres OAuth ChatGPT

### Méthode d’enregistrement

Pour l’état actuel :

```text
Non applicable, car le serveur MCP ne fournit pas encore de serveur OAuth.
```

Pour l’état futur recommandé :

```text
Client OAuth défini par l’utilisateur
```

### URL de rappel

La valeur est fournie par ChatGPT, par exemple :

```text
https://chatgpt.com/connector/oauth/<callback_id>
```

Cette URL devra être ajoutée dans la liste des redirect URIs autorisées du serveur OAuth.

### ID client OAuth

À créer lorsque OAuth sera implémenté :

```text
chatgpt_wealthtech_mcp
```

### Secret client OAuth

À générer sur S1 lorsque OAuth sera implémenté. Ne jamais publier.

### Méthode d’authentification de l’endpoint token

Valeur recommandée pour une première version simple :

```text
client_secret_post
```

### Périmètres par défaut

Pour la version read-only :

```text
mcp:read
```

Pour une future version avec actions contrôlées :

```text
mcp:read
mcp:write
```

Pour une future version administration, à ne pas activer au départ :

```text
mcp:admin
```

### Périmètres de base

Première version recommandée :

```text
mcp:read
```

---

## 3. Endpoints OAuth futurs à implémenter

Ces endpoints sont actifs dans l’état vérifié au 2026-07-11 pour la couche OAuth minimale. Les extensions futures doivent rester compatibles avec cet existant.

| Champ ChatGPT | Valeur future |
|---|---|
| URL d’autorisation | https://mcp.wealthtechinnovations.com/oauth/authorize |
| URL jeton | https://mcp.wealthtechinnovations.com/oauth/token |
| URL d’enregistrement DCR | vide au départ |
| Base serveur d’autorisation | https://mcp.wealthtechinnovations.com |
| Ressource | https://mcp.wealthtechinnovations.com |
| Protected resource metadata | https://mcp.wealthtechinnovations.com/.well-known/oauth-protected-resource |
| OAuth metadata | https://mcp.wealthtechinnovations.com/.well-known/oauth-authorization-server |

---

## 4. OIDC

Pour la première version OAuth :

| Champ | Valeur |
|---|---|
| OIDC activé | Non |
| URL configuration OIDC | vide |
| Endpoint userinfo | vide |
| Scopes OIDC | vide |

OIDC ne sera utile que si l’on veut que ChatGPT récupère l’identité utilisateur, par exemple email ou profil.

---

## 5. Valeurs exactes à saisir si OAuth est ajouté au serveur

```text
Méthode d’enregistrement :
Client OAuth défini par l’utilisateur

URL de rappel :
copier celle affichée par ChatGPT

ID client OAuth :
chatgpt_wealthtech_mcp

Secret client OAuth :
secret généré sur S1

Méthode endpoint token :
client_secret_post

Périmètres par défaut :
mcp:read

Périmètres de base :
mcp:read

URL d’autorisation :
https://mcp.wealthtechinnovations.com/oauth/authorize

URL jeton :
https://mcp.wealthtechinnovations.com/oauth/token

URL d’enregistrement :
laisser vide si DCR non implémenté

Base serveur d’autorisation :
https://mcp.wealthtechinnovations.com

Ressource :
https://mcp.wealthtechinnovations.com

OIDC :
désactivé au départ
```

---

## 6. Valeurs à ne pas utiliser

Ne pas laisser :

```text
https://example.com
urn:example:resource
```

Ces valeurs sont des exemples. Si elles restent dans ChatGPT, l’authentification échouera.

---

## 7. Choix recommandé pour WealthTech

### Court terme

Garder le MCP en Bearer token statique pour les clients qui acceptent les headers personnalisés.

### Moyen terme

Ajouter OAuth 2.1 au MCP avec :

- endpoint authorization ;
- endpoint token ;
- metadata OAuth ;
- protected resource metadata ;
- scopes ;
- validation des tokens ;
- mapping scopes vers outils MCP.

### Long terme

Ajouter OIDC et gestion utilisateurs si plusieurs administrateurs ou utilisateurs doivent se connecter avec identité individuelle.

---

## 8. Mapping recommandé des scopes

| Scope | Usage | Outils autorisés |
|---|---|---|
| mcp:read | Lecture seule | ping, get_project_context, check_disk, pm2_status, docker_status, list_domains, list_backups |
| mcp:write | Actions contrôlées | update_docs, write_suivi, rsync_dry_run |
| mcp:admin | Actions sensibles | suppressions, restart, migration appliquée |

Le scope `mcp:admin` ne doit pas être activé tant que les garde-fous de confirmation ne sont pas codés.

---

## 9. GitHub — permissions associées

### Accès lecture seule GitHub

Utiliser un fine-grained token limité au dépôt :

```text
Patricked-code/MCP
```

Permissions :

```text
Contents: Read-only
Metadata: Read-only
```

### Accès lecture + modification GitHub

Permissions :

```text
Contents: Read and write
Pull requests: Read and write
Issues: Read and write optionnel
Workflows: Write seulement si GitHub Actions doit être modifié
```

Ne jamais stocker le token GitHub dans GitHub ni dans un fichier public.


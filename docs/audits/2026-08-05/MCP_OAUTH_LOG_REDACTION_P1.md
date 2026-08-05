# P1 — Redaction des logs OAuth MCP

Date : 2026-08-05
Branche : `mcp/oauth-log-redaction-20260805`
Base : `main@26452abda77e7f29ed27ac2f4d7f52d3daa88895`

## Constat

L’attestation S1 de l’issue #29 a montré que le runtime journalise le `clientId` OAuth complet, y compris une éventuelle query string. Le code canonique contient également un appel `logger.info({ clientId, scope, resource }, ...)` lors de l’émission d’un code OAuth.

## Correction

La politique de redaction Pino masque désormais globalement :

- `clientId` et les occurrences imbriquées ;
- `client_id` et les occurrences imbriquées ;
- `req.query.client_id` ;
- `req.url` ;
- `req.originalUrl` ;
- les chemins de secrets déjà protégés avant cette PR.

Le protocole OAuth, PKCE, les tokens, les scopes et les réponses HTTP ne sont pas modifiés.

## Test

`tests/oauthLogRedaction.test.ts` construit un logger Pino réel, écrit un événement contenant :

- un client ID URL avec query string ;
- un `state` sensible ;
- des formes camelCase et snake_case ;
- `req.url`, `req.originalUrl` et `req.query.client_id`.

Le test exige que chaque champ soit remplacé par `[REDACTED]` et que les valeurs sensibles soient absentes du JSON final.

## Limites

Cette PR corrige `main` mais ne modifie pas le runtime S1 actif. Son déploiement reste bloqué par le verdict NO-GO de l’issue #29 et devra suivre le worktree isolé, les tests, le rollback et la validation humaine.

## Garanties

- aucun changement S1 ou S2 ;
- aucun build ou restart de production ;
- aucun déploiement ;
- aucun changement de registre, remote ou Docker ;
- aucune valeur de credential ajoutée au dépôt.

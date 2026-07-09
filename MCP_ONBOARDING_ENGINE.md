# MCP_ONBOARDING_ENGINE.md

## Rôle
Décrire le moteur d’onboarding MCP pour intégrer un dépôt, un agent, un compte ou un serveur.

## Procédure
1. Identifier owner/repo.
2. Vérifier branche officielle.
3. Vérifier README, SUIVI, .mcp et fichiers MCP.
4. Vérifier droits GitHub et agents.
5. Vérifier mapping serveur.
6. Créer une branche ou PR si nécessaire.
7. Documenter l’onboarding dans SUIVI.md.

## Règle
Aucun onboarding ne doit créer de secret dans Git ni donner de droits implicites.

---

<!-- MCP-SAFE-BOOTSTRAP:NO-REGRESSION -->

## Gouvernance permanente MCP — sans régression

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble.

Règles permanentes :

- conserver l’existant ;
- compléter sans écraser ;
- créer uniquement les fichiers manquants ;
- ne jamais écrire de secret, token, mot de passe, clé privée ou variable sensible ;
- travailler sans régression ;
- chercher l’amélioration continue ;
- documenter toute modification dans `SUIVI.md` ;
- inscrire `À vérifier` lorsque l’information n’est pas confirmée.

Références :

- dépôt : `Patricked-code/MCP` ;
- branche officielle : `main` ;
- serveur : `/opt/apps/wealthtech-mcp-ssh-bridge` ;
- domaine : `https://mcp.wealthtechinnovations.com`.

Ajout vérifié le 2026-07-09T18:47:20Z.

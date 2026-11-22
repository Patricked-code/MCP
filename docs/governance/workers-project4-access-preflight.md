# WORKERS / GitHub Project n°4 — Diagnostic MCP en lecture seule

## Finalité et autorité
- Cible unique : GitHub Projects moderne, propriétaire **personnel** `Patricked-code`, n° **4**.
- Contrainte : ne pas confondre GitHub Project V2 avec le `GithubProjectResolution` applicatif de GitRegistry.
- Priorité projet WORKERS : **mémoire canonique** (sources originales privées et index public contrôlé), pas création automatique de code/agents.
- Cette tranche ajoute seulement un outil de lecture, sans modifier les permissions, sans créer de token, sans accès aux contenus privés.

## Outil MCP
`github_project_access_preflight` appelle `githubJsonRequestWithServerCredential('/graphql', ...)`, qui réutilise le jeton serveur existant et les restrictions réseau GitHub du MCP.

La requête GraphQL fixe l'owner, le numéro et vérifie :
- `viewer.login` = `Patricked-code` ;
- `user.projectV2(number:4)` est effectivement résolu ;
- `public = true`, numéro 4, URL correspondante ;
- `viewerCanUpdate` (indicateur seulement, **pas une autorisation d'écriture**).

Sortie : code de résultat borné, URL, titre, ID GraphQL et indicateur de mise à jour. Jamais de jeton, de réponse brute ni de message d'erreur GraphQL.

## États et conditions de reprise
- `READ_ACCESS_VERIFIED` : l'identité et la lecture sont confirmées, **pas** la permission d'écriture.
- `GITHUB_REQUEST_UNAVAILABLE` : disponibilité ou auth non prouvée, aucun droit présumé.
- `GITHUB_GRAPHQL_REJECTED` : requête refusée ; vérifier la portée du token, ne jamais la modifier automatiquement.
- `GITHUB_PRINCIPAL_MISMATCH` : mauvais compte, arrêt.
- `PROJECT_UNAVAILABLE_OR_UNAUTHORIZED` : absence ou interdiction indiscernables, aucun projet à créer.
- `PROJECT_IDENTITY_MISMATCH` : owner, URL, numéro ou visibilité inattendus, arrêt.

## Gouvernance
1. Exécuter les tests locaux de l'outil, puis la CI complète sur la PR.
2. Faire examiner l'ajout dans le catalogue MCP et la cartographie des fonctions ; la PR reste **Draft**.
3. Ne fusionner ni déployer sans accord explicite et procédure Governed Deploy MCP existante.
4. Après déploiement et attestation S1/main/runtime, appeler l'outil et enregistrer le résultat sans secrets.
5. En cas de réussite seulement, préparer l'adaptateur **d'écriture documentaire gouvernée**, distinct de la lecture et des droits repository.
6. Maintenir `Patricked-code/4` comme cockpit **public** et ne jamais y copier automatiquement les conversations originales.

## API officielle
https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects

# WORKERS / GitHub Project n°4 — Diagnostic MCP en lecture seule

## Finalité et autorité
- Cible unique : GitHub Projects moderne, propriétaire **personnel** `Patricked-code`, n° **4** ; visibilité observée mais jamais modifiée.
- Contrainte : ne pas confondre GitHub Project V2 avec le `GithubProjectResolution` applicatif de GitRegistry.
- Priorité projet WORKERS : **mémoire canonique** (sources originales privées et index public contrôlé), pas création automatique de code/agents.
- Cette tranche ajoute seulement un outil de lecture, sans modifier les permissions, sans créer de token, sans accès aux contenus privés.

## Outil MCP
`github_project_access_preflight` appelle `githubJsonRequestWithServerCredential('/graphql', ...)`, qui réutilise le jeton serveur existant et les restrictions réseau GitHub du MCP.

La requête GraphQL fixe l'owner, le numéro et vérifie :
- `viewer.login` = `Patricked-code` ;
- `user.projectV2(number:4)` est effectivement résolu ;
- `public` est un booléen attesté (`true` ou `false`), numéro 4 et URL correspondante ;
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

## Correctif candidat de credential personnel Projects (2026-11-22)

**Constat vérifié :** le propriétaire confirme qu'il ouvre personnellement
`https://github.com/users/Patricked-code/projects/4/` dans son navigateur.
Le jeton serveur existant authentifie `Patricked-code` et lit les dépôts,
mais la requête GraphQL `user.projectV2(number:4)` retourne `null` sans erreur.
Le type exact du jeton existant n'est pas encore attesté.

**Limitation officielle :** GitHub ne prend pas en charge les Projects
appartenant à un utilisateur avec les personal access tokens fine-grained.
Pour la lecture de Projects V2 personnels, GitHub documente le scope minimal
`read:project` d'un **personal access token (classic)**.
Voir https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
et https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects

**Patch sans régression (branche uniquement tant que la revue n'est pas terminée) :**
- La lecture GitHub Projects utilise en priorité, *si présent et sûr*, le fichier
  `/app/secrets/github_personal_projects_token`.
- Ce fichier est distinct de `/app/secrets/github_token` et ne doit jamais remplacer
  le jeton des dépôts, GitRegistry, CUG ou Governed Deploy.
- Précondition de sécurité : fichier ordinaire, non symlink, sans droits pour
  groupe et autres (par exemple 0600). En présence d'un fichier non conforme,
  la lecture échoue fermée ; le jeton des dépôts n'est pas utilisé à sa place.
- En absence de ce nouveau fichier, le comportement historique reste inchangé.
- Les requêtes restent limitées à `POST /graphql` et à des opérations
  de **lecture uniquement**. Aucun jeton, en-tête Authorization ou erreur
  brute GitHub n'est renvoyé.
- La réponse `public=false` est acceptée **en lecture** : la visibilité du
  Project n'est jamais modifiée automatiquement. Toute publication reste
  interdite sans admission, approbation et contrôle des données privées.

**Activation gouvernée (non réalisée par ce patch) :**
1. Créer ou sélectionner hors ChatGPT un PAT classique de lecture avec le seul
   scope `read:project` sous le compte `Patricked-code`, avec expiration
   et politique de rotation définies. Ne communiquer le jeton dans aucun chat,
   document, issue, commentaire ou PR.
2. Provisionner le secret via la gestion sécurisée existante de S1, en
   conservant le chemin et les droits attendus *dans le conteneur*. Vérifier
   le montage et les permissions sans afficher le contenu.
3. CI, revue indépendante, accord explicite du propriétaire, fusion gouvernée,
   Governed Deploy MCP existant et attestation des SHA, avant tout test de production.
4. Relancer `github_project_access_preflight` puis
   `github_project_v2_inventory`; comparer l'URL, le numéro, l'identité,
   le Node ID et la visibilité observée, sans mutation.
5. En cas d'échec : conserver le résultat en preuve, ne pas promouvoir les
   fonctions d'écriture, ne pas élargir les permissions à l'aveugle.


## Découverte universelle des Projects du propriétaire (extension candidate PR #450)

Nouvelle famille de **quatre outils MCP read-only**, sans nouveau serveur,
sans répertoire canonique concurrent ni registre des tâches supplémentaire :

| Outil | Entrée | Sortie | Limite |
|---|---|---|---|
| `github_projects_discover` | compte connu, pageSize, after | une page des Projects et cursor | max 100 éléments/page |
| `github_projects_inventory` | compte connu, maxPages | liste paginée + preuve complete/partial | max 20 pages |
| `github_project_inspect` | compte connu, numéro | identité, champs, vues, compteurs | 50 champs/vues; statut partiel possible |
| `github_projects_reconcile` | compte connu, maxPages | candidats de jointure avec GitRegistry | preview uniquement |

**Owners autorisés lors de cette tranche :** deux comptes personnels
`Patricked-code`, `Wealthtechinnovations` et l'organisation
`chainsolutions-wealthtech`, conformément aux identités déclarées dans MCP.
La découverte respecte les projets accessibles au credential authentifié ;
la complétude prouve seulement l'exhaustivité *de la visibilité de ce credential*,
pas l'existence ou l'absence de projets privés hors de son périmètre.

**API officielles :**
- User : `user(login) { projectsV2(first, after) }`.
- Organisation : `organization(login) { projectsV2(first, after) }`.
- Inspection : `projectV2(number)` avec variables validées, sans interpolation.
- Pagination par `pageInfo.hasNextPage/endCursor`, contrôle des doublons,
  du compte, de l'URL et du total ; arrêt borné explicite si le résultat est partiel.

**Gouvernance :** la réconciliation retourne uniquement des candidats et
`requiresExistingGitRegistryJoin=true`. Aucun enregistrement
GitRegistry, chantier, Issue ou GitHub Project n'est créé. Les originaux des
conversations WORKERS restent privés ; visibilité GitHub Project préservée.
Le mécanisme de credential distinct dans cette même PR reste la condition
d'accès API et nécessite une activation sécurisée et une autorisation de fusion/déploiement.

## API officielle
https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-api-to-manage-projects

## Composition des capacités GitHub Projects (extension du même périmètre)

Les quatre outils additionnels sont exposés depuis le catalogue de lecture MCP existant,
sans créer de second serveur, de Task Queue, de registre d'autorité ou de pipeline de déploiement :

| Outil | Contrat | Autorité |
| --- | --- | --- |
| `github_project_v2_workflow_catalogue` | Liste statutaire des workflows implémentés et des gaps | Gouvernance MCP existante |
| `github_project_v2_inventory` | Lecture GraphQL bornée (50 champs, 50 vues, compteur d'items) | GitHub Project personnel n°4 |
| `github_project_v2_workflow_preflight` | Vérifie un workflow (accès, identité, pagination, conditions) sans mutation | Identité et client GitHub MCP existants |
| `github_project_v2_workflow_run_readonly` | Composition séquentielle de contrôles de lecture | Contrats MCP, GitHub GraphQL |

Workflows **exécutables en lecture seule** :
`ACCESS_PREFLIGHT`, `PROJECT_INVENTORY`, `CANONICAL_MEMORY_PREVIEW`,
`PROJECT_RECONCILE_PREVIEW`.

Workflows **déclarés mais bloqués** :
`CANONICAL_MEMORY_INGEST` (sources conversationnelles originales non collectées),
`PROJECT_BOOTSTRAP_APPLY` et `PROJECT_SYNC_APPLY` (absence d'adaptateur d'écriture gouverné),
`PROJECT_GOVERNED_DEPLOY` (réutiliser le pipeline existant, aucun second déploiement).

La liste candidate des champs/vues est **une projection publique minimale de comparaison**.
Aucun champ, vue, draft issue, texte de conversation ou enregistrement privé n'est créé
par ces outils. Les sorties sont des preuves de lecture courantes : non persistées,
elles ne constituent pas un registre canonique de mémoire et ne certifient pas les permissions de mutation.

Si l'identité GitHub ne correspond pas exactement à `Patricked-code`, si l'ID/URL/visibilité
ne concordent pas, si la pagination indique une lecture partielle ou si GitHub GraphQL
répond avec une erreur, l'orchestration échoue **fermée**, sans tentative d'écriture.
Les messages d'erreur GraphQL bruts et les jetons ne sont jamais restitués.

## Contrôle de non-régression et déploiement

- Les nouvelles fonctions sont enregistrées sous surface `read`, via `registerReadOnlyTools`.
- Le contrat de catalogue `.mcp/function-cartography.json` est mis à jour avec les outils et digests.
- Les tests simulent les réponses GitHub, dont erreurs GraphQL, identité étrangère, pagination et absence de mutation.
- La CI doit passer intégralement, sur le SHA exact de PR.
- Le déploiement utilise exclusivement `.github/workflows/mcp-deploy.yml`, avec attestation S1 et runtime.
- La mémoire canonique WORKERS (sources privées) reste la première priorité métier.

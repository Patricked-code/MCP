# E2 — Protocole opérationnel de réconciliation et de continuité du MCP

**Profil préexistant :** `EXTERNAL_GOVERNED_RECOVERY`.
**Autorité :** choix explicite du propriétaire ; GitHub-first ; CI/revue/fusion/déploiement gouvernés déjà existants.
**Ancrage du pilote :** [issue #359](https://github.com/Patricked-code/MCP/issues/359), [PR #360](https://github.com/Patricked-code/MCP/pull/360), `MCP-PILOT-E2-01-CONT-20261030-ROOT-01`.
**Continuation additive :** [PR #365](https://github.com/Patricked-code/MCP/pull/365).
**Périmètre :** le dépôt du **MCP lui-même** et son runtime S1, pas les déploiements d'applications tierces. Ne pas confondre avec les lots « GD-U E2 » du programme de capacités universelles.

## Séquence contractuelle, dans cet ordre

| Porte | Entrée obligatoire | Lecture / décision | Sortie attendue |
| --- | --- | --- | --- |
| E2-00 | Mandat explicite du propriétaire | Sélectionner `EXTERNAL_GOVERNED_RECOVERY`, sans repli implicite | Profil identifié, aucune tâche créée |
| E2-01 | Accès GitHub et MCP en lecture | Observer **d'abord S1** : dépôt local, fichiers modifiés, contenu sécurisé, runtime et conteneur ; puis GitHub `main` et les divergences, documentation, fraîcheur et provenances | Réconciliation horodatée, `ALIGNED`/`DIVERGED`/`UNVERIFIED` et bloqueurs |
| E2-02 | Résultat E2-01 | Découvrir issues, PR, commits, checkpoints, Continuity IDs déjà ouverts ; détecter doublons et travaux simultanés | Liste vérifiée et traçable de continuités ; lacunes explicites |
| E2-03 | E2-01 et E2-02 terminées | Demander **« Continuer un chantier MCP existant ? Oui/non ? »** ; si oui, identifier précisément le chantier | Choix explicite et enregistré |
| E2-04-R | « Oui » | Réutiliser issue, PR, branche, Continuity ID, instructions, preuves, décisions et NEXT_ACTION ; réconcilier HEAD et collisions | `RESUME_EXISTING`, jamais nouveau chantier |
| E2-04-N | « Non » | Recevoir le nouveau mandat, rechercher préalablement les doublons, faire valider l'absence de collision | `REVIEW_NEW_WORK_FOR_DUPLICATES` ; **pas** de création automatique |
| E2-05 | Reprise vérifiée ou nouveau mandat validé | Suivre le développement commun : branche isolée, tests, exact-head CI, revue de sécurité, merge protégé, Governed Deploy quand autorisé | Preuves des mêmes contrôles que l'entrée E1 |
| E2-06 | Chaque transition matérialisée dans GitHub | Publier un checkpoint append-only lié à l'issue canonique : acteur, source des instructions, étapes, SHA, PR, statut, NEXT_ACTION | Historique récupérable par Continuity ID |
| E2-07 | Nouvelle session ou agent | **Relancer E2-01** puis récupérer E2-02 et l'historique de la continuité sélectionnée ; vérifier l'état courant avant toute écriture | Reprise déterministe ou blocage explicite |

### Sources et frontières d'autorité

Réutiliser exclusivement les outils et autorités déjà présents :
- GitHub : observation de `main`, PR, reviews, CI, issues et commentaires ; conserver tous les liens et SHA.
- MCP : `ping`, `mcp_reconcile_governed_context`, `mcp_get_current_state_inventory`, `mcp_git_status_s1`, Live State (dont `mcp_reconcile_live_state`) lorsqu'il est accessible.
- `src/liveState/types.ts` reste le contrat de données de la réconciliation ; les projections E2 n'en créent pas de copie concurrente.
- `src/governedContext/githubFirstOperationalContinuity.ts` reste le point d'entrée du **profil E2 existant** et les mécanismes GitHub-first existants sont conservés.
- `src/governance/workEntryTrace.ts` fournit le checkpoint validé structurellement, avec charge machine lisible ajoutée sans supprimer le format humain.
- `src/governance/e2GitHubEvidence.ts` reconstruit une chronologie **non exécutoire** à partir de commentaires GitHub paginés et de leur provenance.
- Les mécanismes E1 Task Queue, session, claim, lock, permissions GitHub/OIDC, CI, revue, déploiement restent indépendants de cette projection. Aucun contenu de checkpoint ne peut les autoriser.

### Politique de divergence

- `main` GitHub, Git S1 et runtime avec SHA différents : `BLOCKED`, diagnostic ciblé ; aucune écriture privilégiée.
- Observation manquante, ancienne ou incomplète : `BLOCKED`, ne pas déclarer l'état sain.
- S1 modifié localement ou documentation courante obsolète **même avec des SHA identiques** : `BLOCKED` pour l'orientation normale E2. Seule la correction gouvernée de la divergence peut avancer (aucune admission GWC préalable), avec sauvegarde, revue, fusion et attestations. La présence d'un commit identique n'est pas une convergence complète.
- Continuity ID absent ou contradictoire : `BLOCKED`, ne pas créer automatiquement une nouvelle continuité.
- Nouveaux travaux : recenser les travaux existants et faire valider un ancrage GitHub avant attribution d'un nouvel ID.
- GitHub issue-comment historique sans charge structurée : marquer `PARTIAL` et utiliser son manifeste canonique de référence, sans fabriquer de champs manquants.
- En cas de changement de HEAD, relancer réconciliation et tests sur la nouvelle révision.

### Preuve de terrain — observation en lecture seule du 31/10/2026

Observation MCP `stateVersion=1176`, `generatedAt=2026-10-31T00:00:14.028Z` ; une deuxième consultation a confirmé le même SHA de code.
`main` GitHub = Git S1 = `origin/main` S1 = runtime S1 =
`1f6961063d27bc85087aab57a8f700fd7729e03f`.
Conteneur `wealthtech_mcp_ssh_bridge` : `running`, `healthy`.
**Écarts observés :** `data/github-accounts.json` localement modifié sur S1 ; documentation déclarant `ba9acd1cb15942f37aba2b9a0a45b267ec50d5b4` (`DOCUMENTATION_DRIFT`). `alignment.global=RECONCILIATION_REQUIRED`.

Ces observations ont une date et ne valent **pas** attestation permanente. Aucune correction S1, aucune fusion `main` et aucun déploiement n'ont été faits dans cette tranche.

### Portée exacte de l'implémentation actuelle

Les bibliothèques et leurs tests matérialisent la décision E2, son intégration additive dans la prévisualisation préexistante et une **lecture** de checkpoints structurés. Elles ne garantissent **pas encore** qu'un nouveau client ChatGPT/Claude déclenche automatiquement cette séquence, que tous les anciens checkpoints sont convertis en données structurées, ni qu'un commentaire GitHub est écrit systématiquement sans action de l'agent. Ces objectifs nécessitent des points d'intégration opérationnels et une démonstration de bout en bout avant déclaration « E2 complet ».

**Porte de fusion :** exact SHA CI verte + revue indépendante + vérification d'absence de collision + tests E1/E2 et preuve de reprise inter-session. Ne pas fusionner une PR en brouillon sur seule réussite des tests unitaires.

### Incident réel de réintégration ascendante S1 → GitHub (31 octobre 2026)

La différence locale `Wealthtechinnovations.type` de `organization_or_user` vers `user` dans `data/github-accounts.json` a été comparée en lecture seule avec le nouveau contenu GitHub. La [PR #366](https://github.com/Patricked-code/MCP/pull/366), approuvée indépendamment par `Wealthtechinnovations`, a été fusionnée par squash le 31/10/2026 dans `main`, SHA `7cbc5496e2a3bd28cf1205d7b659429f61ef6cc6`. La CI de `main` [#41152043914](https://github.com/Patricked-code/MCP/actions/runs/41152043914) a réussi. Le déploiement gouverné [#41152043903](https://github.com/Patricked-code/MCP/actions/runs/41152043903) a échoué : il ne faut **pas** attester S1 comme déployé sur le nouveau SHA. Le prérequis Git S1 dirty a été observé directement avant et après le merge ; le workflow ne donne pas le diagnostic interne exhaustif de l'échec.

#### Capacité de reprise additive, dans cette PR #365

`src/tools/mcpS1ExactContentReconcile.ts` et le nouvel outil `mcp_reconcile_s1_approved_registry_to_main` introduisent une procédure **ciblée sur un unique fichier versionné** déjà strictement identique à celui d'un `main` GitHub approuvé. Elle exige une approbation d'écriture explicite, deux SHA exacts, la branche `main`, le remote GitHub en lecture seule, l'absence de toute autre modification, un fast-forward, la vérification de l'identité du blob, une sauvegarde privée, puis une remise en cohérence de la référence Git et de son index **sans réécrire ni supprimer** `data/github-accounts.json`. Le runtime doit être redéployé et attesté séparément.

L'opération échoue sans mutation du ref si un contrôle préalable échoue ; les tests s'exécutent sur de vrais dépôts Git temporaires sans toucher S1. La procédure **ne remplace pas** `mcp_sync_from_github_s1` ni le pipeline Governed Deploy et ne confère aucune autorisation nouvelle E3 ou GitHub.

**Limitation d'amorçage impérative :** ce nouvel outil GitHub-side ne peut pas être appelé sur le runtime S1 déployé tant qu'une version du MCP le contenant n'a pas elle-même été installée. Comme le déploiement existant refuse actuellement le dépôt S1 dirty, une opération d'administration S1 extérieure et expressément autorisée demeure nécessaire pour la première remise en cohérence. Ne jamais prétendre que l'ajout du code à la PR effectue déjà cette intervention.

## Déclenchement automatique à l'activation de l'Entrée 2 — décision propriétaire

**Une seule action d'entrée :** quand le propriétaire sélectionne explicitement `EXTERNAL_GOVERNED_RECOVERY`, appeler `mcp_e2_activate` **une fois**, sans attendre une demande distincte de réconciliation.

1. L'activation force une nouvelle observation S1/GitHub/runtime/documentation.
2. **Aucune divergence :** retourner `CONTINUE_E2`, puis commencer immédiatement E2-02 (recherche des issues, PR et Continuity IDs existants). Aucun traitement de correction lancé.
3. **Divergence :** l'activation appelle automatiquement le processus `mcp_reconcile_s1_to_main`, avec les mêmes verrous, contrôles de secrets, preuves et limites d'autorisation existants. La suite ordinaire E2 reste bloquée.
4. **Contenu S1 local déjà identique au `main` approuvé :** une autorisation d'écriture préexistante peut permettre la remise en cohérence Git non destructive. Cette étape ne constitue **pas** un déploiement ni une preuve finale d'alignement.
5. **Modification S1 non encore approuvée :** ne jamais pousser directement sur `main` ; le retour `GITHUB_PROPOSAL_REQUIRED` signifie que la proposition GitHub gouvernée reste à préparer et valider. Tant que l'adaptateur automatisé réel de PR n'est pas opérationnel, ne pas annoncer que cette branche est corrigée.
6. **GitHub en avance ou runtime ancien :** utiliser le mécanisme MCP Governed Deploy existant, sans nouvelle voie de déploiement ni promotion non autorisée.
7. **Contrôle final :** après une correction Git réussie, forcer à nouveau l'observation Live State et ne retourner `CONTINUE_E2` que lorsque GitHub main, S1 Git, runtime, worktree et documentation sont tous attestés au même niveau.
8. **Permission insuffisante, collision, écart incomplet ou contenu inconnu :** `RECONCILIATION_BLOCKED` ou `RECONCILIATION_PENDING`. Ne pas demander quel chantier poursuivre, ne pas écraser la modification, conserver un checkpoint.

**Autorité :** une sélection E2 n'accorde pas par elle-même des droits d'écriture. La nouvelle surface `mcp_e2_activate` est classifiée `scoped-write` car elle peut lancer une correction, et exige toujours `ENABLE_WRITE_TOOLS` ainsi que `allow_write=true` pour cette correction. Le contrôle read-only `mcp_e2_reconcile_preflight` reste disponible pour diagnostiquer sans autorisation de mutation. Les outils E1 ne sont pas modifiés.

**Périmètre strict de cette tranche :** une activation explicite E2, pas de minuterie indépendante, pas d'activation automatique E1 ou Governed Deploy Application. L'orchestration fonctionne lorsqu'un client appelle effectivement `mcp_e2_activate` ; l'arrivée d'un message en langage naturel ne déclenche pas à elle seule un tool call en dehors d'une session agent. Avant déploiement de la branche E2, ces outils ne sont pas disponibles sur l'ancien runtime S1.

## Décision de périmètre propriétaire — 31 octobre 2026

**Uniquement l'Entrée 2 pour la tranche actuelle.** La réconciliation multi-fichiers et bidirectionnelle reste limitée à `Patricked-code/MCP` et au runtime MCP S1, et ne démarre **qu'après la sélection explicite du profil `EXTERNAL_GOVERNED_RECOVERY`**. Pas de démon d'exploitation indépendant, pas d'activation par défaut au démarrage, pas d'appel depuis E1 et pas de nouvelle capacité pour Governed Deploy Application.

Au démarrage d'E2, le nouvel outil read-only `mcp_e2_reconcile_preflight` est disponible sans session, claim ou Task Queue GWC. Il force l'observation Live State (S1, puis GitHub), échoue fermement si les commits, le worktree, la documentation, les remotes ou le runtime ne sont pas réconciliés, et **ne passe qu'à la découverte des continuités** lorsque les preuves sont complètes. Il n'autorise aucune écriture.

`mcp_reconcile_s1_to_main` demande lui aussi `entry_profile=EXTERNAL_GOVERNED_RECOVERY` et `e2_explicitly_selected=true` **en plus** de la gouvernance d'écriture normale ; ces paramètres ne constituent pas un consentement ni une autorisation E3. Hors E2, pas de cycle de correction initié par ce mécanisme. Les tests vérifient que E1 et un profil non sélectionné sont refusés avant tout appel des ports d'écriture. Les processus CI et Governed Deploy existants ne sont pas modifiés.

## Capacité cible généralisée : `mcp_reconcile_s1_to_main`

**Mandat propriétaire du 31 octobre 2026 :** ne pas limiter la réconciliation au registre des comptes. Lorsqu'un changement apparaît sur S1, le MCP doit pouvoir le détecter automatiquement, le qualifier, le communiquer à GitHub, l'intégrer par les contrôles existants, puis réattester S1 et `main`. L'entrée E2 ne passe à l'orientation des chantiers qu'après la convergence.

### Contrat de boucle bidirectionnelle

1. **Observer S1 en premier** : `HEAD`, `origin/main`, `git status` (index, worktree, untracked), liste exhaustive de fichiers et commits locaux, révision d'image du conteneur, santé et configuration versionnée.
2. **Observer GitHub** : `main` exact, PR ouvertes, commits, CI, revues, branches de réconciliation existantes, politiques d'accès GitHub App ; éviter de dupliquer les propositions sur deux agents ou deux sessions.
3. **Comparer l'intégralité de l'état pertinent**, pas seulement l'égalité des SHA. Qualifier le changement selon origine, fichiers, secrets, permissions, risques, dépendances, historiques, licences, environnement, documentation. Inventorier les éléments qui ne doivent pas être exportés vers un dépôt Git (credentials, tokens, configurations éphémères, fichiers runtime).
4. **GitHub → S1**, si S1 est propre et en retard : réutiliser le pipeline Governed Deploy, avec exact HEAD et CI, attestation du runtime et rollback existant. Ne pas remplacer `mcp_sync_from_github_s1`.
5. **S1 → GitHub, contenu déjà approuvé** : si la modification locale est octet pour octet identique à un contenu déjà présent sur `main`, l'outil général `mcp_reconcile_s1_to_main` peut effectuer un rattrapage Git du dépôt S1. Il vérifie le fetch remote strictement read-only, le push désactivé, l'ascendance des SHA, la correspondance de tous les fichiers concernés, un verrou partagé avec le déploiement, puis sauvegarde avant modification des métadonnées Git. L'outil ne réécrit pas les fichiers et n'atteste pas le runtime.
6. **S1 → GitHub, contenu non encore approuvé** : préparer automatiquement une branche et une PR GitHub à partir des changements **admissibles** observés, après scan de secrets et contrôle d'autorisation GitHub App. L'accès GitHub du serveur reste à sens unique (fetch) ; le transfert ascendant utilise exclusivement le canal GitHub gouverné. Les modifications sensibles, ambiguës, concurrentes ou destructives sont bloquées avec leurs preuves. La PR entre dans les mêmes CI, revues et protections de `main` que toutes les autres. Ne jamais faire de `git push origin main` depuis S1.
7. **Convergence** : après fusion permise par les protections, sauvegarde et synchronisation Git S1 gouvernée, déploiement/réattestation exact SHA, vérification du worktree propre, de la configuration et de l'historique documentaire courant, puis validation `FULLY_ALIGNED`.
8. **Répétition dans E2 uniquement** : la vérification se répète au début de chaque Entrée 2 explicitement choisie, à la reprise d'une continuité E2 et avant une écriture gouvernée E2. Pas de déclencheur périodique indépendant ni d'activation dans E1 à ce stade. Les corrections préautorisées et vérifiables doivent être idempotentes, bornées et traçables.

### Frontières d'automatisation impératives

- **Sans intervention humaine dans les cas sûrs** ne signifie **pas** supprimer les protections de branche ni simuler une revue humaine. Le système peut automatiser constat, sauvegarde, proposition de PR, tests, vérification et synchronisation autorisée lorsque la politique existante le permet. Si la protection de `main` impose une approbation indépendante, une PR non approuvée doit rester bloquée : aucune auto-approbation fictive.
- `allow_write` reste un garde-fou de l'outil existant. Une future exécution autonome doit utiliser une autorité préconfigurée **explicitement et bornée**, jamais fabriquer `allow_write=true` comme remplacement du contrôle E3/OIDC ou de la gouvernance. Une autorisation qui manque est un état `BLOCKED` explicite.
- Aucun mécanisme E2 ne peut effacer un fichier, écraser un changement divergent, manipuler les secrets hors d'un coffre autorisé, appliquer un `reset --hard`, forcer un push ni redéployer hors du cycle commun.
- L'existence d'une PR approuvée n'atteste jamais que S1 et le runtime sont mis à jour. Le contrôle final doit vérifier `main GitHub = Git S1 = runtime` plus propreté du worktree et cohérence documentaire courante.

### Réalisation actuellement incluse dans la PR #365

`src/governance/mcpS1ToMainPolicy.ts` fournit une décision déterministe pour la détection/qualification des dérives multifiziers ; `src/tools/mcpReconcileS1ToMain.ts` fournit le rattrapage Git **multi-fichiers déjà approuvés sur main**, enregistré comme `mcp_reconcile_s1_to_main` dans `src/tools/selfManagement.ts`. Les tests utilisent des vrais dépôts Git temporaires, et le catalogue scoped et la cartographie des fonctions sont mis à jour.

**Pas encore mis en œuvre ni attesté :** le déclenchement complet du cycle par l'entrée E2 au-delà de la porte read-only (et non un observateur autonome permanent, qui est hors périmètre), la collecte sûre des modifications S1 non publiées vers GitHub, la création automatique de PR par GitHub App, la gouvernance d'auto-merge quand les protections le permettent, la résolution sans intervention de toutes les classes d'écarts, le bootstrap initial S1 dirty et l'attestation runtime après correction. Ces points restent des critères de fermeture de la **même** continuité et non une architecture parallèle. Le logiciel ne doit pas être présenté comme un système de synchronisation bidirectionnelle totalement opérationnel avant ces validations.

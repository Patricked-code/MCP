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
| E2-01 | Accès GitHub et MCP en lecture | Observer exact HEAD de `main`, dépôt S1 `main`/`origin/main`, runtime MCP, état du conteneur, propreté Git, dérive documentaire, fraîcheur de l'observation | Réconciliation horodatée, `ALIGNED`/`DIVERGED`/`UNVERIFIED` et bloqueurs |
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
- S1 modifié localement ou documentation obsolète **avec révisions du code alignées** : conserver des avertissements et imposer une revue avant toute opération privilégiée ; le travail sûr sur une PR isolée reste possible.
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

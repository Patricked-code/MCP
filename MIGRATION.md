# MIGRATION.md

## Rôle
Plan de migration MCP et projets intégrés.

## Règles
- Inventaire avant migration.
- Sauvegarde avant action risquée.
- Aucun secret dans Git.
- Mapping serveur obligatoire.
- Rollback documenté.
- SUIVI.md mis à jour avant et après.

## Projets à rattacher progressivement
brvmchain, wealthtech, evote, evaluations, stablecoin, et tout repo ajouté ensuite.


## 2026-09-20 — Paquet d’intégration de la candidate GWC / PR #95 — Phase F-06

### Statut et frontière

Ce paquet décrit **l’intégration future** de la candidate construite sur `claude/ecstatic-edison-v1dyt1`. Il ne constitue pas une autorisation de fusionner, déployer ou muter S1. Tant que `.mcp/gwc-precode-status.json > phaseF.f06.status` n’est pas `PASS_WITH_EVIDENCE` et que `finalCandidateVerdict` n’est pas `FINAL_PRECODE_VERSION_ACCEPTED`, `main`, S1 et la production restent gelés pour cette candidate.

La source d’intégration est la PR #95 et **son HEAD final attesté par le gate F-06**. L’intégration ne doit jamais repartir d’un SHA intermédiaire mémorisé dans une conversation.

### Identifiants exacts à résoudre au moment de l’intégration

- `CANDIDATE_HEAD` : SHA final enregistré dans la preuve F-06, à confirmer comme HEAD courant de la PR #95.
- `MAIN_BEFORE` : `main` GitHub réobservé immédiatement avant réconciliation.
- `MERGE_SHA` : SHA réellement produit/observé sur GitHub après la fusion autorisée.
- `DEPLOY_SHA` : doit être **exactement `MERGE_SHA`**.
- `RUNTIME_SHA` : révision réellement attestée après déploiement, qui doit converger vers `DEPLOY_SHA`.

Ces rôles sont distincts. Une stratégie de merge peut produire un `MERGE_SHA` différent du HEAD de PR ; aucune égalité n’est inventée.

### Delta attendu de `main`

Le delta autorisé est **le delta complet et revu de la PR #95 après réconciliation avec le `main` alors courant**, calculé depuis GitHub.

Avant fusion : réobserver `MAIN_BEFORE` et `CANDIDATE_HEAD`, recalculer le compare GitHub et la liste des fichiers, confirmer qu’aucun changement attendu n’a disparu et qu’aucun changement étranger n’a été absorbé, confirmer la compatibilité additive/backward-compatible, puis rejouer F-05/F-06 si la réconciliation a modifié la candidate.

Sont interdits : cherry-pick partiel de la candidate, push direct sur `main`, copie manuelle de fichiers sur S1, réécriture d’historique ou suppression d’une partie du delta pour contourner un gate.

### Réconciliation du drift

| Observation | Décision |
| --- | --- |
| `main` inchangé et PR exact-head verte | poursuivre les contrôles exact-head |
| `main` a avancé sans recouvrement sémantique | réconcilier la branche avec le nouveau `main`, revalider le compare puis rejouer au minimum F-05/F-06 |
| changement concurrent dans le même domaine de collision / contrat / fichier sensible | ne pas fusionner ; réconcilier explicitement puis refaire les preuves |
| conflit Git, contradiction d’autorité, évidence stale/UNKNOWN ou ownership concurrent | fail closed ; reobserve/reconcile via l’autorité propriétaire |
| drift S1/runtime avant intégration | ne pas le corriger depuis la branche candidate ; réobserver Live State et utiliser le mécanisme gouverné propriétaire |
| HEAD PR modifié après CI/review | CI/review précédents ne suffisent plus ; refaire les contrôles exact-head |

Toute adaptation réelle retourne sur la branche candidate ; elle n’est jamais introduite silencieusement pendant le merge.

### Procédure d’intégration exacte

1. **INTEGRATE-01 — Reobserve** : GitHub `main`, PR #95/HEAD, checks/rules/review, autorités runtime nécessaires, S1/runtime et Live State.
2. **INTEGRATE-02 — Reconcile drift** : appliquer la matrice ci-dessus ; toute modification de candidate invalide les anciennes preuves exact-head affectées.
3. **INTEGRATE-03 — Revalidate governance** : integration slots, capabilities et, si nécessaires, Governed Task/Session/Bootstrap Receipt/locks sont résolus depuis les autorités live ; PRECODE n’en fabrique aucun.
4. **INTEGRATE-04 — Exact-head review** : CI complète et conditions de review/merge sur le HEAD reconcilié.
5. **INTEGRATE-05 — Merge GitHub** : utiliser uniquement le mécanisme GitHub gouverné autorisé et capturer le `MERGE_SHA` réel.
6. **INTEGRATE-06 — Main CI + deploy** : exiger la CI de `MERGE_SHA`, puis laisser la chaîne gouvernée de `DEPLOYMENT_PRODUCTION.md` déployer ce SHA exact.
7. **INTEGRATE-07 — Terminal verification** : réattester GitHub/S1/runtime/Live State/documentation, produire les preuves terminales et fermer/libérer les éventuelles autorités runtime utilisées.

### Rollback / récupération

- **Avant merge** : suspendre/abandonner ; aucune mutation de production n’a eu lieu.
- **Après merge, avant deploy** : ne jamais réécrire `main` ; toute annulation passe par PR de revert/fix-forward et CI normale.
- **Pendant deploy** : si la validation runtime réelle échoue, restaurer l’image précédente selon `DEPLOYMENT_PRODUCTION.md` ; Git reste inchangé.
- **Après deploy, avant terminalité** : l’état reste non terminal ; réobserver, attester tout rollback runtime et réconcilier explicitement l’écart GitHub/runtime. Un job de déploiement réussi ne suffit jamais à produire `DONE`.
- **Après terminalité** : toute correction ultérieure est une nouvelle évolution gouvernée.

### Attestations live minimales

La clôture requiert des preuves fraîches et liées au même contexte pour : HEAD/PR/checks/review GitHub ; `MERGE_SHA` de `main` ; arbre S1 propre avec fetch read-only/push désactivé ; CI main ; run/job de déploiement ; image ID/révision OCI ; runtime revision ; santé HTTP/OAuth/MCP ; Live State courant sans contradiction ; documentation alignée ; état des locks ; et, lorsqu’une Governed Task/Session est utilisée, Task/session/Bootstrap Receipt/checkpoint cohérents avec la même révision.

### Vérification post-intégration / Definition of Done

L’intégration n’est terminée que si la CI du `MERGE_SHA` est verte, `DEPLOY_SHA = MERGE_SHA`, S1 est propre sur `main`, OCI/runtime/Live State attestent la révision attendue ou bloquent explicitement l’écart, la santé HTTP/OAuth/MCP est conforme, la documentation est `ALIGNED`, aucun lock/session propriétaire orphelin ne subsiste après checkpoint terminal et les preuves Task/session/receipt/state/head/runtime convergent lorsqu’elles existent. Aucune seconde autorité ni aucun bypass exact-head n’est autorisé.

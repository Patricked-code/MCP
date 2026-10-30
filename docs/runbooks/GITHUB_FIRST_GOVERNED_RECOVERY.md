# Runbook — Bifurcation externe gouvernée GitHub-first / OIDC / Non-régression

**Profil sélectionnable :** `EXTERNAL_GOVERNED_RECOVERY` (non activé par défaut).
**Dépôt :** `Patricked-code/MCP`.
**Autorité normative existante :** [`.mcp/github-first-operational-policy.json`](../../.mcp/github-first-operational-policy.json), [`AGENTS.md`](../../AGENTS.md), [`CLAUDE.md`](../../CLAUDE.md) et les contrôles runtime réellement observés.
**Continuity programme concernée :** [issue #349](https://github.com/Patricked-code/MCP/issues/349), [PR #355](https://github.com/Patricked-code/MCP/pull/355), sans créer d'autorité supplémentaire. Les autres mandats réutilisent leur propre issue/PR canonique.
**Nature :** instruction de travail et de reprise, sans permission supplémentaire ni activation automatique de runtime.

## 1. Pourquoi et quand choisir ce profil

En cas de demande explicite du propriétaire ou d'indisponibilité du chemin interne MCP (admission, connexion OAuth, bridge), l'agent peut poursuivre une **opération bornée** via GitHub et les workflows existants, tout en préservant les garde-fous. Le blocage de l'admission interne ne constitue **jamais** une permission d'écrire en production ou de réclamer une tâche. La sélection du profil ne crée ni task, ni session, ni claim, ni lock, ni nouvelle PR, ni dispatcher.

Commande utilisateur : « Sur ce chantier, sélectionne `EXTERNAL_GOVERNED_RECOVERY` et réutilise la bifurcation GitHub-first/OIDC des PR #342 et #345, sans collision, sans régression et sans déploiement hors pipeline gouverné. »

## 2. Précédent historique et limites de preuve

- [PR #342](https://github.com/Patricked-code/MCP/pull/342) : diagnostic et instrumentation de provenance du consentement OAuth ; CI, revue, fusion, déploiement S1 observés historiquement.
- [PR #345](https://github.com/Patricked-code/MCP/pull/345) : correction bornée du consentement `Origin: null` uniquement sous contrôles `same-origin`, ticket signé et session vérifiée ; [CI #39852393052](https://github.com/Patricked-code/MCP/actions/runs/39852393052), [déploiement S1 #39853020819](https://github.com/Patricked-code/MCP/actions/runs/39853020819) historiquement réussis.
- Les numéros **#343 et #344 sont des issues de preuve**, pas des PR : ne jamais parler de « PR #342 à #345 » comme de quatre PR.
- Ces preuves sont historiques : elles ne certifient pas l'HEAD présent, les droits runtime futurs, les autres applications ou la disponibilité actuelle de S1/S2.
- Les cycles RED/GREEN ne sont réputés prouvés que si des tests et runs correspondants existent ; ne pas inventer une preuve RED.

## 3. Choix des transports (ordre de moindre privilège)

1. **`GITHUB_ONLY`** : lecture du dépôt, fichiers, branche dédiée, PR, revue, CI et checkpoint, lorsque l'identité GitHub dispose des droits constatés.
2. **`GITHUB_ACTION_READONLY_EVIDENCE`** : [`mcp-readonly-evidence.yml`](../../.github/workflows/mcp-readonly-evidence.yml) ; `workflow_dispatch` avec cible/probe/request_id autorisés ou issue `MCP_READONLY_EVIDENCE_REQUEST`. Sondes allowlistées, identité contrôlée, sortie sans secrets, OIDC primaire ; fallback SSH protégé uniquement si autorisé par la politique.
3. **`GITHUB_ACTION_BOUNDED_WRITE`** : uniquement un workflow déjà existant, prévu pour l'opération **exacte**, avec identité OIDC/autorité compatible, périmètre et SHA attendus. Le workflow de fast-forward Stablecoin n'est PAS une autorisation universelle de provisioning Plesk.
4. **`RUNTIME_REQUIRED`** : pour Task/Session/Lock, permissions réelles, écriture serveur ou opérations non couvertes par un workflow approuvé ; appliquer les autorités runtime et E3/OAuth. Si indisponibles, `BLOCKED` pour cette étape, sans bloquer les travaux indépendants en lecture/branche.

**Ordre contraignant** : GitHub d'abord ; ne pas exposer le bridge si GitHub ou un fallback approuvé suffit. Une sonde read-only n'accorde jamais d'écriture.

## 4. Protocole opérationnel avant chaque mutation

**INTAKE** : lire `AGENTS.md`, `CLAUDE.md`, `SUIVI.md`, `docs/governance/README.md`, les décisions et checkpoints du chantier. Relever `observedAt`, `mainSha`, `branchSha`, PR/issue canonique, CI/revues, propriétaire/collision domains, état de S1/S2 si nécessaire.

**ANTI-COLLISION** : `RESUME_OWNED_FIRST` uniquement si ownership établi ; sinon périmètre indépendant prouvé. Si une autre session/agent possède la tâche/branche/fichier, ne pas supposer la propriété ; arrêter ou délimiter un fichier nouveau indépendant. Ne jamais forcer un ref mouvant. Utiliser un contrôle d'HEAD attendu/lease pour publier.

**DIAGNOSTIC** : privilégier une preuve en lecture seule, hypothèse testable, tests qui distinguent panne et succès. Ne jamais manipuler les secrets dans les issues/CI/artefacts.

**CODAGE** : branche isolée, changements additifs et ciblés ; ne pas remplacer l'architecture ni les permissions existantes ; construire des tests positifs, négatifs, concurrents et de non-régression selon le risque.

**VALIDATION** : CI `mcp-ci.yml` au **SHA exact** de la PR ; typecheck/build, tests, sécurité, secrets, docs et vérification de diff. Relecture technique documentée ; satisfaire les règles de branche et approbations requises sans inventer de revue indépendante.

**FUSION** : exclusivement si toutes les conditions effectivement requises sont satisfaites. Aucune écriture directe sur `main`, aucun auto-merge en guise d'approbation.

**DEPLOIEMENT** : utiliser [`mcp-deploy.yml`](../../.github/workflows/mcp-deploy.yml) uniquement pour le SHA admissible de `main`. Le chemin automatique `push` requiert sa CI `main` validée sur le SHA même ; le chemin manuel ne supprime pas les contrôles serveur ni l'autorisation opérateur. Ne pas lancer un run manuel pour éluder l'absence de CI. Aucune écriture arbitraire sur S1/S2 ou vhost.

**ATTESTATION** : relever résultat CI/deploy, `SHA GitHub main == SHA S1 == SHA runtime` si exigé et observable ; arbre propre, conteneur healthy, API/OAuth/MCP concerné, symptômes corrigés et tests de compatibilité. Une seule preuve manquante donne `UNKNOWN`/`BLOCKED`, pas `SUCCESS`.

**CHECKPOINT** : inscrire en append-only dans l'issue/PR existante parent, SHA de référence, commit écrit, tests/run IDs, permissions observées, travail réellement exécuté, réserves, anti-collision et **unique** `NEXT_ACTION`. Une notification/commentaire n'est pas un bus d'exécution automatique.

## 5. Invariants d'échec et de sortie

- `HEAD_MOVED -> STOP_WRITE -> REOBSERVE -> RECONCILE -> VERIFY`. Ne jamais `force push` sur une branche active pour récupérer un conflit.
- Si la CI échoue, si la revue exigée manque ou si l'E3/Task/Session/Lock n'est pas prouvé : **pas de fusion ni de production write**. Corriger dans la même continuité admissible et retester.
- Pour S1/S2 : identifier un plan de rollback réel et les préconditions de reprise avant déploiement. Un rollback exécuté doit être explicitement attesté, pas supposé.
- Retour au circuit interne lorsque disponible : rapprocher la source GitHub, l'issue/PR et les autorités runtime ; **ne jamais matérialiser rétroactivement un claim fictif**.
- Pas de Codex/Copilot dans ce mandat ; pas de deuxième MCP, dispatcher Claude, queue, registre ou mémoire canonique.

## 6. Exemple de sélection sur les deux chantiers

- **Provisionnement S1/S2** : [issue #349](https://github.com/Patricked-code/MCP/issues/349), [PR #355](https://github.com/Patricked-code/MCP/pull/355). On peut préparer/tester du code et le plan via GitHub, mais **aucune création Plesk** sans permission et admission runtime réellement démontrées.
- **Persistance OAuth** : [issue #346](https://github.com/Patricked-code/MCP/issues/346), projet indépendant. Avant toute technologie : observer le stockage réellement disponible sur S1 ; puis étudier codes transactionnels TTL/consommation atomique et refresh tokens à rotation/révocation/replay detection. Respecter l'ownership et ne pas glisser OAuth dans #355.

**Critère terminal du profil** : checkpoint et preuves suffisantes pour reprendre à froid par un autre agent, sans perte, sans collision et sans surdéclaration de production.

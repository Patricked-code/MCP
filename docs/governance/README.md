# Gouvernance documentaire MCP

## Point d'entrée commun — INTAKE et reprise à froid (16 octobre 2026)

**Directive de coordination immédiatement disponible : [issue maîtresse #235, commentaire #6203867094](https://github.com/Patricked-code/MCP/issues/235#issuecomment-6203867094).** Elle complète, sans remplacer, les autorités déjà en place et le [protocole d'entrée de AGENTS.md](../../AGENTS.md). Un agent nouvellement connecté reconstruit l'état depuis GitHub, vérifie le HEAD, les PR et la CI/deploy, puis seulement les autorités runtime nécessaires. Ne jamais déduire la présence active d'un agent, son ownership ou ses permissions d'un commentaire ou d'un snapshot.

**Checkpoint confirmé :** PR #300 fusionnée à `cc31ce12bea236b4cfb31d99ecee700c543f0c17` ; CI principale #38812707495 et Governed Deploy #38812707629 `SUCCESS` sur cet SHA. **Travail restant :** PCM-03/GWB-04 sur `TB-W4-H-01` et `TB-W4-K-01` puis autres READY avec acceptation comportementale, F-03/#262 et F-04/#268 par leurs détenteurs, GWB05..09 et acceptation finale. La matrice [gwb04-ready-ownership-20261015.json](gwb04-ready-ownership-20261015.json) est un inventaire de candidats et non une autorité de Task. La date des sondes OIDC #301–#303 rend leurs résultats historiques pour toute mutation ultérieure.

### GWB-04 — Les 18 blueprints READY et les conflits potentiels de reprise (2026-10-15)

[Matrice READY / PR / preuve runtime](gwb04-ready-ownership-20261015.json) : 18 candidats dans l'ordre officiel du Backlog, dont 15 ont des chevauchements possibles avec les PR DRAFT #207, #88, #89, #90 ; trois n'ont pas de candidat PR connu dans cette recherche. Snapshot OIDC #297–#299 : 2 Tasks READY sans propriétaire, 0 Session active, 0 Lock actif. Une PR candidate n'est pas un propriétaire runtime ; un READY planning n'est ni une Task, ni un claim. Prochaine étape : tests fonctionnels précis et admission autonome autorisée, jamais prise de contrôle d'une branche existante.


### GWB03-02 — PR #267, observations F-04 et limites de preuve

Analyse [GWB03-02](gwb03-pr267-domain-evidence-20261015.json) : 26 constats historiques (15 P1 / 11 P2), 18 rapprochés de lignes code/test, 8 non examinés individuellement. Les quatre limites documentées par l'[issue #268](https://github.com/Patricked-code/MCP/issues/268) restent à traiter sous leur propriétaire : fraîcheur des observations, abonnement Plesk partagé, `realPathVerified` historiquement absent et schéma SQL S1/S2 non attesté. Aucun constat déclaré résolu ni cible S1/S2 modifiée. Pour tout futur correctif : preuve read-only et contrôle d'ownership runtime obligatoire.


### GWB03-01 — Première réconciliation vérifiable de PR #261 (2026-10-15)

La première tranche d'analyse est dans [`gwb03-pr261-source-policy-evidence-20261015.json`](gwb03-pr261-source-policy-evidence-20261015.json) : **73 remarques historiques** (54 P1 / 19 P2), dont **17 comparées à des ancres de code source et de tests** au SHA `0817f340dcd57f59b348b8a023082efd472342e3`. Les 73 états de résolution restent `UNKNOWN` en attente d'une validation suffisante. Deux limites de politique Compose sont signalées : plafonds de ressources déjà connus dans [issue #262](https://github.com/Patricked-code/MCP/issues/262), et plafonds de rotation des logs (`max-size` / `max-file`) présents dans l'historique PR #261 mais non testés négativement aux extrêmes. Ce fichier ne crée pas de Task ni ne permet l'activation d'une cible S1. Prochaine action : tests négatifs par le propriétaire F-03, puis poursuite de la réconciliation de 56 remarques non examinées individuellement et GWB03-02 (#267).


## PRIORITÉ D'ENTRÉE — Carte chronologique de convergence du MCP (2026-10-15)

**Avant d'écrire du code, lire la [carte de priorité machine](mcp-priority-convergence-map-20261015.json).** Cette carte comprend les 15 jalons PCM-00..14, la totalité des 94 blueprints en ordre de programme, les dépendances, domaines de collision, preuves à produire et règles de reprise. Elle **n'est pas** une nouvelle Governed Task Queue ni une autorisation de claims ou d'écriture.

| Ordre de coordination | Travail requis | Reprise et compatibilité |
|---|---|---|
| PCM-00 | Entrée agent, pacte, HEAD, session/ownership/locks si runtime | Obligatoire avant toute mutation |
| PCM-01 | Compléter les traces et deltas de l'audit historique | Lecture indépendante |
| PCM-02 | Vérifier les P1 de PR #261 puis #267, autres P1/P2 | GWB-03, pas 158 bugs supposés |
| PCM-03 | Examiner vraiment sources, assertions et preuves des 94 blueprints | GWB-04, lecture parallèle par slot |
| PCM-04 | Confronter les écarts prouvés à l'architecture et au Backlog | GWB-05, un seul writer de synthèse |
| PCM-05 | Clôturer proprement le volet audit avec résidus et handoff | Ne bloque pas les tâches indépendantes |
| PCM-06 | Diagnostiquer le 403 OAuth de consentement sans affaiblir CSRF | Voie parallèle, propriétaire existant PR #207 |
| PCM-07 | Intégrer les refresh tokens de PR #207 sans régression | Après preuve de la cause OAuth |
| PCM-08 | Certifier Claude et ChatGPT réellement connectés, refresh compris | Preuves clients distinctes |
| PCM-09 | Observer readiness + Queue/Session/Locks, sélectionner nextWork | Dès PCM-00 pour le travail déjà admissible, **sans attendre tout l'audit** |
| PCM-10 | Exécuter W3 par ordre canonique, PR/CI/Deploy/checkpoint | Un writer par collision domain |
| PCM-11 | Construire observabilité et traces de bout en bout | W4 en parallèle si autorisé |
| PCM-12 | Construire et certifier le Super Admin Cockpit existant | W4, aucune permission UI implicite |
| PCM-13 | Certifier dispatch automatique multi-agents, échecs et reprise | Sessions et claims réellement distincts |
| PCM-14 | Valider backend + clients + cockpit ; éventuellement GLOBAL_MCP_COMPLETE | Uniquement avec preuves terminales |

**Gouvernance de l'ordre :** la liste est un ordre logique des objectifs, **pas une sérialisation artificielle des travaux indépendants**. L'agent reprend d'abord sa tâche déjà possédée, sinon déduit le premier candidat compatible `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER` du **Program Backlog live** et vérifie les autorités Task/Session/Lock avant toute mutation. Toute collision se résout par arrêt du write concerné et choix d'un autre scope compatible, non par reprise forcée. Les données de la carte sont un snapshot ; lire `SUIVI.md` et [issue #235](https://github.com/Patricked-code/MCP/issues/235) pour les checkpoints et réobserver GitHub avant d'agir.

**NEXT_ACTION d'audit au 15 octobre :** PCM-02 / GWB03-01 sur les constats de la PR #261, puis #267. En parallèle, PCM-03 peut progresser par slots indépendants, PCM-06 reste au propriétaire OAuth #207, et PCM-09 reprend tout travail runtime déjà possédé/autorisé sans attendre l'audit complet.



## Index de reprise — audit, programme et traçabilité (observation du 2026-10-15)

**Point d'entrée documentaire, non nouvelle source de vérité.** L'agent commence par `CLAUDE.md` et `AGENTS.md`, puis consulte :

1. **Architecture cible et pacte** — `ARCHITECTURE.md`, `ROADMAP.md`, `CLAUDE.md §7.1–7.5`, `.mcp/github-first-operational-policy.json` et [issue #235](https://github.com/Patricked-code/MCP/issues/235).
2. **Audit de l'histoire depuis #65** — `architecture-chronology-issue65-20261009.json` (78 issues, 130 PR), `architecture-comments-batch01..06-20261009.json` et les archives de décisions.
3. **Revues complémentaires GWB-02** — `gwb02-inline-pr-review-comments-20261015.json`, `gwb02-pr-review-submissions-batch01..09-20261015.json`, `gwb02-pr-review-submissions-postbaseline-20261015.json`, `gwb02-review-coverage-manifest-20261015.json` : 282 commentaires inline, 215 soumissions sur 135 PR ; commentaires directs sur commits encore non vérifiés.
4. **Triage GWB-03** — `gwb03-pr-review-findings-triage-20261015.json` : 158 remarques historiques P1/P2, 3 vérifications ciblées de code/tests ; leur statut de résolution **reste non certifié**.
5. **Matrice GWB-04** — `gwb04-94-blueprint-source-test-trace-20261015.json` : existence de chemins sources/tests pour 94 blueprints, pas une preuve d'acceptation fonctionnelle.
6. **Plan gouverné des travaux successifs** — `governed-audit-continuation-workblock-20261009.json` : GWB-00..09 et leurs dépendances ; ses `PLANNED_NOT_RUNTIME_TASK` sont intentionnels, son `currentCheckpoint` n'a pas autorité live.
7. **Ordre et état de planification** — `program-backlog-convergence.json`, `TASKS.md`, `SUIVI.md` ; `npm run program:readiness` puis `npm run program:next` après lecture et réconciliation. Le Program Backlog ne crée pas de task.
8. **Preuves et journaux** — [PR #290](https://github.com/Patricked-code/MCP/pull/290), [#291](https://github.com/Patricked-code/MCP/pull/291), [#292](https://github.com/Patricked-code/MCP/pull/292), GitHub Actions, `CHANGELOG.md`, `DECISIONS_LOG.md`, et commentaires de l'[issue #235](https://github.com/Patricked-code/MCP/issues/235).
9. **Mémoire maître historique** — `MASTER_RESUME_MEMORY.md` conserve aussi le snapshot du 5 octobre. **Ne pas reprendre ses nombres et son NEXT_ACTION comme courants** sans relecture de l'état ci-dessus.

**À la date d'observation** : `main@b187953de89d8f6529e2af97abc1de4570c53146` et CI/Governed Deploy du SHA réussis ; 94 blueprints : 36 DONE, 18 READY, 28 BLOCKED, 5 CONDITIONAL, 7 DEFERRED (projection seulement). L'issue #207 OAuth est DRAFT/dirty, propriétaire et autorisations à préserver ; GitHub Actions/OIDC reste le chemin de continuité prioritaire.

**NEXT_ACTION de l'audit** : vérifier contre le code et les tests actuels les constats de la PR #261 (GWB03-01), puis ceux de #267 (GWB03-02), et approfondir GWB-04 sur les 18 READY et les 36 DONE ; classifier uniquement les écarts prouvés, reprendre GWB-05..09 via l'architecture et les autorités existantes. Après chaque étape : preuves, checkpoint, recalcul, prochain travail admissible. Ne jamais considérer `GLOBAL_MCP_COMPLETE` comme atteint sans acceptation backend + clients + cockpit.


## Objet

Ce répertoire contrôle déterministement les Markdown de `Patricked-code/MCP` et distingue les fichiers Git des miroirs runtime-only.

## Surface courante réattestée

La passe read-only post-workflow a observé :

- 204 Markdown suivis par Git et classifiés individuellement dans `markdown-inventory.json` ;
- 33 Markdown sous `wealthtech_project_memory/memory/` sur S1 ;
- 7 de ces 33 également suivis par Git ;
- 26 Markdown runtime-only ;
- surface Git gouvernée actuelle : 204 Markdown ; la composante runtime-only doit
  être réobservée avant tout nouveau total combiné.

## Historique 209

L’ancienne photographie reste `183 Git + 26 runtime-only = 209`. Elle ne doit jamais être substituée au courant. L’évolution Git est `183 → 196`, soit treize Markdown supplémentaires. Les anciens chemins différentiels exacts ne sont pas affirmés sans l’ancien snapshot individuel.

## Catégories Git

Chaque Markdown suivi appartient à exactement une catégorie déterministe : `canonical`, `root-documentation`, `documentation`, `history`, `engineering-plan`, `engineering-spec`, `migration-history`, `memory` ou `runtime-mirror-tracked`.

## Baseline et CI

`markdown-inventory.json` contient les 204 chemins et catégories exacts. La CI échoue sur ajout, disparition, catégorie divergente, document non classifié ou contradiction `canonical-state`.

L’artefact `mcp-autodeploy-governance` copie désormais exactement les sept documents actifs suivis ; il ne génère plus d’anciens candidats codés en dur.

## Limite de preuve

GitHub Actions contrôle Git. La surface runtime-only exige toujours une lecture S1 fraîche pour une déclaration courante ; la présente valeur 26 provient d’une telle lecture gouvernée, mais devra être réattestée lors d’un futur rapport si elle est alors utilisée comme état courant.

# SUIVI.md — Point de reprise courant

## État canonique structurel

```canonical-state
{
  "repository": "Patricked-code/MCP",
  "branch": "main",
  "s1Root": "/opt/apps/wealthtech-mcp-ssh-bridge",
  "fetchRemote": "git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",
  "pushRemote": "disabled://mcp-s1-read-only",
  "container": "wealthtech_mcp_ssh_bridge"
}
```

Date : 2026-08-13

## État frais après la seconde preuve automatique

- GitHub `main` : `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` (merge de la PR #43).
- S1 `HEAD` et `origin/main` : même SHA ; branche `main`, arbre propre, diff vide.
- Remote fetch : `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`.
- Remote push : `disabled://mcp-s1-read-only`.
- Docker : `wealthtech_mcp_ssh_bridge` `running` et `healthy`.
- OCI/runtime : `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2`.
- Image : `sha256:65465451fb4c3459b20aa9d96af9a81a39f95a68b5577973a74c61bdac0487cb`.
- Live State observé à `2026-08-13T05:19:31.979Z` : `CURRENT`, `stateVersion=9`. Son ancien détecteur retourne encore à tort `documentation=ALIGNED` avec le SHA documentaire `9be5095…`; ce faux alignement est la reproduction RED du correctif en cours et n'est pas accepté comme preuve documentaire.

## Preuves de déploiement

- Bootstrap manuel : run `31655087215`, job GitHub `94307689798`, job MCP `mcp-s1-31655087215-8fb075dd55a3`, SHA `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- CI finale PR #42 : run `31658220076`, tous les contrôles critiques réussis.
- Fusion locked-head PR #42 : `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7`.
- Premier push automatique : CI `31658327373` réussie ; deploy `31658327435`, job `94317597740` réussi.
- Étape `Deploy exact main SHA through MCP` : exécutée et réussie.
- Job MCP : `mcp-s1-31658327435-9be5095cbf72` ; SHA exact `9be5095cbf722cf8c5d1cd02bfc40ca32f93edd7` attesté ; health/OAuth/MCP vrais ; rollback `not_needed`.
- Seconde preuve canonique : PR #43 fusionnée au SHA `eb61b97e1e8598b04e9c8cbb1cf69af2aeb62ab2` ; CI push `31659053828` réussie ; deploy push `31659053836`, job `94319801309`, réussi avec l'étape `Deploy exact main SHA through MCP` exécutée.
- Attestation fraîche : GitHub, S1, `origin/main`, OCI et runtime égaux à `eb61b97e…`; S1 propre/read-only, conteneur running/healthy. L'identifiant interne du job MCP de cette seconde preuve n'est pas inventé lorsqu'il n'est pas exposé par la preuve consultée.

## Inventaire Markdown

- Branche de travail courante : 191 Markdown, 191 chemins classifiés individuellement.
- Miroir runtime fraîchement observé : 33 Markdown, dont 7 suivis par Git et 26 runtime-only.
- Surface de production attestée au baseline : `189 + 26 = 215`; les deux nouveaux Markdown de spec/plan restent sur la branche et ne sont pas déclarés déployés.
- Photographie historique : `183 + 26 = 209`.
- Croissance Git historique : `183 → 189` (+6) ; aucun ensemble exact de six chemins n’est affirmé sans snapshot différentiel historique.

## Revue P2

- Thread PR #41 `PRRT_kwDOTJ-y6M6YoQ5j` résolu après correction fusionnée sur `main`.
- Polling readiness : 20 tentatives maximales, requête bornée à 5 secondes, pause de 2 secondes, échec fermé.
- TDD : RED `31657464793`, GREEN `31657546033`.

## État de branche avant draft PR

- Branche unique : `mcp/session-continuity-v1-20260813`, 27 commits petits et réversibles depuis la baseline immuable.
- Head fonctionnel vérifié : `38e3ced7ff61119b1e8fd8d0228bf032972ecca9` ; CI GitHub `31675193991` réussie.
- Correctif documentaire : un SHA déclaré ancien produit désormais `DOCUMENTATION_DRIFT`, sans changement des autres contrats Live State V1.
- Operational Memory V1 : stores atomiques bornés, journal JSONL sanitizé, `governedSessionId` durable, reprise prouvée, checkpoints, heartbeats et locks gouvernés.
- Surface MCP additive : onze outils de session, resource/instructions de contexte, deux outils de contexte et dashboard authentifié ; aucune architecture parallèle.
- WRITE gate : `shadow` non bloquant uniquement ; `ENABLE_WRITE_TOOLS`, `allow_write`, résultats, erreurs, arité et schémas historiques conservés.
- Maintenance : un timer `60 s` avec `unref`, expiration sessions/locks et journalisation de compteurs uniquement ; aucune collecte GitHub/SSH ni écriture Live State périodique.
- Régression fraîche après `npm ci` : gouvernance `12/12`, suite read-only `161/161`, zéro fail/cancelled/skipped/todo ; typecheck, build, docs check, scan secrets et diff check réussis.
- Invariants : `origin/main` reste `eb61b97e…`; Autodeploy V1, GitHub OIDC, `src/deploy` et `.mcp/autodeploy-policy.json` inchangés ; aucun fichier supprimé ; aucune écriture S1/runtime ; aucune 2FA.
- Merge, autodeploy de cette branche et attestation post-merge : NON OBSERVÉS et non déclarés.

## Tâche active

`TASK-20260813-004 — MCP Governed Session Continuity / Operational Memory V1 — EN COURS`

## Prochaine action unique

Créer une unique draft PR de `mcp/session-continuity-v1-20260813` vers `main` après CI verte du commit de consolidation, puis effectuer la review complète sans fusion prématurée.

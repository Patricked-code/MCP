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

## État frais attesté

- GitHub `main` : `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- S1 `HEAD` et `origin/main` : même SHA ; branche `main`, arbre propre, diff vide.
- Remote fetch : `git@github.com-mcp-patricked-ro:Patricked-code/MCP.git`.
- Remote push : `disabled://mcp-s1-read-only`.
- Docker : `wealthtech_mcp_ssh_bridge` `running` et `healthy`.
- OCI/runtime : `8fb075dd55a3b94ed620527f11b2a77f88627188`.
- Image : `sha256:6f05aeffc4d5b57bc179f50c33e555dd39545fc828c636ef93f3abfdafb5dd50`.
- Live State généré à `2026-08-13T01:17:25.976Z` : `CURRENT`, `FULLY_ALIGNED`, contradictions vides, `nextAction=null`.

## Bootstrap manuel terminé

- Workflow : `MCP Governed Deploy`.
- Run : `31655087215`.
- Job GitHub : `94307689798`.
- Job MCP : `mcp-s1-31655087215-8fb075dd55a3`.
- Étape `Deploy exact main SHA through MCP` : exécutée et réussie.
- Résultat : `phase=attested`, health/OAuth/MCP validés, `rollbackStatus=not_needed`.

## Inventaire Markdown

- Git courant : 189 Markdown, 189 chemins classifiés individuellement.
- Miroir runtime fraîchement observé : 33 Markdown, dont 7 déjà suivis par Git et 26 runtime-only.
- Surface courante observée : `189 + 26 = 215`.
- Photographie historique : `183 + 26 = 209`.
- Croissance Git historique : `183 → 189`, soit six fichiers ; leurs six anciens chemins différentiels exacts ne sont pas déclarés faute de snapshot de chemins.

## Pull Request active

- PR #42 : `mcp/finalize-governed-autodeploy-20260813`, draft.
- Correction P2 : remplacement du `sleep 5` + requête unique par un polling borné fail-closed.
- TDD P2 : RED `31657464793`, GREEN `31657546033`.
- Artefact documentaire : RED `31657669105`, puis parité source/artefact validée sur `31657781749`.
- La politique candidate passe à `pushEnabled=true` parce que le bootstrap manuel et les invariants d’activation sont prouvés.
- Le déploiement automatique par `push` n’est pas encore attesté : cette preuve dépend de la fusion de la PR #42.

## Tâche active

`TASK-20260809-003 — MCP Governed Autodeploy V1 — EN COURS`

## Prochaine action unique

Finaliser la CI et la revue de la PR #42, passer la PR en ready puis fusionner uniquement son head exact. Observer ensuite le workflow automatique non-skipped, réattester GitHub/S1/OCI/runtime, puis créer une seconde PR documentaire utile dont la fusion fournira la preuve automatique canonique ultérieure.

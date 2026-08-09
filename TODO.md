# TODO.md

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


## Role
Liste large des idees, anomalies, points a verifier et besoins non encore ordonnes.

## A traiter
- Vérifier tous les fichiers Markdown racine attendus.
- Consolider les doublons utiles entre `docs/`, `memory/` et la racine.
- Vérifier la cohérence des fichiers `.mcp`.
- Ajouter les fichiers enfants par projet.
- Créer un rapport d'audit documentaire.
- Ne pas toucher aux secrets ni au code applicatif pendant une passe documentaire pure.

## Passage vers TASKS.md
Lorsqu'un point devient executable, il doit etre transforme en entree dans TASKS.md.

---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-08-09

## Alignement MCP — état au 2026-08-09

- [x] Snapshot forensique créé et conservé dans la PR #19 `DO NOT MERGE`.
- [x] Baseline `097dac9` testée.
- [x] Runtime historique récupéré dans GitHub.
- [x] Bundle Git vérifié.
- [x] Documentation canonique fusionnée par la PR #18.
- [x] Diagnostic GitHub read-only fusionné par la PR #25.
- [x] Séparation lecture / écriture fusionnée par la PR #26.
- [x] Fondation GitRegistry v2 dry-run fusionnée par la PR #27.
- [x] `main` protégé avec PR et CI obligatoires.
- [x] Issue de protection #24 clôturée.
- [x] PR #37 fusionnée dans `main@d3bcac0cf17608963317a18aa2916a5997916394` pour imposer l'identité S1 read-only dans le synchroniseur.
- [x] Dernière observation S1 connue : fetch `github.com-mcp-patricked-ro`, push `disabled://mcp-s1-read-only`, checkout sur `d3bcac0…`. Cette preuve doit être rafraîchie avant le prochain déploiement.
- [x] Implémenter sur branche la V1 du Live State : modèle, store atomique, collecteurs, réconciliation 60 s, outils MCP et provenance OCI.
- [ ] Ouvrir/valider/fusionner la PR Live State V1.
- [ ] Reconnecter/invoquer S1 pour le préflight post-merge actuel.
- [ ] Synchroniser S1 par `mcp_sync_from_github_s1` seulement après CI/merge et working tree propre.
- [ ] Reconstruire l’image depuis le merge SHA avec `org.opencontainers.image.revision`.
- [ ] Attester le SHA de l'image/runtime après ce déploiement.
- [ ] Vérifier GitHub `main` = S1 HEAD = image/runtime.
- [ ] Vérifier en production `mcp_get_live_state` et `mcp_reconcile_live_state`.
- [ ] Intégrer le résumé Live State directement dans `get_project_context` quand la modification de `src/tools/readOnly.ts` peut être effectuée via un chemin de mutation autorisé.
- [ ] Migrer le registre actif vers v2 dans une PR et une opération séparées.

## Évolutions Live State V1.5/V2 — séparées

- [ ] Sessions gouvernées et identifiant de session agent.
- [ ] Heartbeats et locks de tâches.
- [ ] `expectedStateVersion` / concurrence optimiste.
- [ ] Write gates fail-closed devant les mutations.
- [ ] Webhooks/Checks GitHub et éventuel required check Live State.
- [ ] Évaluer PostgreSQL uniquement si plusieurs instances MCP doivent écrire simultanément ; ne pas l'ajouter par défaut.

## Interdictions tant que S1 n’est pas réattesté

- aucun reset/clean/force pour aligner le working tree actif ;
- aucun build ni restart si le working tree est sale ou le SHA inattendu ;
- aucun remplacement du registre actif ;
- aucune modification arbitraire de remote ;
- aucun déploiement, nettoyage ou suppression hors procédure gouvernée.

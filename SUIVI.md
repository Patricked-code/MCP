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


Date : 2026-08-09

Projet : WealthTech MCP SSH Bridge

Dépôt actif : `Patricked-code/MCP`

Branche officielle : `main`

Chemin serveur : `/opt/apps/wealthtech-mcp-ssh-bridge`

## État GitHub vérifié dans la session courante

```text
GitHub main : d3bcac0cf17608963317a18aa2916a5997916394
PR #37      : MERGED
PR ouvertes : 0 avant ouverture de la PR Live State
```

La PR #37 `security: enforce read-only S1 GitHub identity` est fusionnée. Les anciens documents indiquant encore `4228119…` comme état courant étaient donc périmés.

## État S1 / runtime

Le connecteur `wealthtech_ssh_bridge` n’est pas invocable dans la session d’implémentation courante. Aucun nouvel état S1 ou Docker n’est donc présenté comme actuel.

Dernière observation live connue avant ce chantier, à revalider avant tout déploiement :

```text
S1 branche  : main
S1 HEAD     : d3bcac0cf17608963317a18aa2916a5997916394
S1 statut   : propre, diff vide
Fetch       : git@github.com-mcp-patricked-ro:Patricked-code/MCP.git
Push        : disabled://mcp-s1-read-only
Runtime SHA : non attesté
```

Cette dernière observation ne vaut pas préflight actuel. Tant qu’une nouvelle lecture S1 n’est pas possible, l’état de déploiement doit rester `DEPLOYMENT_PENDING` ou `RUNTIME_UNVERIFIED` selon l’étape.

## Tâche active

`TASK-20260809-002 — MCP Live State Engine V1`

Branche : `mcp/live-state-v1-20260809`

Base exacte de création : `d3bcac0cf17608963317a18aa2916a5997916394`.

Objectif : intégrer au MCP existant une mémoire opérationnelle read-only-first qui observe GitHub `main`, S1, Docker et la documentation, compare ces sources, persiste un état atomique et l’expose à tous les clients MCP.

## Implémentation préparée sur la branche

La V1 comprend :

- modèle d’état et réconciliation déterministe ;
- `stateVersion` sémantique ;
- fraîcheur `CURRENT/STALE` avec limite de 60 secondes ;
- stockage atomique `/app/data/mcp-live-state.json` en `0600` ;
- collecteur GitHub dynamique sur `main` sans SHA codé en dur ;
- collecteur Git S1 strictement read-only ;
- réutilisation de l’attestation Docker bornée ;
- signaux documentaires ciblés ;
- provenance OCI `org.opencontainers.image.revision` alimentée par le HEAD S1 au build ;
- moteur non chevauchant avec réconciliation initiale puis intervalle 60 s ;
- dégradation explicite si une source échoue ;
- outils MCP `mcp_get_live_state` et `mcp_reconcile_live_state` enregistrés dans le chemin read-only ;
- tests TDD de réconciliation, store, collecteurs, provenance, moteur et outils.

## Validation obtenue avant documentation finale

Sur le dernier head fonctionnel vérifié avant cette mise à jour documentaire :

- typecheck : PASS ;
- build : PASS ;
- docs check : PASS ;
- scan secrets : PASS ;
- suite read-only incluant Live State : PASS ;
- `git diff --check` : PASS.

Chaque bloc fonctionnel a été introduit par un cycle RED/GREEN vérifié avec GitHub Actions.

## Limitation V1 connue

La modification directe de `src/tools/readOnly.ts` visant à injecter le résumé Live State dans l’outil historique `get_project_context` a été bloquée par le filtre de sécurité du wrapper de mutation GitHub, qui classe le contenu shell historique du fichier comme indéterminé. Aucune tentative de contournement opaque n’a été effectuée.

Les deux outils Live State sont néanmoins enregistrés dans le catalogue read-only via le chemin GitHub Authorization déjà appelé par `registerReadOnlyTools`. Le résumé compact est implémenté dans `src/tools/liveState.ts` et pourra être injecté dans `get_project_context` lors d’une modification autorisée de ce fichier, sans changement d’architecture.

## Prochaine action autorisée

1. finaliser la documentation de gouvernance de la branche ;
2. auditer le diff complet contre `main` ;
3. ouvrir une PR Draft unique ;
4. obtenir une CI de PR verte et traiter toute revue ;
5. fusionner uniquement avec le head attendu ;
6. dès que S1 est de nouveau invocable, refaire le préflight live puis utiliser `mcp_sync_from_github_s1` ;
7. vérifier GitHub main = S1 HEAD et working tree propre ;
8. build/déploiement Docker gouverné avec provenance du SHA ;
9. vérifier health et les deux outils Live State ;
10. attester GitHub = S1 = runtime avant `FULLY_ALIGNED`.

## Interdictions

- aucun push direct sur `main` ;
- aucune écriture directe du code sur S1 ;
- aucun `reset --hard`, clean ou force pour aligner S1 ;
- aucun secret ou clé privée dans Git ;
- aucun `FULLY_ALIGNED` sans preuve runtime ;
- aucun PostgreSQL, Redis, nouveau service, lock ou write gate dans cette V1.

## Rollback

La V1 est additive et read-only sur les sources observées. Le rollback applicatif consiste à revenir au précédent commit/image MCP connu bon via la procédure gouvernée habituelle, sans réécriture de l’historique. Le fichier `/app/data/mcp-live-state.json` peut rester inutilisé après rollback ; aucun secret n’y est nécessaire.

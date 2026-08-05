# SUIVI.md — Point de reprise courant

Date : 2026-08-05
Projet : WealthTech MCP SSH Bridge
Dépôt actif : `Patricked-code/MCP`
Branche officielle : `main`
Chemin serveur déclaré : `/opt/apps/wealthtech-mcp-ssh-bridge`

## État GitHub attesté

```text
main : 618f4020ac69801dd53f624e5cd188fc6d76cc24
protection main : active
contrôle obligatoire : validate
```

Fondations fusionnées :

- PR #18 — documentation canonique et reprise forensique ;
- PR #25 — diagnostic GitHub PR strictement read-only ;
- PR #26 — séparation des catalogues READ et WRITE ;
- PR #27 — fondation GitRegistry v2 duale et dry-run.

Anciennes PR #21, #22 et #23 : fermées sans fusion après reconstruction depuis un `main` à jour.

PR #19 : snapshot forensique conservé avec statut `DO NOT MERGE`.

Issue #24 : protection de `main` terminée et clôturée.

## Capacités intégrées dans GitHub

### Diagnostic GitHub read-only

Outil : `github_pr_authorization_diagnostic`.

Il classe les erreurs d’authentification et d’autorisation sans exposer le credential et sans modifier GitHub.

### Séparation READ / WRITE

Les catalogues scoped READ et WRITE sont disjoints et testés. Les mutations restent derrière `ENABLE_WRITE_TOOLS` et ne sont pas déclarées prêtes pour un déploiement automatique.

### GitRegistry v2

Outil : `github_registry_v2_dry_run`.

La conversion v1 vers v2 est validée en mémoire uniquement. Aucun registre actif, remote, mapping ou chemin serveur n’est modifié.

## État S1 et production

```text
S1 aligné avec main@618f4020 : non attesté
working tree S1 propre       : non
image reconstruite           : non
registre actif migré         : non
production modifiée          : non
```

Le connecteur `wealthtech_ssh_bridge` n’était pas disponible pendant la clôture des fondations. Aucun nouveau verdict serveur n’est produit.

## Prochaine tâche unique

`TASK-20260805-006` — reconnecter `wealthtech_ssh_bridge` et effectuer uniquement une attestation read-only :

1. ping du bridge ;
2. état Git complet S1 ;
3. branche, HEAD, remote et `origin/main` ;
4. image Docker active et digest ;
5. catalogue réel des outils ;
6. health checks local et public ;
7. comparaison GitHub / S1 / runtime ;
8. verdict Go, Go avec corrections ou No-Go.

## Interdictions jusqu’au verdict

- aucun pull, reset, clean, checkout, switch, rebase ou stash dans le working tree actif ;
- aucun build ou restart depuis le dossier actif sale ;
- aucun remplacement du registre ;
- aucun changement de remote ;
- aucun déploiement, migration, quarantaine, purge ou suppression.

## Sources associées

- `PRODUCTION_STATE.json` ;
- `TASKS.md` ;
- `TODO.md` ;
- `DECISIONS_LOG.md` ;
- `CHANGELOG.md` ;
- `docs/audits/2026-08-05/MCP_FOUNDATIONS_FINAL_STATE.md` ;
- `docs/history/SUIVI_PRE_FOUNDATIONS_20260805.md` pour l’historique antérieur.

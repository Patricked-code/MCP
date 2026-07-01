# LOOPBACK_WEALTHTECH_CURRENT.md

Date UTC : 2026-07-01
Statut : point de reprise courant de la boucle WEALTHTECH.

## Derniere action terminee

Codex a lu la demande automatique `CODEX_AUTO_ANALYSIS_REQUEST.md`, inspecte les fichiers du dossier `memory/`, identifie les conversations poussees et cree les fichiers de loopback.

## Etat courant

Memoire principale installee dans :

```text
/root/wealthtech_project_memory/memory/
```

Memoire source MCP detectee dans :

```text
/opt/apps/wealthtech-mcp-ssh-bridge/memory/
```

Depot source :

```text
Patricked-code/MCP
```

Dernier commit synchronise :

```text
a89153315f1dcf5484051176e386bf7c0ba51139
```

## Conversations disponibles

Voir :

```text
CONVERSATIONS_POUSSEES_20260701.md
```

## Regles courantes

- Audit avant modification.
- Pas de secrets affiches.
- Pas de suppression sans inventaire.
- Pas de restart/build/commit/push sans validation explicite.
- Pas de transaction blockchain sans validation explicite.
- `/profil/wallet/` est la vraie route Wallet.
- `/profil/portefeuille/` est un faux miroir a traiter plus tard.

## Tracks disponibles

### Track A - Serveurs MCP / S1 / S2

Lire :

- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `RUNBOOK_GLOBAL_REVIEW_S1_S2_2026-07-01.md`

Action autorisee maintenant :

- audit lecture seule.

### Track B - Stablecoin E-WARI

Lire :

- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `CODEX_HANDOFF_STABLECOIN_EWARI.md`
- `PROMPT_AUDIT_6BI_B.md`

Action autorisee maintenant :

- audit metier pre-transaction 6BI-B, lecture seule.

### Track C - OPCVM / FundAfrica

Lire :

- `WEALTHTECH_PROJECT_MEMORY.md`
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`

Action autorisee maintenant :

- audit sans regression, lecture seule.

## Prochaine action recommandee

Demarrer par le track B si l'objectif est Stablecoin :

```text
Audit 6BI-B metier pre-transaction, sans transaction, sans modification.
```

Demarrer par le track A si l'objectif est serveur :

```text
Audit global S1/S2 non destructif, sans suppression ni restart.
```

## Decision de securite

Tant que l'utilisateur ne valide pas explicitement une action dangereuse, l'agent doit rester en lecture seule et documentation.

## Implementation du plan - 2026-07-01 09:42:59 UTC

Etat : Phase Git/Memoire stabilisee et inventaire S1/S2 cree.

Rapports crees :

- Git loopback : /root/wealthtech_project_memory/reports/loopback_git_sync_20260701_094151.md
- Inventaire applications S1/S2 : /root/wealthtech_project_memory/reports/INVENTAIRE_APPLICATIONS_S1_S2_2026-07-01.md
- Etat courant agent : /root/wealthtech_project_memory/state/loop_state.json

Decision : le commit est prepare dans l'index Git sur le dossier canonique memory/. Aucun commit et aucun push n'ont ete executes.

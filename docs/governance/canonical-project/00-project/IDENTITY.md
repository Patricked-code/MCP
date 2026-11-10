# L0 — Identite du projet MCP et alias historiques

[← Racine](../README.md) · [Registres →](../01-authorities/REGISTRY_OF_REGISTRIES.md)

## Cle racine candidate

| Champ | Valeur | Statut |
| --- | --- | --- |
| `projectUid` | `WT-PROJECT-MCP-001` | **Proposee**, pas encore autorite de GitRegistry |
| `projectType` | `MCP_SELF` | Convention de routage proposee |
| `canonicalRepository` | `Patricked-code/MCP` | Depôt source observe sur GitHub |
| `officialBranch` | `main` | Règle du projet |
| `runtimeProduct` | `wealthtech_ssh_bridge` | Outil MCP observe |
| `runtimeHost` | S1 | Cible MCP |
| `runtimePath` | `/opt/apps/wealthtech-mcp-ssh-bridge` | Chemin documente et observe |
| `runtimeRevision` | Revision Docker/OCI | **Dynamique** : jamais figee dans l'ID racine |

## Alias existants et non-equivalence

- [`.mcp/manifest.json`](https://github.com/Patricked-code/MCP/blob/main/.mcp/manifest.json) declare `project: MCP`, `role: mcp_server`, `defaultBranch: main`.
- [`data/mcp-git-registry.json`](https://github.com/Patricked-code/MCP/blob/main/data/mcp-git-registry.json) contient un mapping `Patricked-code/MCP` sous `projectKey: mcp_bridge_source` et un mapping historique `chainsolutions-wealthtech/MCP` sous `mcp_bridge`. L'un ne doit pas etre confondu avec l'autre.
- [`src/github/registryV2.ts`](https://github.com/Patricked-code/MCP/blob/main/src/github/registryV2.ts) contient une projection `projectId: mcp_bridge` ; elle ne prouve ni migration V2 active ni enregistrement d'un nouveau Project UID.
- [`scripts/doc-governance-lib.mjs`](https://github.com/Patricked-code/MCP/blob/main/scripts/doc-governance-lib.mjs) emploie `projectId: wealthtech-mcp-ssh-bridge` pour les declarations documentaires.

**Regle de migration :** conserver les alias, ne pas renommer leurs valeurs existantes et ne pas les utiliser pour deduire une permission. Approuver une seule correspondance de la cle racine vers le **projet logiciel** dans l'autorite de binding existante, avec controle d'unicite, conflits et backward compatibility.

## Point d'origine, separations de sessions

L'identite du projet n'est pas un `governedSessionId`, un `Continuity ID`, une connexion OAuth, une conversation, un ticket, un compte GitHub ni un SHA. Elle ne donne **aucun droit d'ecriture**. L'identite utilisateur/agent et le mandat doivent etre resous separement. Une session Regulatory existante ne devient pas la session d'un nouvel arrivant.

## Baseline de preparation de cette proposition

Observation GitHub du 10/11/2026 : `main@b2cdeaa116b22546ca15c2fb9fd6dcc7e215efb7`. Observation MCP du meme jour : GitHub/S1/runtime reportes `FULLY_ALIGNED` et runtime sain **a cet instant uniquement**. Ne pas recopier cette observation comme verdict durable.

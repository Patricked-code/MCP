# SUIVI.md — WEALTHTECH / MCP / Stablecoin

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`
Branche : `main`
Dossier serveur cible : `/root/wealthtech_project_memory/memory/`

---

## Historique

### 2026-07-01 — Compilation conversation

La conversation WEALTHTECH / MCP / Stablecoin a été compilée et poussée dans le dépôt `Patricked-code/MCP` sur la branche `main`.

Fichiers ajoutés :

- `memory/WEALTHTECH_CONVERSATION_COMPILED.md`
- `memory/GPT.md`
- `memory/SUIVI.md`
- `memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `memory/INSTALL_ON_WEALTHTECH_SERVER.md`
- `memory/manifest.json`

---

# POINT DE REPRISE COURANT

## Date de mise à jour

2026-07-01

## Serveur concerné

Serveur WEALTHTECH / serveur MCP / S1 / S2.

## Projet concerné

WEALTHTECH / MCP / Stablecoin / EWARI / KOREE.

## Dernière action terminée

Compilation de la conversation et ajout de la mémoire dans `Patricked-code/MCP` sur `main`.

## État actuel

Les fichiers de mémoire sont disponibles dans le dépôt GitHub `Patricked-code/MCP`, dossier `memory/`.

## Action suivante recommandée

Sur le serveur WEALTHTECH, synchroniser ce dossier vers :

```bash
/root/wealthtech_project_memory/memory/
```

Puis lancer Claude Code avec le prompt :

```bash
/root/wealthtech_project_memory/memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md
```

## Domaines S1 à préserver

- `niakara.com`
- `www.niakara.com`
- `api.niakara.com`
- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `wealthtechinnovation.com`
- `berebytours.com`

## Domaines S2 à ne pas toucher

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

## Migrations futures

- WealthTech vers `V2.wealthtechinnovations.com`.
- EVOTE vers `evote.wealthtechinnovations.com` et `api.evote.wealthtechinnovations.com`.
- Formation Blockchain vers `evaluations.wealthtechinnovations.com` et `api.evaluations.wealthtechinnovations.com`.
- Stablecoin vers `stablecoin.wealthtechinnovations.com` et `api.stablecoin.wealthtechinnovations.com`, en copie uniquement.

## Risques connus

- Confusion entre S1, S2 et MCP.
- Nettoyage destructif sans audit.
- Suppression accidentelle de Stablecoin S2.
- Modification de domaines S2 protégés.
- Exposition de secrets `.env`.
- Poussée Git de fichiers sensibles.

## Tests réalisés

Aucun test serveur réel exécuté depuis cette compilation.

## Décision de reprise

Installer la mémoire sur le serveur WEALTHTECH, puis exécuter un audit MCP non destructif avant toute suppression ou migration.

# GPT.md — Mémoire IA persistante WEALTHTECH / MCP

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`
Branche : `main`
Dossier serveur cible : `/root/wealthtech_project_memory/memory/`

---

## 1. Rôle de l’IA

Tu es un agent IA expert du projet WEALTHTECH / Stablecoin / EWARI / KOREE / MCP. Tu dois agir sans régression, sans perte de contexte, sans suppression dangereuse et sans exposition de secrets.

Tu dois toujours lire la mémoire projet avant toute action.

---

## 2. Serveurs

```text
S1 = root@212.227.212.33
S2 = root@217.160.249.254
MCP = serveur équipé du pont wealthtech_ssh_bridge ou équivalent
```

---

## 3. Domaines S1 à conserver

Ne jamais casser :

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

---

## 4. Domaines S2 protégés

Ne jamais toucher :

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

---

## 5. Migrations prévues

- `wealthtech.chainsolutions.fr` vers `V2.wealthtechinnovations.com`.
- `evote.chainsolutions.fr` vers `evote.wealthtechinnovations.com`.
- `api.evote.chainsolutions.fr` vers `api.evote.wealthtechinnovations.com`.
- `itic4fima.chainsolutions.fr` vers `evaluations.wealthtechinnovations.com`.
- `api.itic4fima.chainsolutions.fr` vers `api.evaluations.wealthtechinnovations.com`.
- `stablecoin.chainsolutions.fr` vers `stablecoin.wealthtechinnovations.com`, copie uniquement.
- `api.stablecoin.chainsolutions.fr` vers `api.stablecoin.wealthtechinnovations.com`, copie uniquement.

Ne jamais supprimer Stablecoin sur S2.

---

## 6. Règles absolues

- Toujours lire `GPT.md`.
- Toujours lire `SUIVI.md`.
- Toujours lire `POINT DE REPRISE COURANT`.
- Ne jamais supprimer sans inventaire.
- Ne jamais modifier un domaine protégé.
- Ne jamais publier de secrets.
- Ne jamais afficher les contenus réels des `.env`.
- Toujours tester après action.
- Toujours documenter après action.
- Toujours mettre à jour le point de reprise.

---

## 7. Première mission recommandée

Lancer un audit global non destructif S1 + S2 via MCP.

Prompt principal :

```text
/root/wealthtech_project_memory/memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md
```

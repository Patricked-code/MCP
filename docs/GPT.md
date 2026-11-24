# GPT.md — Mémoire persistante IA du projet MCP WealthTech

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence historique, non autorité de l'état courant.** Ce fichier conserve les documents initiaux du projet. Ses tâches, jalons et instructions ne prouvent pas leur état actuel. Pour le **instructions des agents**, consulter [le registre racine](../GPT.md) et [les priorités des sources](../SOURCE_OF_TRUTH.md). Pour l'état courant GitHub/S1/runtime, exiger une observation Live State fraîche ; `PRODUCTION_STATE.json` est un instantané versionné pouvant être obsolète. Le contenu historique ci-dessous est intégralement préservé.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Rôle de l’IA

L’agent IA travaille comme assistant technique expert pour le projet `wealthtech_ssh_bridge`. Il doit aider à construire, maintenir et faire évoluer un serveur MCP sécurisé permettant d’interagir avec les serveurs S1 et S2 via des outils contrôlés.

## Serveurs

- S1 : `root@212.227.212.33`
- S2 : `root@217.160.249.254`

## Domaines S1 à conserver

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

## Domaines S2 protégés

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

## Applications à migrer de S2 vers S1

- `wealthtech.chainsolutions.fr` vers `V2.wealthtechinnovations.com`
- `evote.chainsolutions.fr` vers `evote.wealthtechinnovations.com`
- `api.evote.chainsolutions.fr` vers `api.evote.wealthtechinnovations.com`
- `itic4fima.chainsolutions.fr` vers `evaluations.wealthtechinnovations.com`
- `api.itic4fima.chainsolutions.fr` vers `api.evaluations.wealthtechinnovations.com`
- `stablecoin.chainsolutions.fr` vers `stablecoin.wealthtechinnovations.com`, copie uniquement
- `api.stablecoin.chainsolutions.fr` vers `api.stablecoin.wealthtechinnovations.com`, copie uniquement

## Règles absolues

1. Lire `GPT.md` et `SUIVI.md` avant toute action.
2. Lire le `POINT DE REPRISE COURANT`.
3. Ne jamais supprimer sans inventaire.
4. Ne jamais toucher aux domaines S2 protégés.
5. Ne jamais supprimer les applications stablecoin sur S2.
6. Ne jamais pousser de secrets vers GitHub.
7. Toujours documenter et tester.
8. Toujours distinguer S1 et S2.
9. Le MCP commence en read-only.
10. Les outils destructifs ne seront ajoutés qu’après validation explicite.

## Mémoire WealthTech / OPCVM ajoutée le 2026-07-01

Des fichiers de mémoire complémentaires ont été ajoutés dans `memory/` pour conserver les consignes de la conversation sur le module OPCVM/FundAfrica et les interventions sans régression :

- `memory/WEALTHTECH_PROJECT_MEMORY.md` : mémoire consolidée WealthTech / OPCVM / MCP ;
- `memory/INSTALLATION_MCP_WEALTHTECH.md` : procédure de synchronisation vers `/root/wealthtech_project_memory/memory/` ;
- `memory/PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md` : prompt d’audit OPCVM sans régression.

Pour tout sujet OPCVM/FundAfrica, appliquer la compétence `expert-opcvm-fundafrica-developpement-sans-regression`, lire les fichiers `.md` du projet réel, vérifier l’état de production, éviter toute régression, ne pas intégrer ClickHouse maintenant, et documenter chaque action.

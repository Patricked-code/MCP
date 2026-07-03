# Integration Recherche Elargie Documents/Codex - 2026-07-02

## Perimetre

Recherche locale bornee dans `C:\Users\Kone ZIe Arouna\Documents\Codex` apres extension du workspace Codex.

Controles appliques :
- lecture seule locale ;
- exclusion par nom des fichiers sensibles (`.env`, cles privees, tokens, secrets, password, mdp, credentials, `API chatGPT.txt`) ;
- aucun script execute ;
- aucun fichier serveur modifie hors memoire/state/report ;
- aucun restart, build, reload, suppression, migration, transaction blockchain, commit ou push.

Resultats bruts de recherche :
- fichiers visites : 56
- fichiers pertinents : 51
- fichiers ignores par extension : 4
- fichiers ignores par nom sensible : 0
- dossier `2026-07-01` : aucun fichier pertinent trouve dans cette verification.

## Verdict

La recherche elargie n'a pas trouve de nouveau corpus brut ChatGPT WealthTech contenant tous les prompts/reponses manquants. Le transcript externe `chatgpt.com/share/6a448c60-5794-83ed-8558-f1f4871748e5` reste donc non importe.

Elle confirme surtout que les sources locales deja traitees couvrent :
- exports serveur/memoire sous `work/server_memory_20260701_0445/` ;
- inventaires et rapports locaux sous `outputs/` et `work/server_*` ;
- JSON de consolidation crees pendant la boucle 20260702 ;
- copies locales `work/wealthtech_project_memory/`.

Nouveau point utile : des scripts historiques Niakara/WealthTech existent dans `2026-06-30/ac/work`. Ils doivent etre conserves comme preuves d'actions ou intentions passees, pas comme consignes a rejouer.

## Scripts Historiques Reperes

Ces fichiers ont ete lus comme texte, sans execution :

- `work/fix_niakara.sh` : sauvegardes, installation Tailwind, `npm run build`, `tmp/restart.txt`, configuration proxy Plesk pour `api.niakara.com`, reconfiguration Plesk, `apache2ctl configtest`, `systemctl reload apache2`, checks `curl`.
- `work/fix_niakara_api_proxy.sh` : sauvegardes vhost, desactivation Node Plesk sur `api.niakara.com`, reecriture proxy, reconfiguration Plesk, reload Apache, checks `curl`.
- `work/check_urls.sh` : verification HTTP HEAD de `niakara.com`, `www.niakara.com`, `api.niakara.com`, `wealthtechinnovations.com`, `www.wealthtechinnovations.com`, `api.pnci.wealthtechinnovations.com`.
- `work/disable_empty_broken_node_domains.sh` : ancienne intention de desactiver Node Plesk sur plusieurs sous-domaines WealthTech vides/casses (`api-v2`, `api.evote`, `api.pnci`, `awards.pnci-ci`, `liquidity-test`, `liquidityv1`) puis reload Apache.
- `work/fix_niakara_button_and_build.sh`, `work/fix_niakara_css_and_build.sh`, `work/fix_niakara_next_config_and_build.sh` : corrections locales Niakara avec sauvegardes, build Next.js et `tmp/restart.txt`.

## Interpretation Operationnelle

Ces scripts renforcent les regles suivantes :

1. Ne jamais rejouer un script historique sans re-audit, validation explicite et sauvegarde.
2. Toute action contenant `npm run build`, `systemctl reload`, `plesk ... reconfigure`, `tmp/restart.txt`, `pm2`, `docker`, `rm`, `mv` ou modification vhost est consideree dangereuse hors audit lecture seule.
3. Les domaines Niakara et WealthTech mentionnes par ces scripts doivent etre integres a la matrice E1 nettoyage/refonte, mais aucune desactivation ou suppression ne doit etre declenchee automatiquement.
4. Pour A4, la refonte de `wealthtechinnovations.com` doit passer par preproduction parallele. La production et les vhosts existants ne doivent pas etre modifies avant validation.
5. Pour Niakara, les scripts constituent seulement un historique technique a consulter si un track Niakara est ouvert plus tard.

## Impact Sur Le Loop Engineering

Source ajoutee a la tracabilite : `S17 - Recherche elargie Documents/Codex et scripts historiques Niakara`.

Tracks impactes :
- `A4` : confirme la necessite de preproduction sans reload/build production.
- `E1` : ajoute les sous-domaines WealthTech mentionnes par scripts a verifier dans la future matrice nettoyage.
- `F0` : confirme que la memoire doit tracer aussi les scripts historiques locaux.
- `Track Niakara futur` : a creer uniquement si l'utilisateur demande explicitement de reprendre Niakara.

## Limites Restantes

- Transcript brut ChatGPT externe toujours absent.
- Les fichiers 20260702 restent non commit/push tant que la validation explicite n'est pas donnee.
- Le `package-lock.json` non suivi dans le depot MCP est hors perimetre de cette memoire et ne doit pas etre inclus sans analyse separee.

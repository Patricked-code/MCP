# INTEGRATION_RAPPORTS_LEGACY_ET_LOCAUX_20260702

Date UTC : 2026-07-02T05:57:14.206173+00:00
Mode : lecture/indexation/documentation uniquement.

## Sources legacy serveur lues
- Rapports Markdown legacy : 4
- Fichiers bruts legacy : 16
- Observations HTTP extraites : 144

## Sources locales indexees
- Fichiers locaux resumes : 6
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\outputs\rapport_applications_serveur_niakra.md` : 133 lignes, SHA `87f3187a50e51649`
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\outputs\inventaire_applications_serveur_niakra.tsv` : 78 lignes, SHA `a47530c41e47e8bc`
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\work\server_apps.tsv` : 78 lignes, SHA `97adbab7b5f3ebc1`
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\work\server_apps_after.tsv` : 78 lignes, SHA `3b4bf17ade67f548`
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\work\server_inventory_raw.txt` : 4049 lignes, SHA `615d9d389287bdfe`
- `C:\Users\Koné ZIé Arouna\Documents\Codex\2026-06-30\ac\work\wealthtech_project_memory\memory\REGISTRE_ACTIONS.md` : 99 lignes, SHA `a00dfd4e41c61f27`

## Conclusions consolidees
- Les quatre rapports legacy 20260701_030340/030533/030718/030947 sont quasi identiques et confirment le cadre non destructif initial: S1/S2, domaines a conserver, domaines S2 proteges, migrations prevues, nettoyage apres inventaire.
- Les tests HTTP legacy montrent historiquement wealthtechinnovations.com, stablecoin.wealthtechinnovations.com, blockchain, tokenfactory, evote, evaluations, stablecoin.chainsolutions.fr et wealthtech.chainsolutions.fr accessibles publiquement.
- Des endpoints etaient a analyser historiquement: api.wealthtechinnovations.com, wealthtechinnovation.com, V2.wealthtechinnovations.com et domaines wealthtechinnovations.ci; cela ne remplace pas les audits A/A2/A3 plus recents.
- Les anciens tests SSH depuis MCP avaient des erreurs temporaires Too many authentication failures / timeout, mais les controles actuels confirment S1 et S2 accessibles.
- Le rapport local Niakra contient des actions historiques de remise en ligne Niakara et de desactivation de certains domaines Node vides/casses. Ces actions sont documentees comme historique local, pas comme action de ce tour.
- Le TSV local inventorie 78 domaines/applications S1, avec un avant/apres Passenger. Ces donnees servent a comprendre le nettoyage precedent et les candidats a verifier, pas a supprimer automatiquement.

## Synthese HTTP legacy derniere observation par URL
### OK
- `https://Funds.chainsolutions.fr` -> status `200`, final `https://Funds.chainsolutions.fr/accueil`, audit `audit_20260701_030947`
- `https://africafunds.chainsolutions.fr` -> status `200`, final `https://africafunds.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://api.evaluations.wealthtechinnovations.com` -> status `200`, final `https://api.evaluations.wealthtechinnovations.com/login_up.php`, audit `audit_20260701_030947`
- `https://berebytours.com` -> status `200`, final `https://berebytours.com/`, audit `audit_20260701_030947`
- `https://blockchain.wealthtechinnovations.com` -> status `200`, final `https://blockchain.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://brvm.chainsolutions.fr` -> status `200`, final `https://brvm.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://bvmac.chainsolutions.fr` -> status `200`, final `https://bvmac.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://chainsolutions.fr` -> status `200`, final `https://chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://evaluations.wealthtechinnovations.com` -> status `200`, final `https://evaluations.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://evote.chainsolutions.fr` -> status `200`, final `https://evote.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://evote.wealthtechinnovations.com` -> status `200`, final `https://evote.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://itic4fima.chainsolutions.fr` -> status `200`, final `https://itic4fima.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://niakara.com` -> status `200`, final `https://niakara.com/`, audit `audit_20260701_030947`
- `https://stablecoin.chainsolutions.fr` -> status `200`, final `https://stablecoin.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://stablecoin.wealthtechinnovations.com` -> status `200`, final `https://stablecoin.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://tokenfactory.wealthtechinnovations.com` -> status `200`, final `https://tokenfactory.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://wealthtech.chainsolutions.fr` -> status `200`, final `https://wealthtech.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://wealthtechinnovations.com` -> status `200`, final `https://www.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://www.niakara.com` -> status `200`, final `https://www.niakara.com/`, audit `audit_20260701_030947`
### accÃ¨s bloquÃ© / protection / dossier vide
- `https://api.evote.wealthtechinnovations.com` -> status `403`, final `https://api.evote.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://api.stablecoin.chainsolutions.fr` -> status `401`, final `https://api.stablecoin.chainsolutions.fr/`, audit `audit_20260701_030947`
### non trouvÃ©
- `https://api.evote.chainsolutions.fr` -> status `404`, final `https://api.evote.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://api.funds.chainsolutions.fr` -> status `404`, final `https://api.funds.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://api.itic4fima.chainsolutions.fr` -> status `404`, final `https://api.itic4fima.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://api.niakara.com` -> status `404`, final `https://api.niakara.com/`, audit `audit_20260701_030947`
- `https://api.stablecoin.wealthtechinnovations.com` -> status `404`, final `https://api.stablecoin.wealthtechinnovations.com/`, audit `audit_20260701_030947`
### Ã  analyser
- `https://V2.wealthtechinnovations.com` -> status `000`, final `https://V2.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://api.africafunds.chainsolutions.fr` -> status `000`, final `https://api.africafunds.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://api.pccet.wealthtechinnovations.ci` -> status `000`, final `https://api.pccet.wealthtechinnovations.ci/`, audit `audit_20260701_030947`
- `https://api.wealthtechinnovations.ci` -> status `000`, final `https://api.wealthtechinnovations.ci/`, audit `audit_20260701_030947`
- `https://api.wealthtechinnovations.com` -> status `000`, final `https://api.wealthtechinnovations.com/`, audit `audit_20260701_030947`
- `https://evote.wealthtechinnovations.ci` -> status `000`, final `https://evote.wealthtechinnovations.ci/`, audit `audit_20260701_030947`
- `https://opcvm.chainsolutions.fr` -> status `000`, final `https://opcvm.chainsolutions.fr/`, audit `audit_20260701_030947`
- `https://pccet.wealthtechinnovations.ci` -> status `000`, final `https://pccet.wealthtechinnovations.ci/`, audit `audit_20260701_030947`
- `https://wealthtechinnovation.com` -> status `000`, final `https://wealthtechinnovation.com/`, audit `audit_20260701_030947`
- `https://wealthtechinnovations.ci` -> status `000`, final `https://wealthtechinnovations.ci/`, audit `audit_20260701_030947`

## Rapports legacy
| Rapport | Lignes | Caracteres | SHA256 court |
|---|---:|---:|---|
| `/root/wealthtech_audit_reports/audit_20260701_030340/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030340.md` | 238 | 9871 | `c3e53091d6d95b39` |
| `/root/wealthtech_audit_reports/audit_20260701_030533/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030533.md` | 238 | 9871 | `4c303767f591ef09` |
| `/root/wealthtech_audit_reports/audit_20260701_030718/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030718.md` | 238 | 9872 | `987a4ad4f49112b0` |
| `/root/wealthtech_audit_reports/audit_20260701_030947/RAPPORT_AUDIT_GLOBAL_WEALTHTECH_20260701_030947.md` | 238 | 9872 | `9eb8bf108215db4a` |

## Fichiers bruts legacy
| Fichier | Lignes | Caracteres | SHA256 court |
|---|---:|---:|---|
| `/root/wealthtech_audit_reports/audit_20260701_030340/raw/HTTP_CHECKS_FROM_MCP.txt` | 36 | 3489 | `6436beabb7599b68` |
| `/root/wealthtech_audit_reports/audit_20260701_030340/raw/MCP_.txt` | 22 | 1210 | `dd0cb92227da7ed4` |
| `/root/wealthtech_audit_reports/audit_20260701_030340/raw/S1_ssh_check.txt` | 3 | 162 | `eec8572363581d83` |
| `/root/wealthtech_audit_reports/audit_20260701_030340/raw/S2_ssh_check.txt` | 3 | 136 | `c577d51ee6468399` |
| `/root/wealthtech_audit_reports/audit_20260701_030533/raw/HTTP_CHECKS_FROM_MCP.txt` | 36 | 3489 | `2027a4da86a7b026` |
| `/root/wealthtech_audit_reports/audit_20260701_030533/raw/MCP_.txt` | 22 | 1210 | `4891ab7b032befeb` |
| `/root/wealthtech_audit_reports/audit_20260701_030533/raw/S1_ssh_check.txt` | 3 | 162 | `eec8572363581d83` |
| `/root/wealthtech_audit_reports/audit_20260701_030533/raw/S2_ssh_check.txt` | 3 | 136 | `c577d51ee6468399` |
| `/root/wealthtech_audit_reports/audit_20260701_030718/raw/HTTP_CHECKS_FROM_MCP.txt` | 36 | 3489 | `6dc919c97804dde4` |
| `/root/wealthtech_audit_reports/audit_20260701_030718/raw/MCP_.txt` | 22 | 1211 | `87e49143b05b94dd` |
| `/root/wealthtech_audit_reports/audit_20260701_030718/raw/S1_ssh_check.txt` | 3 | 162 | `eec8572363581d83` |
| `/root/wealthtech_audit_reports/audit_20260701_030718/raw/S2_ssh_check.txt` | 3 | 136 | `c577d51ee6468399` |
| `/root/wealthtech_audit_reports/audit_20260701_030947/raw/HTTP_CHECKS_FROM_MCP.txt` | 36 | 3489 | `718d088be60d58a0` |
| `/root/wealthtech_audit_reports/audit_20260701_030947/raw/MCP_.txt` | 22 | 1211 | `b7ee4295552487f2` |
| `/root/wealthtech_audit_reports/audit_20260701_030947/raw/S1_ssh_check.txt` | 3 | 162 | `eec8572363581d83` |
| `/root/wealthtech_audit_reports/audit_20260701_030947/raw/S2_ssh_check.txt` | 1 | 67 | `7234e70f76e66d67` |

## Donnees locales Niakra
- - Nettoyage precedent: disque ramene autour de 73% utilise, environ 21 Go libres.
- - `niakara.com` et `www.niakara.com` remis en ligne: HTTP 200 via Next.js + Passenger.
- - `api.niakara.com` bascule vers l API PM2 existante sur `127.0.0.1:3005`; la racine repond 404 API normal au lieu de 500 Passenger.
- - Node.js des domaines vides/casses desactive, sans suppression de domaine ni de fichiers.
- - Build Niakara corrige provisoirement: Tailwind aligne en v3, `server.js` Passenger ajoute, TypeScript/lint ignores au build pour remettre en ligne rapidement.
- - `api-v2.wealthtechinnovations.com`: 8.0K, chemin `/var/www/vhosts/wealthtechinnovations.com/api-v2.wealthtechinnovations.com/api`
- - `api.evote.wealthtechinnovations.com`: 28K, chemin `/var/www/vhosts/wealthtechinnovations.com/api.evote.wealthtechinnovations.com`
- - `api.pnci.wealthtechinnovations.com`: 8.0K, chemin `/var/www/vhosts/wealthtechinnovations.com/api.pnci.wealthtechinnovations.com`
- - `/var/www/vhosts/niakara.com/repo/civitech-commune-saas`: 2.2M
- - `/var/www/vhosts/wealthtechinnovations.com/api-lp-v2.wealthtechinnovations.com/api_lp_v2/build`: 237M
- - `/var/www/vhosts/wealthtechinnovations.com/api-lp-v2.wealthtechinnovations.com/api_lp_v2`: 477M
- - `/var/www/vhosts/wealthtechinnovations.com/api.sadiaaf.wealthtechinnovations.com/sadiaaf_project-v1`: 614M
- - `/var/www/vhosts/wealthtechinnovations.com/api.stablecoin.wealthtechinnovations.com/api.stablecoin`: 37M
- - `/var/www/vhosts/wealthtechinnovations.com/api.wealthtechinnovations.com/build`: 231M
- - `/var/www/vhosts/wealthtechinnovations.com/blockchain.wealthtechinnovations.com/build`: 88M
- - `/var/www/vhosts/wealthtechinnovations.com/dapps.liquidity.wealthtechinnovations.com/lpv2-frontend/build`: 28M
- - `/var/www/vhosts/wealthtechinnovations.com/liquidity.wealthtechinnovations.com/build`: 32M
- - `/var/www/vhosts/wealthtechinnovations.com/liquidity.wealthtechinnovations.com/iquidity-web-app_db/build`: 329M
- - `/var/www/vhosts/wealthtechinnovations.com/liquidity.wealthtechinnovations.com/iquidity-web-app_db1/build`: 34M
- - Si le site principal vise est `niakara.com`: garder `niakara.com` et `api.niakara.com`; archiver `niakara.com/repo/civitech-commune-saas` seulement apres verification.
- - Si le site principal vise est `wealthtechinnovations.com`: garder `wealthtechinnovations.com/httpdocs/production` comme reference actuelle et decider quels sous-domaines metier doivent rester connectes.
- - Avant suppression: exporter la liste finale, faire une sauvegarde Plesk recente, puis supprimer par lots: domaines vides, dossiers non servis, anciens builds/copies.

## Stats TSV locales
- `inventaire_applications_serveur_niakra.tsv` : rows=74, active_yes=1, passenger_on=16, types={'unknown/static': 6, 'express,web3': 2, 'express': 2, 'next,react,ethers,web3': 4, 'web3': 1, 'express,ethers,web3': 1, 'static': 6, 'node': 1, 'ethers,web3': 2, 'react,web3': 1, 'next,react': 1, 'nuxt,vue': 2, 'unknown': 45}
- `server_apps.tsv` : rows=74, active_yes=1, passenger_on=23, types={'unknown/static': 6, 'express,web3': 2, 'express': 2, 'next,react,ethers,web3': 4, 'web3': 1, 'express,ethers,web3': 1, 'static': 6, 'node': 1, 'ethers,web3': 2, 'react,web3': 1, 'next,react': 1, 'nuxt,vue': 2, 'unknown': 45}
- `server_apps_after.tsv` : rows=74, active_yes=1, passenger_on=16, types={'unknown/static': 6, 'express,web3': 2, 'express': 2, 'next,react,ethers,web3': 4, 'web3': 1, 'express,ethers,web3': 1, 'static': 6, 'node': 1, 'ethers,web3': 2, 'react,web3': 1, 'next,react': 1, 'nuxt,vue': 2, 'unknown': 45}

## Regle d usage
- Ces sources sont historiques. Pour agir aujourd hui, verifier l etat courant par audit lecture seule avant toute modification.
- Les candidats suppression/archivage identifies localement restent seulement des candidats; aucune suppression sans matrice E1 et validation explicite.

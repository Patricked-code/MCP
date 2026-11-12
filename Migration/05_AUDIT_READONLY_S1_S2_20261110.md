# Audit réel S1/S2 du 10 novembre 2026 — chantier historique migration et nettoyage

> **READ-ONLY AUDIT / AUCUNE ACTION DE NETTOYAGE EXECUTEE / NON-CERTIFICATION DE SUPPRESSION.**
> L'observation a été réalisée par les outils disponibles du `wealthtech_ssh_bridge` sur la connexion indépendante `MCP - AUDIT S1 S2 - INDEPENDANT` après `ping` → `mcp_reconcile_governed_context` → `mcp_get_current_state_inventory`. La réconciliation a révélé une session Regulatory active distincte : **aucune reprise/claim/lock n'a eu lieu**.

## Sources historiques obligatoires et priorité

- [`Migration/01_CONTEXTE_CONVERSATIONS.md`](01_CONTEXTE_CONVERSATIONS.md) : S1/S2, zones protégées, sources/destinations.
- [`Migration/02_PLAN_MIGRATION_ET_SECURITE.md`](02_PLAN_MIGRATION_ET_SECURITE.md) : matrice préalable, sauvegarde/restauration, approbation explicite et tests post-action.
- [Document fondateur Loop Engineering](../memory/LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702.md), [Master Plan 20260702](../memory/LOOP_ENGINEERING_WEALTHTECH_MASTER_PLAN_20260702.md), [prompts d'audit](../memory/AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md).
- [Intégration rapports legacy](../memory/INTEGRATION_RAPPORTS_LEGACY_ET_LOCAUX_20260702.md) : les observations de juillet sont **historiques** ; elles ne prouvent pas l'état de novembre.
- [Registre candidat de Project UID PR #389](https://github.com/Patricked-code/MCP/pull/389) : `WT-PROJECT-MCP-001` reste **CANDIDATE**, pas un droit de modification serveur.

## A. Connexion et droits réellement observés

| Contrôle | Résultat |
| --- | --- |
| `ping` bridge | `wealthtech_ssh_bridge_ok` |
| `mcp_reconcile_governed_context` | `FULLY_ALIGNED` (GitHub/S1/runtime MCP) ; **ne certifie pas chaque application tierce** |
| Session renvoyée | Branche `mcp/regulatory-s1-governed-admission-20261023`, session ACTIVE **étrangère à cet audit** |
| `get_write_tools_context` | `free_shell=false`, `run_command_s1=false`, `run_command_s2=false` ; outils d'écriture **limités à des projets explicitement déclarés**, pas de suppression générique S2 |
| `legacy_vhosts_context_s1` | Outils spécifiques S1 SadiaAF/Liquidity ; ne couvrent pas les six anciennes cibles S2 |
| Droits ajoutés | **AUCUN** : une approbation utilisateur ne crée pas de droit d'exécution et le code/politiques ne doivent pas être contournés |

## B. Espace disque actuel

| Serveur | Volume principal | Utilisé | Libre | Méthode |
| --- | --- | --- | --- | --- |
| S1 | 77 G | 77 % | 18 G | `check_disk_s1` → `df -h` |
| S2 | 155 G | **96 %** | **7.1 G** | `check_disk_s2` → `df -h` |

**Conclusion de sécurité :** pression d'espace sur S2, risque opérationnel. Enjeu prioritaire : expertise de rétention des sauvegardes Plesk et des consommations, sans toucher aux backups dont la restauration peut être nécessaire.

## C. Archives volumineuses sur S2, inventaire borné

Les outils `list_large_files_s2` ont retourné notamment :

| Fichier Plesk exact | Taille octets | Date fichier | Décision |
| --- | ---: | --- | --- |
| `/var/lib/psa/dumps/domains/chainsolutions.fr/backup_user-data_2610060011.tzst` | 7430294740 | 2026-10-06 | **PRESERVER / HOLD** tant que chaîne de restauration, destination externe et rétention ne sont pas attestées |
| `/var/lib/psa/dumps/domains/chainsolutions.fr/backup_user-data_2609290011.tzst` | 7414808005 | 2026-09-29 | **PRESERVER / HOLD** mêmes conditions |
| `/var/lib/psa/dumps/domains/fantokenafrica.club/backup_user-data_2609290011.tzst` | 1849858982 | 2026-09-29 | **PRESERVER / HOLD** |
| `/var/lib/psa/dumps/domains/fantokenafrica.club/backup_user-data_2610060011.tzst` | 1849858980 | 2026-10-06 | **PRESERVER / HOLD** |

Deux archives `chainsolutions.fr` atteignent ensemble **14 845 102 745 octets, soit ~13,83 Gio**. C'est un **volume apparent de fichiers, pas une estimation garantie de capacité recouvrable** (liens, politique de rétention, dépendances, restauration).

Le lecteur `list_backups_s2` inventorie également `fund_opcvm_2026-03-21_16-34-38.sql.zip`, `fantoken_secours.zip`, sauvegarde Stablecoin et artefacts `.old`/logs. Son glob de fichiers **ne couvre pas `.tzst`** : la vue `list_large_files_s2` est indispensable pour les grosses sauvegardes Plesk. **Ne pas supprimer ces éléments sur simple date de création.**

## D. Santé services S2

- `docker_status_s2` : `brvm_app` / `brvm_db` annoncés `healthy` ; `bvmac_app` annoncé **unhealthy** ; `bvmac_db` healthy. La santé est ponctuelle.
- `pm2_status_s2` : `fundafrique-frontend`, `worker-data-import` et `worker-recalculation` observés `online` ; PM2 avertit que son état en mémoire est ancien.
- Les conteneurs et projets protégés ne sont **pas des candidats de purge**.
- Aucun service n'a été redémarré.

## E. Résolution des instructions

Les six candidats historiques S2 ont été retrouvés sous leur vhost racine par `list_domains_s2` ; leur **contenu, tailles, consommation, dépendances exactes et nécessité fonctionnelle** n'ont **pas** été certifiés. Voir [matrice cible et gates](06_MATRICE_ACTIONS_ET_PERMISSIONS_20261110.md).

## F. Limites de l'observation

Les lecteurs `list_domains_s1/s2` effectuent des `find ... -maxdepth 2 ... | head -300`. Ils démontrent la **présence de répertoires**, pas un inventaire exhaustif ou une confirmation qu'ils sont vides. Les lecteurs `list_large_files` bornent aux fichiers `>100M` et aux 200 premiers. Aucun `du` complet, aucune inspection fine des six sources, aucun hash/archive restore test, aucune capture Plesk subscriptions/databases ni preuve de sauvegarde indépendante n'a été obtenu.

**Aucune suppression, édition, déplacement, déploiement, restart, migration ou élévation de permissions n'a été effectué.** [Checkpoint suivant](07_POINT_DE_REPRISE_ET_PROCHAINES_ACTIONS_20261110.md).

## G. Vérification DNS/HTTPS ponctuelle depuis S1 — 2026-11-10, ~06:47 UTC

`curl_domain` a lancé `curl -I --max-time 15 https://DOMAINE` depuis **S1**. Résultats :

| Domaine candidate S2 | Code process | Observation |
| --- | ---: | --- |
| `api.pccet.wealthtechinnovations.ci` | 6 | DNS non résolu depuis S1 |
| `api.wealthtechinnovations.ci` | 6 | DNS non résolu depuis S1 |
| `evote.wealthtechinnovations.ci` | 6 | DNS non résolu depuis S1 |
| `pccet.wealthtechinnovations.ci` | 6 | DNS non résolu depuis S1 |
| `wealthtechinnovations.ci` | 6 | DNS non résolu depuis S1 |
| `opcvm.chainsolutions.fr` | 6 | DNS non résolu depuis S1 |

**Contrôles protégés comparatifs :** `stablecoin.chainsolutions.fr` et `brvm.chainsolutions.fr` → HTTP/2 **200** tous deux depuis S1. **Aucun changement de DNS**.

Un échec de résolution depuis S1 n'est **ni une preuve universelle d'absence DNS**, ni une preuve que Plesk est désactivé, qu'un service interne n'utilise pas ce domaine ou que le contenu est supprimable. La liste candidate garde donc `HOLD_NO_DELETION` jusqu'aux gates d'inventaire et restauration.

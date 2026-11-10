# Matrice des cibles de nettoyage/migration historiques S1-S2 — 10 novembre 2026

[← Audit live](05_AUDIT_READONLY_S1_S2_20261110.md) · [Point de reprise](07_POINT_DE_REPRISE_ET_PROCHAINES_ACTIONS_20261110.md)

## A. Six cibles historiques S2 : observation ≠ permission de suppression

| Cible historique | Chemin observé via `list_domains_s2` | Preuve d'existence | Classification |
| --- | --- | --- | --- |
| `api.pccet.wealthtechinnovations.ci` | `/var/www/vhosts/wealthtechinnovations.ci/api.pccet.wealthtechinnovations.ci` | **PRESENT_DIRECTORY** | `HOLD_NO_DELETION` |
| `api.wealthtechinnovations.ci` | `/var/www/vhosts/wealthtechinnovations.ci/api.wealthtechinnovations.ci` | **PRESENT_DIRECTORY** | `HOLD_NO_DELETION` |
| `evote.wealthtechinnovations.ci` | `/var/www/vhosts/wealthtechinnovations.ci/evote.wealthtechinnovations.ci` | **PRESENT_DIRECTORY** | `HOLD_NO_DELETION` |
| `pccet.wealthtechinnovations.ci` | `/var/www/vhosts/wealthtechinnovations.ci/pccet.wealthtechinnovations.ci` | **PRESENT_DIRECTORY** | `HOLD_NO_DELETION` |
| `wealthtechinnovations.ci` | `/var/www/vhosts/wealthtechinnovations.ci` | **PRESENT_DIRECTORY / PARENT OF FOUR ABOVE** | `HOLD_NO_PARENT_DELETION` |
| `opcvm.chainsolutions.fr` | `/var/www/vhosts/chainsolutions.fr/opcvm.chainsolutions.fr` | **PRESENT_DIRECTORY** | `HOLD_NO_DELETION` |

**Interdit :** traiter `wealthtechinnovations.ci` comme une cible indépendante de ses quatre enfants sans inventaire de l'arbre et des dépendances Plesk. Ne pas retirer un domaine du panneau Plesk et ne pas supprimer son docroot sans séparation explicite de l'effet sur les autres domaines.

## B. Sources S2 destinées à migrer vers S1

| Source S2 | Destination S1 | Protection spéciale | Verdict novembre |
| --- | --- | --- | --- |
| `wealthtech.chainsolutions.fr` | `V2.wealthtechinnovations.com` | Ne pas supprimer source avant recette | **MIGRATION_NOT_ATTESTED** |
| `evote.chainsolutions.fr` | `evote.wealthtechinnovations.com` | Migration après inventaire | **MIGRATION_NOT_ATTESTED** |
| `api.evote.chainsolutions.fr` | `api.evote.wealthtechinnovations.com` | API et base à valider | **MIGRATION_NOT_ATTESTED** |
| `itic4fima.chainsolutions.fr` | `evaluations.wealthtechinnovations.com` | Tests fonctionnels | **MIGRATION_NOT_ATTESTED** |
| `api.itic4fima.chainsolutions.fr` | `api.evaluations.wealthtechinnovations.com` | API et base à valider | **MIGRATION_NOT_ATTESTED** |
| `stablecoin.chainsolutions.fr` | `stablecoin.wealthtechinnovations.com` | **COPY_ONLY, ORIGINAL_S2_PROTECTED** | **COPY_STATUS_UNVERIFIED** |
| `api.stablecoin.chainsolutions.fr` | `api.stablecoin.wealthtechinnovations.com` | **COPY_ONLY, ORIGINAL_S2_PROTECTED** | **COPY_STATUS_UNVERIFIED** |

Ces associations proviennent du programme historique `Migration/01_CONTEXTE_CONVERSATIONS.md`. Les statuts ne nient pas qu'un transfert ait pu avoir lieu : **aucune preuve de recette/attestation actuelle n'a été jointe**.

## C. Whitelist et protections persistantes

- S1 : 11 domaines listés comme « à conserver » dans [plan originel](02_PLAN_MIGRATION_ET_SECURITE.md), notamment Niakara/WealthTech/Stablecoin/Blockchain/Tokenfactory/Berebytours, avec leurs dépendances.
- S2 : 9 domaines protégés : `africafunds.chainsolutions.fr`, `api.africafunds.chainsolutions.fr`, `api.stablecoin.chainsolutions.fr`, `stablecoin.chainsolutions.fr`, `brvm.chainsolutions.fr`, `bvmac.chainsolutions.fr`, `chainsolutions.fr`, `Funds.chainsolutions.fr`, `api.funds.chainsolutions.fr`.
- **Aucune suppression des originaux Stablecoin S2**, même après copie vers S1.
- L'hôte Plesk `chainsolutions.fr` étant protégé, les sous-domaines non protégés ne deviennent **pas automatiquement supprimables**.

## D. Matrice d'admission par action

| Gate | Preuve requise | Actuel |
| --- | --- | --- |
| 1 — Cible exacte | Chemin canonique, vhost et ownership Plesk ; éviter parent / enfant | **PARTIAL** |
| 2 — Services | Process, ports, Docker, PM2/Passenger, crons et usages live | **UNVERIFIED** par cible |
| 3 — Données | Bases, uploads, SSL, secrets (noms uniquement), certificats, dépendances | **UNVERIFIED** |
| 4 — GitHub | Dépôt/remotes/branche/HEAD/dirty, déploiement actuel | **UNVERIFIED** |
| 5 — Sauvegarde | Backup indépendant récent + preuve d'intégrité + recette de restauration | **UNVERIFIED** |
| 6 — Matrice E1 | Conserver/migrer/archiver/supprimer, motivation, impact et rollback | **PARTIAL** |
| 7 — Droits outils | Scope spécifique du MCP permettant l'acte **et** les protections | **NOT_GRANTED_FOR_HISTORIC_S2_CLEANUP** |
| 8 — Autorisation | Cible précise, action précise, owner et périmètre approuvé | **NOT_YET_SCOPED** |
| 9 — Exécution | Outil allowlisté non destructif d'abord, journaux et recette post-action | **NOT_STARTED** |
| 10 — Continuité | Rapport exact, preuves, incident/gaps et NEXT_ACTION | **DOCUMENTED_BY_THIS_PR** |

Un consentement générique « nettoyer les serveurs » ne remplace pas l'approbation d'un **lot et de sa liste explicite de chemins**, particulièrement lorsqu'un parent contient des enfants ou qu'une archive Plesk participe à une chaîne incrémentale.

## E. Permissions : ne pas élargir automatiquement

`get_write_tools_context` renvoie `free_shell=false`, `run_command_s1=false`, `run_command_s2=false`. Les outils de mutation disponibles ciblent des projets précis (SadiaAF, Liquidity, fonds/BRVM), pas les six vhosts historiques S2. **Il n'existe pas, dans cette connexion, de méthode de suppression S2 générique autorisée et contrôlée.**

La correction souhaitable est **un workflow de nettoyage gouverné par chemin exact**, avec préflight non destructif, dry-run, exclusions non contournables de domaines protégés, backup vérifié, journal immuable, scope de permission et rollback. Une évolution de code et de politiques est **une PR distincte nécessitant revue sécurité**, pas une auto-attribution de privilèges par l'agent.

## F. Priorité opérationnelle

1. Traiter la pression disque S2 à **96 %** par expertise de chaîne Plesk/backup et rétention — **ne supprimer aucun .tzst à l'aveugle**.
2. Comprendre `bvmac_app unhealthy` sans le redémarrer ni purger ses données.
3. Compléter la taille, le contenu et les dépendances des six cibles historiques (outils de diagnostic **read-only** à ajouter si absents).
4. Valider explicitement un lot de remédiation avec rollback et outils à scope strict.

## G. Vérification externe ponctuelle du 10 novembre

Les six domaines candidats ont échoué au DNS depuis S1 (`curl_domain` code 6). Les domaines protégés de contrôle `brvm.chainsolutions.fr` et `stablecoin.chainsolutions.fr` ont répondu **HTTP 200**. Il s'agit uniquement de l'accessibilité depuis S1 à cet instant : le **gate de nettoyage reste bloqué** jusqu'à inventaire des usages Plesk/internes et des sauvegardes.

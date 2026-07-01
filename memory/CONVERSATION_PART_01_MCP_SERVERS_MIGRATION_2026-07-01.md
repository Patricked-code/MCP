# Conversation compilée — Partie 01 — MCP, serveurs et migrations

Date : 2026-07-01
Dépôt : `Patricked-code/MCP`

## 1. Serveurs

Deux serveurs structurent le projet :

- S1 : serveur principal cible, futur point de consolidation, serveur d’hébergement du MCP et destination des migrations.
- S2 : serveur source contenant des applications à migrer, mais aussi des domaines protégés à préserver strictement.

Le dépôt MCP contient déjà les identifiants techniques de ces serveurs dans `docs/GPT.md` et `README.md`. Ne jamais dupliquer de secret dans les fichiers mémoire.

## 2. MCP WealthTech

Le serveur MCP s’appelle `wealthtech_ssh_bridge`. Son objectif est de donner aux agents IA un accès contrôlé, documenté et journalisé aux inventaires serveurs.

Mode initial obligatoire : `read-only first`.

Objectif du MCP :

- inventorier les domaines ;
- vérifier disque, PM2, Docker, Passenger, Plesk ;
- lister les sauvegardes ;
- préparer les audits ;
- produire des rapports ;
- éviter de transformer l’IA en console système libre.

Outils read-only attendus :

```text
ping
get_project_context
check_disk_s1
check_disk_s2
pm2_status_s1
pm2_status_s2
docker_status_s1
docker_status_s2
list_domains_s1
list_domains_s2
list_large_files_s1
list_large_files_s2
list_backups_s1
list_backups_s2
curl_domain
```

## 3. Domaines S1 à conserver

L’utilisateur a confirmé que S1 doit conserver :

```text
niakara.com
www.niakara.com
api.niakara.com
wealthtechinnovations.com
api.wealthtechinnovations.com
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
blockchain.wealthtechinnovations.com
tokenfactory.wealthtechinnovations.com
wealthtechinnovation.com
berebytours.com
```

Tout le reste sur S1 est potentiellement à vider, archiver ou supprimer après inventaire, documentation et validation.

Contexte technique déjà noté :

- `niakara.com` a été remis en ligne ;
- `www.niakara.com` répondait `200 OK` ;
- `api.niakara.com` a été associé à une API PM2 existante au lieu de planter via Passenger ;
- plusieurs domaines Node vides ou cassés ont été neutralisés sans suppression.

## 4. Domaines S2 protégés

Sur S2, les domaines suivants ne doivent pas être modifiés :

```text
africafunds.chainsolutions.fr
api.africafunds.chainsolutions.fr
api.stablecoin.chainsolutions.fr
stablecoin.chainsolutions.fr
brvm.chainsolutions.fr
bvmac.chainsolutions.fr
chainsolutions.fr
Funds.chainsolutions.fr
api.funds.chainsolutions.fr
```

Règle absolue : les applications stablecoin présentes sur S2 peuvent être copiées vers S1, mais ne doivent jamais être supprimées de S2.

## 5. Migrations prévues

### WealthTech

Source : `wealthtech.chainsolutions.fr`  
Destination : `V2.wealthtechinnovations.com`

### EVOTE

Sources :

```text
evote.chainsolutions.fr
api.evote.chainsolutions.fr
```

Destinations :

```text
evote.wealthtechinnovations.com
api.evote.wealthtechinnovations.com
```

### Formation blockchain / évaluations

Sources :

```text
itic4fima.chainsolutions.fr
api.itic4fima.chainsolutions.fr
```

Destinations :

```text
evaluations.wealthtechinnovations.com
api.evaluations.wealthtechinnovations.com
```

### Stablecoin

Sources :

```text
stablecoin.chainsolutions.fr
api.stablecoin.chainsolutions.fr
```

Destinations :

```text
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
```

Règle : copie uniquement, sans suppression de l’original sur S2.

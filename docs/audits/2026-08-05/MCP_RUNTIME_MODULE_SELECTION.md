# Sélection des modules récupérés du runtime S1

Date : 2026-08-05
Source forensique : PR #19, `mcp/recover-runtime-drift-20260805@7c8d9f782ae3195197345257f38fbc400504a848`
Statut : décision de réintégration, aucun déploiement

## 1. Principe

La PR #19 conserve fidèlement la dérive observée sur S1. Elle n'est pas une branche de production et ne doit pas être fusionnée telle quelle.

Chaque capacité utile doit être reconstruite depuis une base propre, avec :

- mapping GitRegistry validé ;
- catalogue READ/WRITE explicite ;
- chemins et remotes vérifiés ;
- `allow_write` pour toute mutation ;
- tests ciblés ;
- audit ;
- sauvegarde et rollback lorsque nécessaire ;
- PR indépendante.

## 2. Classification globale

| Groupe | Décision | Motif |
|---|---|---|
| Documents d’audit | CONSOLIDÉ DANS PR #18 | Une seule source documentaire canonique |
| Séparation READ/WRITE de PR #20 | RECONSTRUIRE SUR BASE PROPRE | Principe validé, base #19 non fusionnable |
| Extraction AMF-UMOA | RÉINTRODUIRE APRÈS REFACTOR | Fonction métier utile, script et publication à durcir |
| Transfert AMF vers BRVMDATA | REFACTORER FORTEMENT | Clone/commit/push directs et chemins hardcodés |
| SADIAAF | RÉINTRODUIRE PAR PR PROJET | Mapping, tests, déploiement et rollback dédiés requis |
| Nigeria | RÉINTRODUIRE PAR PR PROJET | Bootstrap, patch, Git et déploiement à séparer |
| Legacy Funds | RÉINTRODUIRE PAR PR PROJET | `npm install`, build et restart doivent être séparés |
| Legacy Vhosts | DIFFÉRER LES MUTATIONS | Delete/purge trop sensibles avant Registry v2 |
| Scripts de patch ad hoc | ARCHIVER, NE PAS EXÉCUTER | Modifient le code par remplacement d’ancres |
| Fragments `amf_registry_parts/*` | ARCHIVE FORENSIQUE | Fragments de reconstruction, pas source canonique maintenable |
| `readOnly.ts` / `writeScoped.ts` de #19 | NE PAS REPRENDRE TELS QUELS | Mélange de capacités et alias cachés |
| `docker-compose.override.yml` local | PREUVE FORENSIQUE UNIQUEMENT | Provenance runtime, pas configuration canonique validée |

## 3. AMF-UMOA

### À conserver fonctionnellement

- lecture des métadonnées de la dernière extraction ;
- transfert borné d’une archive ;
- lecture de ressources publiques AMF ;
- extraction du registre dynamique ;
- génération SQLite/CSV/JSON et conservation des documents sources.

### À corriger avant réintégration

- séparer strictement les outils de lecture et de mutation ;
- supprimer les alias cachés de `curl_domain` ;
- remplacer le nom public daté et hardcodé par un artefact versionné et manifesté ;
- rattacher le chemin de publication à un mapping actif ;
- ajouter un manifeste avec taille, SHA-256, source, date et rollback ;
- tester l’idempotence et les extractions partielles ;
- ne pas conserver comme source canonique les fragments `part_000` à `part_014` ;
- reconstruire un script source unique, lisible et testé.

### PR cible

`mcp/amf-registry-readonly-foundation`

Puis, séparément :

`mcp/amf-registry-export-publication`

## 4. BRVMDATA

Le script forensique effectue directement clone, remplacement de fichiers, commit et push.

### Décision

Ne pas reprendre le script tel quel.

Créer trois opérations distinctes :

1. `brvmdata_amf_preflight` — lecture seule ;
2. préparation d’un artefact dans un worktree temporaire borné ;
3. création d’une branche et ouverture d’une PR via un service GitHub contrôlé.

### Interdictions

- aucun push vers `main` ou `master` ;
- aucun token dans l’URL du remote ;
- aucune suppression d’un chemin non déclaré ;
- aucun clone dans un chemin fourni librement ;
- aucun commit automatique sans manifeste des fichiers modifiés ;
- aucun push direct sans branche `mcp/*` et PR draft.

## 5. SADIAAF

### Capacités read-only à retenir

- contexte des projets ;
- statut Git ;
- inventaire et lecture bornée de fichiers ;
- recherche ;
- diff ;
- contrôles HTTP et processus.

### Capacités de mutation à réintroduire plus tard

- patch de fichiers ;
- préparation de branche ;
- commit/push ;
- build et qualité ;
- déploiement ;
- quarantaine ;
- restauration ;
- rollback.

Toutes nécessitent un mapping projet/environnement, une racine réelle vérifiée et un manifeste de rollback.

## 6. Nigeria

Réintroduire dans l’ordre :

1. statut et inventaire read-only ;
2. bootstrap réversible dans un chemin proposé ;
3. patch borné ;
4. branche/commit/PR ;
5. tests ;
6. déploiement séparé ;
7. rollback.

Ne pas associer automatiquement le projet Nigeria à la base ou au domaine FundAfrica sans mapping validé.

## 7. Legacy Funds

### À corriger

- remplacer `npm install` par `npm ci` lorsqu’un lockfile existe ;
- séparer installation, tests, build, restart et health check ;
- ne pas écrire directement dans la racine active ;
- construire une release candidate distincte ;
- basculer seulement après validation ;
- conserver la release précédente comme rollback.

## 8. Legacy Vhosts

### Lecture à conserver

- contexte ;
- inventaire ;
- lecture bornée ;
- recherche ;
- statut Git.

### Mutations différées

- écriture ;
- initialisation Git ;
- commit/push ;
- déploiement ;
- suppression ;
- purge.

`legacy_vhost_delete_path_s1` et `legacy_vhost_purge_s1` restent interdits jusqu’à :

- GitRegistry v2 actif ;
- quarantaine obligatoire ;
- rétention définie ;
- manifeste signé ;
- sauvegarde vérifiée ;
- validation humaine spécifique.

## 9. Scripts ad hoc à archiver

Les fichiers suivants expliquent comment la dérive a été fabriquée mais ne doivent pas être exécutés ni fusionnés comme mécanisme durable :

- `scripts/fix-amf-readonly.js` ;
- `scripts/patch-brvmdata-amf.js` ;
- `scripts/register-amf-registry.js`.

Ils modifient les sources par recherche d’ancres textuelles. Leur logique utile doit être réécrite directement en TypeScript avec tests.

## 10. Ordre des futures PR

1. PR #21 — diagnostic GitHub read-only corrigé ;
2. PR documentaire #18 ;
3. fondation propre de classification READ/WRITE ;
4. GitRegistry v2 en lecture duale et dry-run ;
5. modules read-only projet par projet ;
6. mutations Git réversibles ;
7. build et release candidates ;
8. déploiement et rollback ;
9. quarantaine ;
10. purge différée.

## 11. Verdict

- PR #19 : conservation forensique, `DO NOT MERGE` ;
- PR #20 : principe réutilisable, branche actuelle non fusionnable ;
- aucun module post-29 n’est perdu ;
- aucun module post-29 n’est autorisé automatiquement en production ;
- la reconstruction se fera par capacités explicites et PR indépendantes.

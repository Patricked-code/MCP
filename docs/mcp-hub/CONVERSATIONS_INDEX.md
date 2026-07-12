# Index central des conversations MCP

Date de l’inventaire : 2026-07-13.

## Résultat de l’inventaire documentaire

L’inventaire sécurisé du dépôt exécuté sur S1 a identifié 227 fichiers utiles dans le périmètre autorisé :

| Zone | Fichiers visibles | Rôle |
|---|---:|---|
| Racine | 62 | règles, gouvernance, suivi, architecture |
| `docs/` | 31 | documentation maintenue et rapports |
| `memory/` | 62 | mémoire conversationnelle et opérationnelle |
| `wealthtech_project_memory/` | 34 | copie historique partielle de la mémoire |
| `Migration/` | 7 | contexte, plan, manifeste et publication |
| `.mcp/` | 8 | configuration machine-readable |
| `src/` | 19 | code TypeScript |
| Autres | 4 | données, conteneur, logs d’inventaire |

Répartition par format : 188 Markdown, 19 TypeScript, 18 JSON, 1 YAML et 1 Dockerfile.

Ces chiffres décrivent les fichiers autorisés par l’outil d’inventaire : profondeur maximale 5, secrets, clés, `.env`, `.git`, `node_modules`, `dist`, `build` et `coverage` exclus.

## Index chronologique disponible

| Date | Sujet | Source principale | Statut |
|---|---|---|---|
| 2026-05-05 | Stablecoin E-WARI, KOREE et mémoire projet | `memory/2026-05-05-stablecoin-ewari-conversation-memory.md` | RESUME_STRUCTURE |
| 2026-07-01 | MCP, S1/S2, migrations | `memory/CONVERSATION_PART_01_MCP_SERVERS_MIGRATION_2026-07-01.md` | RESUME_STRUCTURE |
| 2026-07-01 | Écosystème et Loop Engineering | `memory/CONVERSATION_PART_02_ECOSYSTEM_LOOP_ENGINEERING_2026-07-01.md` | RESUME_STRUCTURE |
| 2026-07-01 | EWARI, KOREE, Stablecoin | `memory/CONVERSATION_PART_03_EWARI_KOREE_STABLECOIN_2026-07-01.md` | RESUME_STRUCTURE |
| 2026-07-01 | Index des conversations compilées | `memory/CONVERSATION_COMPILED_INDEX_2026-07-01.md` | RESUME_STRUCTURE |
| 2026-07-01 | Registre des conversations poussées | `memory/CONVERSATIONS_POUSSEES_20260701.md` | RESUME_STRUCTURE |
| 2026-07-01 | Installation et synchronisation serveur | `memory/MCP_INSTALLATION_AND_SERVER_SYNC_2026-07-01.md` | RESUME_STRUCTURE |
| 2026-07-02 | Import d’une conversation ChatGPT externe | `memory/GUIDE_IMPORT_CONVERSATION_CHATGPT_EXTERNE_20260702.md` | A_IMPORTER |
| 2026-07-02 | Corpus local, traçabilité, plan et Loop Engineering | plusieurs fichiers `memory/INTEGRATION_*`, `MATRICE_*`, `PLAN_*` | RESUME_STRUCTURE |
| 2026-07-03 | Synchronisation MCP et clôture Loop Engineering | fichiers `memory/*20260703.md` | RESUME_STRUCTURE |
| 2026-07-04 | Migration WealthTech et manifeste des sources | `Migration/01_*.md` à `Migration/04_*.md` | RESUME_STRUCTURE |
| 2026-07-08 | Organisation GitHub, Codespaces, inventaires de code | fichiers `memory/CHAINSOLUTIONS_*` et `docs/reports/*` | RESUME_STRUCTURE |
| 2026-07-09 | Gouvernance anti-dispersion et cartographie MCP | `MCP_ANTI_DISPERSION_GOVERNANCE.md`, `MCP_FUNCTIONAL_CARTOGRAPHY.md` | TRANSCRIPT_VERIFIE pour les documents, pas pour les chats |
| 2026-07-11 | Durcissement read-only, CI et état documentaire | PR #11 | RESUME_STRUCTURE |
| 2026-07-12 | Revue technique et documentaire de la PR #11 | conversation de travail à importer dans `memory/` | A_IMPORTER |
| 2026-07-13 | Hub central, connexion Codex, inventaire et cartographie | ce dossier | RESUME_STRUCTURE |

## Conversation externe connue mais non importée

- référence : `https://chatgpt.com/share/6a448c60-5794-83ed-8558-f1f4871748e5` ;
- état : lien connu, transcript intégral non disponible dans le dépôt ;
- action : exporter le contenu avec le compte autorisé, scanner les secrets, calculer son SHA-256 et l’intégrer dans `memory/`, puis mettre à jour cet index central.

## Ordre de lecture recommandé

### Reprise rapide

1. `docs/mcp-hub/README.md`
2. `SUIVI.md`
3. `SOURCE_OF_TRUTH.md`
4. `PRODUCTION_STATE.json`
5. `MCP_ANTI_DISPERSION_GOVERNANCE.md`
6. `docs/mcp-hub/SERVER_INVENTORY_AND_CARTOGRAPHY.md`

### Reprise historique complète

1. `memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md`
2. `memory/CONVERSATIONS_POUSSEES_20260701.md`
3. `memory/CONVERSATION_COMPILED_INDEX_2026-07-01.md`
4. les parties 01, 02 et 03 ;
5. `memory/LOOPBACK_WEALTHTECH_CURRENT.md`
6. `memory/LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md`
7. `Migration/README.md`.

## Doublons et risques de dispersion

- `memory/` et `wealthtech_project_memory/memory/` contiennent des copies partielles ;
- certains documents existent à la racine et sous `docs/` ;
- `docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md` contient une base historique du 1er juillet ; l’état actuel est OAuth minimal actif ;
- `SUIVI.md` conserve des sections historiques qui doivent être lues avec leur date ;
- la PR #11 propose des corrections documentaires non encore fusionnées.

Aucune suppression ou fusion de doublons ne doit être faite avant comparaison de contenu, conservation de l’historique et décision explicite.

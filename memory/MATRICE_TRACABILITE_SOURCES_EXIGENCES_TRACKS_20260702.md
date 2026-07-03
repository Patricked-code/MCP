# MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702

Date UTC : 2026-07-02T16:44:36.871984+00:00
Objet : prouver comment les documents, prompts, reponses compilees et rapports alimentent le Loop Engineering WealthTech.

## Exigences consolidees
| ID | Exigence | Tracks | Preuve |
|---|---|---|---|
| R01 | Lire la memoire et le point de reprise avant action | F0, A4, B1, C1, E1, D1, G1, H1, I1 | LOOPBACK_WEALTHTECH_CURRENT.md, SUIVI_MEMORY.md, playbook |
| R02 | Ne jamais supprimer sans inventaire, matrice et validation | E1, D1, A4, C1 | Word Loop Engineering, docs/agents, SECURITY_NOTES, prompts audit |
| R03 | Proteger S2 et les originaux Stablecoin | B1, C1, E1, D1 | AUDIT_GLOBAL_S1_S2_MCP_PROMPT, stablecoin memory, playbook |
| R04 | Ne jamais exposer secrets, .env, tokens, cles, dumps | F0, B1, C1, D1, I1 | SECURITY_NOTES, check-no-secrets, scans cibles |
| R05 | Stabiliser memoire GitHub MCP pour eviter ecrasement sync | F0 | manifest, git status, sync logs, playbook F0 |
| R06 | Preparer refonte du site principal sans toucher prod | A4 | rapports A2/A3, site_principal_refonte_a3.json |
| R07 | Auditer Stablecoin 6BI-B sans transaction | B1 | CODEX_HANDOFF_STABLECOIN_EWARI, PROMPT_AUDIT_6BI_B |
| R08 | Auditer OPCVM/FundAfrica sans regression | C1 | PROMPT_AUDIT_OPCVM, inventaire S2, reports Track A |
| R09 | Nettoyage uniquement par matrice tailles/dependances | E1 | Loop Engineering docx, legacy reports, local Niakra TSV |
| R10 | Migrer S2 vers S1 seulement apres backup/GitHub/.env.example/tests | D1 | Word Loop Engineering, audit prompt migrations |
| R11 | Architecture cible modulaire Redis/ClickHouse/Docker, Kubernetes futur | G1 | Word Loop Engineering, conversation compiled ecosysteme |
| R12 | Site ChainSolutions SSR SEO-first avec admin/blog/contact | H1 | Chatgpt creation site chainsolutions.docx, instruction brut site web wealthtech |
| R13 | Inventaire GitHub global et mapping repo-prod-domaines | I1 | workspace local, GITHUB_REPOSITORIES.md, PROJECTS_MAPPING.md |
| R14 | Documenter chaque boucle: rapport, JSON, tests, risques, prochaine action | F0, A4, B1, C1, E1, D1, G1, H1, I1 | Loop Engineering docx, playbook, reports existants |
| R15 | Traiter sources historiques comme contexte, pas verite actuelle | A4, E1, D1, H1 | Integration rapports legacy et locaux |

## Sources vers exigences
| Source | Type | Tracks | Exigences | Statut |
|---|---|---|---|---|
| `2026-05-05-stablecoin-ewari-conversation-memory.md` | memoire metier | B1, G1 | R03, R04, R07, R11 | integre |
| `CODEX_HANDOFF_STABLECOIN_EWARI.md` | handoff | B1 | R03, R04, R07 | integre |
| `PROMPT_AUDIT_6BI_B.md` | prompt audit | B1 | R03, R04, R07, R14 | integre |
| `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md` | prompt audit | C1 | R04, R08, R14 | integre |
| `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md` | prompt audit serveur | A4, C1, E1, D1 | R02, R03, R09, R10, R14 | integre |
| `Loop Engineering Instructions.docx extract` | document source | F0, A4, B1, C1, E1, D1, G1, H1, I1 | R01, R02, R03, R04, R09, R10, R11, R14 | 669 paragraphes integres |
| `AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md` | rapport | A4, C1, E1, D1 | R06, R08, R09, R10, R15 | integre |
| `AUDIT_SITE_PRINCIPAL_WEALTHTECH_A2_20260701_100358.md` | rapport | A4 | R06, R15 | integre |
| `AUDIT_SITE_PRINCIPAL_WEALTHTECH_A3_20260702_053646.md` | rapport | A4 | R06, R15 | integre |
| `docs/ + agents/` | documentation serveur | F0, E1, D1, I1 | R01, R02, R04, R14 | 29 fichiers lus |
| `rapports legacy /root/wealthtech_audit_reports` | historique audit | A4, E1, D1 | R09, R10, R15 | 4 rapports + 16 raw + 144 HTTP integres |
| `rapports locaux Niakra TSV/TXT/MD` | historique local | A4, E1 | R09, R15 | 6 fichiers locaux indexes |
| `Chatgpt creation site chainsolutions.docx` | expression besoin site | H1 | R12, R14 | 688 paragraphes integres |
| `instrucion brut site web wealthtech.txt` | besoin brut | H1 | R12 | integre |
| `wealthtech-workspace local` | centre pilotage | F0, I1, E1, D1 | R04, R05, R13, R14 | 14 docs + 4 scripts indexes |
| `chatgpt.com/share/6a448c60...` | conversation externe | F0, G1 | R01, R14 | referencee seulement, transcript brut manquant |

## Tracks vers sources
### F0 - Persistance memoire MCP/GitHub
- `Loop Engineering Instructions.docx extract`
- `docs/ + agents/`
- `wealthtech-workspace local`
- `chatgpt.com/share/6a448c60...`

### A4 - Refonte/preproduction site principal WealthTech
- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `Loop Engineering Instructions.docx extract`
- `AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md`
- `AUDIT_SITE_PRINCIPAL_WEALTHTECH_A2_20260701_100358.md`
- `AUDIT_SITE_PRINCIPAL_WEALTHTECH_A3_20260702_053646.md`
- `rapports legacy /root/wealthtech_audit_reports`
- `rapports locaux Niakra TSV/TXT/MD`

### B1 - Stablecoin E-WARI 6BI-B
- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `CODEX_HANDOFF_STABLECOIN_EWARI.md`
- `PROMPT_AUDIT_6BI_B.md`
- `Loop Engineering Instructions.docx extract`

### C1 - FundAfrica / OPCVM / Chainsolutions metier
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md`
- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `Loop Engineering Instructions.docx extract`
- `AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md`

### E1 - Matrice nettoyage S1/S2
- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `Loop Engineering Instructions.docx extract`
- `AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md`
- `docs/ + agents/`
- `rapports legacy /root/wealthtech_audit_reports`
- `rapports locaux Niakra TSV/TXT/MD`
- `wealthtech-workspace local`

### D1 - Migration WealthTech S2 vers S1
- `AUDIT_GLOBAL_S1_S2_MCP_PROMPT.md`
- `Loop Engineering Instructions.docx extract`
- `AUDIT_GLOBAL_S1_S2_TRACK_A_20260701_095456.md`
- `docs/ + agents/`
- `rapports legacy /root/wealthtech_audit_reports`
- `wealthtech-workspace local`

### G1 - Architecture ecosysteme unifie
- `2026-05-05-stablecoin-ewari-conversation-memory.md`
- `Loop Engineering Instructions.docx extract`
- `chatgpt.com/share/6a448c60...`

### H1 - Site corporate ChainSolutions
- `Loop Engineering Instructions.docx extract`
- `Chatgpt creation site chainsolutions.docx`
- `instrucion brut site web wealthtech.txt`

### I1 - Inventaire GitHub global
- `Loop Engineering Instructions.docx extract`
- `docs/ + agents/`
- `wealthtech-workspace local`

## Gaps et limites
- Le transcript brut de la conversation externe ChatGPT partagee reste manquant; seule sa reference est integree.
- Les sources historiques sont utiles pour comprendre, mais tout changement production exige un audit courant.
- Les fichiers 20260702 ne sont pas encore commit/push dans MCP; la persistance durable requiert validation utilisateur.

## Usage
Avant de lancer un track, lire la ligne du track, les sources associees, puis ouvrir les fichiers sources correspondants. Toute action non couverte par une exigence doit etre documentee avant execution.

<!-- FINAL_COMPLETION_AUDIT_20260702_START -->
## Audit final completude / readiness commit - 2026-07-02

Livrable : `memory/AUDIT_FINAL_COMPLETUDE_ET_READY_COMMIT_MCP_20260702.md`.

Verdict : les sources disponibles sont lues et integrees dans le Loop Engineering. Reste non prouve uniquement le transcript brut de la conversation ChatGPT externe, qui exige un export/copie authentifiee. Les fichiers 20260702 sont prets pour commit/push MCP mais exigent validation explicite.

Prochaine action sure : valider ou refuser le commit/push MCP des fichiers `memory/` listes dans l audit final.
<!-- FINAL_COMPLETION_AUDIT_20260702_END -->

<!-- CHATGPT_IMPORT_OAUTH_20260702_START -->
## Import conversation externe et OAuth MCP - 2026-07-02

Nouveaux livrables :
- `memory/GUIDE_IMPORT_CONVERSATION_CHATGPT_EXTERNE_20260702.md`
- `memory/INTEGRATION_OAUTH_CHATGPT_CLAUDE_GITHUB_MCP_20260702.md`

Decision : le transcript brut de la conversation ChatGPT partagee reste le seul contenu manquant. Son import exige un export/copie authentifiee et un scan secrets avant integration. Le document OAuth MCP confirme que l integration ChatGPT avancee necessiterait OAuth 2.1 futur; le MCP actuel reste en Bearer token statique/read-only-first.
<!-- CHATGPT_IMPORT_OAUTH_20260702_END -->

<!-- S17_CODEX_WORKSPACE_SEARCH_20260702_START -->
## Addendum S17 - Recherche elargie Documents/Codex

Source : `memory/INTEGRATION_CODEX_WORKSPACE_RECHERCHE_ELARGIE_20260702.md`.

Exigences couvertes :
- tracer les sources locales historiques ;
- ne pas rejouer les scripts de build/reload/reconfiguration sans validation ;
- utiliser les sous-domaines mentionnes comme entrees de la future matrice E1 ;
- maintenir la refonte A4 en preproduction parallele.

Tracks relies : `F0`, `A4`, `E1`, et futur track Niakara si demande.
<!-- S17_CODEX_WORKSPACE_SEARCH_20260702_END -->

<!-- S18_ROOT_ONLY_MEMORY_20260702_START -->
## Addendum S18 - Memoire secondaire /root integree

Source : `memory/INTEGRATION_MEMOIRE_ROOT_ONLY_20260702.md`.

Fichiers : conversation compilee EWARI/MCP, installation memoire MCP, memo acces MCP/GitHub/serveurs, memo stablecoin EWARI, prompt audit MCP.

Exigences couvertes : memoire durable, read-only-first, preservation des domaines, absence de secrets dans GitHub, documents BCEAO/WITTI/livre blanc/architecture, wallet et smart contract EWARI.

Tracks relies : `F0`, `B1`, `E1`, `I1`, `A4`.
<!-- S18_ROOT_ONLY_MEMORY_20260702_END -->

<!-- S19_DOCUMENTS_DOWNLOADS_CORPUS_20260702_START -->
## Addendum S19 - Corpus local Documents/Downloads

Source : `memory/INTEGRATION_CORPUS_LOCAL_DOCUMENTS_DOWNLOADS_20260702.md`.

Tracks relies : `C1`, `C2`, `B1`, `B2`, `H1`, `A4`, `F0`.

Exigences couvertes : prise en compte des prompts/specs OPCVM, documents stablecoin/EWARI, ChainSolutions/BRVM, documents institutionnels WealthTech et cadrage BCEAO/WITTI.
<!-- S19_DOCUMENTS_DOWNLOADS_CORPUS_20260702_END -->

<!-- S20_DOCUMENTS_DOWNLOADS_COMPLETE_REGISTER_20260702_START -->
## Addendum S20 - Registre complet Documents/Downloads

Source : `memory/REGISTRE_COMPLET_CORPUS_LOCAL_DOCUMENTS_DOWNLOADS_20260702.md`.

Preuve : passe Unicode fiable, 331 chemins pertinents, 204 documents sûrs lus/extraits, fichiers sensibles masques/exclus. Tracks relies : `C1`, `C2`, `B1`, `B2`, `H1`, `A4`, `F0`.
<!-- S20_DOCUMENTS_DOWNLOADS_COMPLETE_REGISTER_20260702_END -->

<!-- S21_MCP_SERVER_SYNC_SOURCES_20260703_START -->
## Addendum S21 - Sources MCP/serveur/synchronisation

Source : `memory/INTEGRATION_SOURCES_MCP_SERVEUR_SYNCHRONISATION_20260703.md`.

Tracks relies : `F0`, `A4`, `E1`, `I1`. Exigences : synchronisation recurrente tracee, audits read-only, blocage des outils d'ecriture MCP sans validation, exclusion des fichiers sensibles.
<!-- S21_MCP_SERVER_SYNC_SOURCES_20260703_END -->

# AGENTS.md — Registre synthétique des agents

## 1. Rôle du fichier

Ce fichier liste les agents humains/IA/MCP, leurs responsabilités et leurs limites d’action.

## 2. Contexte MCP

Projet : WealthTech MCP SSH Bridge
Dépôt GitHub attendu : Patricked-code/MCP
Branche officielle : main
Chemin serveur validé : /opt/apps/wealthtech-mcp-ssh-bridge

Règles transversales :
- ne jamais coder à l’aveugle ;
- lire SUIVI.md et les fichiers de mémoire avant action ;
- ne jamais écrire de secrets, tokens, mots de passe, clés privées ou .env dans Git ;
- ne jamais écraser un fichier existant sans lecture préalable ;
- ne jamais supprimer sans inventaire ;
- documenter toute action importante dans SUIVI.md, CHANGELOG.md et DECISIONS_LOG.md ;
- conserver la logique parent/enfant : racine MCP globale, puis docs/projects/<projet>/ pour chaque projet intégré.


## 3. Fonctionnement attendu

Ce fichier doit être utilisé comme une pièce de mémoire opérationnelle. Il doit informer, contraindre, guider et tracer. Il ne doit pas être vide et ne doit pas servir de simple placeholder.

## 4. Règles applicables

- Lire ce fichier avec `SUIVI.md` avant les actions liées à son périmètre.
- Conserver les informations existantes lorsqu’un équivalent existe dans `docs/` ou `memory/`.
- Ne jamais transformer une hypothèse en certitude.
- Écrire `À vérifier` lorsqu’une donnée n’a pas été confirmée.
- Lier les tâches exécutables à `TASKS.md`.
- Lier les décisions à `DECISIONS_LOG.md`.
- Lier les changements visibles à `CHANGELOG.md`.

## 5. Informations à vérifier

- Cohérence avec `docs/AGENTS.md` si ce fichier existe.
- Cohérence avec `memory/AGENTS.md` si ce fichier existe.
- Cohérence avec les fichiers `.mcp/*.json`.
- Cohérence avec le dépôt GitHub `Patricked-code/MCP`.
- Cohérence avec le serveur `/opt/apps/wealthtech-mcp-ssh-bridge`.

## 6. Mise à jour

Ce fichier doit être enrichi au fur et à mesure de l’intégration des projets, de l’audit des dépôts, des changements d’agents et des décisions humaines.

## 7. Historique

- 2026-07-09 : création racine par écriture contrôlée MCP, sans secret, sans suppression et sans modification applicative.

## 7.1 Program Backlog V2 — continuité automatique commune à tous les agents

Tout agent humain ou IA qui reprend le dépôt charge `docs/governance/program-backlog-convergence.json`, exécute `npm run program:readiness` puis consulte `npm run program:next`. La sélection planning suit `FIRST_COLLISION_FREE_IN_PROGRAM_ORDER`; les autorités runtime et UAC restent obligatoires avant tout claim ou write.

Boucle commune : `OBSERVE → RECOMPUTE_READINESS → SELECT → CHECK_COLLISIONS → MATERIALIZE/CLAIM → EXECUTE → VERIFY → CHECKPOINT → RECOMPUTE`. Tant qu'un prochain lot est dependency-safe, collision-safe et ne requiert aucune gate humaine, l'agent continue sans demander une confirmation de routine.

Le moteur de readiness est une projection Git versionnée : il ne crée pas de Task, ne claim rien, ne libère aucun ownership, ne contourne aucun lock et ne transforme jamais un `DEFERRED`/`CONDITIONAL` en `READY`.

## 8. GWC — architecture et mémoire canonique de continuité

Pour toute intervention liée à GWC, au Universal Resolver, aux 73 contrats, aux blueprints GWC ou à leur future matérialisation en Governed Tasks :

1. lire `docs/gwc/README.md` ;
2. lire `docs/gwc/canonical-memory/current.json` pour résoudre le bundle de continuité courant ;
3. vérifier le bundle sélectionné avec un Canonical Memory Verifier compatible avant d’en projeter les claims ;
4. lire ensuite les projections `.mcp/gwc-contracts.json`, `.mcp/gwc-workflow-graph.json`, `.mcp/gwc-blueprints.json` et `.mcp/gwc-evolution-design.json` selon le besoin ;
5. réobserver les autorités live applicables avant toute mutation.

La mémoire canonique GWC fournit de la **continuité et de la provenance**, jamais une approbation live. Un claim `historical_authority` ne remplace ni GitHub live, ni la Governed Task Queue, ni la Governed Session, ni le Bootstrap Receipt, ni les locks, ni Live State, ni le runtime. Un ancien bundle reste immuable ; une phase plus récente est portée par un nouveau bundle et le pointeur `current.json`.


---

## Règle permanente — double présence, non-régression et amélioration continue

GitHub est la source versionnée.

Le serveur MCP est la source exécutée.

Les deux doivent toujours être vérifiés ensemble avant et après toute intervention.

Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification.

Toute intervention humaine, IA ou automatisée doit respecter :

- non-régression obligatoire ;
- amélioration continue obligatoire ;
- aucune suppression destructive sans sauvegarde, justification et validation ;
- aucun secret dans GitHub ;
- vérification GitHub + serveur avant modification ;
- documentation dans `SUIVI.md` après modification ;
- vérification service, logs et endpoints après déploiement.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## GitHub-first operational continuity

Current post-integration bootstrap rule:

- GitHub connectivity is sufficient to reconstruct continuity and continue all GitHub-bounded work.
- Do not request or require `wealthtech_ssh_bridge`, a Governed Session, Task Queue mutation, locks or Live State merely to know where the project is or to perform repository/branch/PR/CI/review work.
- Read `.mcp/github-first-operational-policy.json` and resolve the next bounded operation with `resolveGithubFirstOperationalBootstrap()`.
- Use `GITHUB_ONLY` when GitHub is sufficient.
- Use `GITHUB_ACTION_READONLY_EVIDENCE` when fresh server evidence is required and the protected read-only fallback is configured.
- Escalate to `RUNTIME_REQUIRED` only for the exact operation that genuinely needs runtime authority, Operational Memory mutation, server write, or a runtime capability without an approved GitHub fallback.
- Existing runtime authorities remain authoritative in their scopes; GitHub-first defers them when irrelevant and never fabricates their state.
- The read-only fallback never authorizes pull, deploy, restart, arbitrary shell, server-to-GitHub push or direct server-side versioned-code edits.

Canonical machine policy: `.mcp/github-first-operational-policy.json`.
Design: `docs/superpowers/specs/2026-09-20-github-first-operational-continuity-v1-design.md`.

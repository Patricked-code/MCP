# MCP_ONBOARDING_ENGINE.md

## Rôle

Le moteur d’onboarding exécute le bootstrap obligatoire d’un agent sur le repository gouverné. Il compose les briques existantes Live State, Governed Context et Operational Memory ; il ne crée aucune source de vérité parallèle.

## Procédure
1. Appeler `ping`, puis `mcp_reconcile_governed_context`.
2. Lire `mcp://wealthtech/current-state/inventory` ou `mcp_get_current_state_inventory`.
3. Vérifier Live State, SHA GitHub/S1/runtime, catalogue, architecture, audits, politiques et contradictions.
4. Reprendre une governed session compatible ou appeler `mcp_open_governed_session`.
5. Appeler `mcp_acknowledge_governed_context` pour créer un Bootstrap Receipt sanitizé.
6. Projeter la nouvelle instruction sous forme bornée et appeler `mcp_reconcile_agent_intent`.
7. Appeler `mcp_claim_next_governed_task` : la première tâche exécutable par priorité puis séquence est traitée avant la nouvelle.
8. Exécuter sous locks et révisions optimistes, puis suivre CI, reviews, merge, déploiement exact-SHA, attestation et checkpoint.

Les surfaces runtime réelles sont des outils et ressources MCP. Aucune route HTTP d’onboarding distincte n’est déclarée.

## Règle
Aucun onboarding ne doit créer de secret dans Git ni donner de droits implicites. Le WRITE gate reste `shadow` pendant V1 : les nouveaux verdicts sont observés et journalisés, jamais bloquants. `ENABLE_WRITE_TOOLS` et `allow_write` conservent leur autorité historique.

# TODO spécifique — worker durable (PLAN ONLY)
> **Sous-chantier** : `WT-MCP-AUTONOMY-24X7-20261121-01` · **Mission parente** : `WT-MCP-REGISTRY-RESOLUTION-20261121-01` · **Projet MCP** : `WT-PROJECT-MCP-001` (UID candidat, pas de ProjectRecord runtime attesté).
> **Source** : `Loop Engineering.docx` SHA256 `91eb8a4f733c417d394c2ed6680a5ac395d309f95910476edf4eb136d84c0548`, partie B, identifiant **proposé non créé** dans la source ; la création ici concerne **uniquement la documentation sur une branche GitHub**.
> **Registre runtime Task** : Governed Task Queue existante ; **Session/claim/locks** : services MCP existants ; **Owner du code UAES** : dépôt `chainsolutions-wealthtech/universal-agent-engineering-system`.
> **État** : DOCUMENTED_CANDIDATE / NO_RUNTIME_ADMISSION / NO_WORKER_DEPLOYED.

- [ ] RG-043 — Vérifier et relier ports C26 existants, P2 OWNED_FIRST, sessions transport et UAC ; tests refuse/deny/ownership.
- [ ] RG-044 — Intention admise via les outils existants après classification et preuve du TargetScope ; idempotence CUG.
- [ ] RG-045 — Scheduler qui reprend d'abord l'owned task, puis FIRST_COLLISION_FREE_IN_PROGRAM_ORDER ; fail-closed en cas de claim étranger.
- [ ] RG-046 — Audit en lecture seule des ressources de S1 et état réel UAES U02, secrets, sauvegardes/restauration, rollback.
- [ ] RG-047 — Agent host durable avec lookup/start-or-resume atomique et environnement de code jetable, quotas modèle.
- [ ] RG-048 — Daemon isolé, supervisé, test restart/replay/backpressure, métriques externe.
- [ ] RG-049–051 — Chaîne PR → CI → revue indépendante → merge gouverné → OIDC Deploy → G1 → C27.
- [ ] RG-052–054 — Cockpit usine et preuves, documentation locale enfant, liens vers parent.
- [ ] RG-055–056 — Pilote réellement exécuté puis endurance, sécurité et activation cible par cible.

**N.B.** Cette liste Markdown n'est PAS la Governed Task Queue ; ses cases ne prouvent ni exécution ni résultat runtime. Voir `__TASKS.md` et parent `__IMPLEMENTATION_PLAN.md`.

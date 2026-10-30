# 01 — GD-U-01 et compositions transversales

[← Entrée unique](./README.md) · [Issue #349](https://github.com/Patricked-code/MCP/issues/349) · [PR #355](https://github.com/Patricked-code/MCP/pull/355) · [Bifurcation versionnée](../universal-capabilities-bifurcation-20261028.json)

Les identifiants ci-dessous sont les noms historiques des tranches. Les validations citées sont celles des checkpoints, **pas une certification de déploiement**.

## Évolution et preuves du 28 octobre

- [#349, commentaire 24](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460680374) — Governed Deploy universel — Bifurcation GitHub-first ouverte, PR #355 (28/10/2026)
- [#349, commentaire 25](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460687375) — Checkpoint GD-U-01 — CI exacte GREEN (28/10/2026)
- [#349, commentaire 26](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460775637) — GD-U-A1 — Intelligence/autonomie gouvernée : code, tests, preuves (2026-10-28)
- [#349, commentaire 27](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460936452) — Checkpoint canonique — Bifurcation GD-U-MAX / GD-U-COMPOSE / GD-U-CONTINUITY, 2026-10-28
- [#349, commentaire 28](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461020317) — Checkpoint GD-U-EXPOSE — catalogue additif + méthode de travail, RED → GREEN → REGRESSION (2026-10-28)

## Correspondances et contrats

| Phase | Intention / code repère | Origine |
|---|---|---|
| GD-U-01 | Préflight des autorisations GitHub App, `src/github/installationCapabilityReadiness.ts` | [Checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460687375) |
| GD-U-A1 | Conseil autonome en lecture seule, compose le dispatcher existant ; `src/provisioning/universalAutonomyAdvice.ts` | [Checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460775637) |
| GD-U-MAX | Catalogue de capacités universelles ; ne pas confondre catalogue et outils exécutables | [Checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460936452) |
| GD-U-COMPOSE | Blueprint de dépendances GitHub → Plesk → serveur → HTTPS | [Même checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460936452) |
| GD-U-CONTINUITY | Reprise par Task Queue/Session/Checkpoint existants | [Même checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460936452) |
| GD-U-EXPOSE | Exposition et méthode `RED → GREEN → REGRESSION` | [Checkpoint](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461020317) |

Le fichier historique [`universal-capabilities-bifurcation-20261028.json`](../universal-capabilities-bifurcation-20261028.json) contient le programme `GD-U-01..07`, le catalogue et les mappings ; ses statuts sont un *snapshot* pouvant être dépassé par les commentaires ultérieurs.

Les étapes `GD-U-03..07` doivent être **reconciliées**, pas automatiquement déclarées non commencées ou terminées d'après ce snapshot.

Pour chaque entrée, ouvrir les [commits de #355](https://github.com/Patricked-code/MCP/pull/355/commits), les [contrôles CI](https://github.com/Patricked-code/MCP/actions/workflows/mcp-ci.yml) et les [preuves de commentaire](./source-links.json).

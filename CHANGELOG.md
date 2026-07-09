# CHANGELOG.md

## Role
Historique factuel des changements du depot MCP.

## 2026-07-09 - Bootstrap documentaire MCP
- Creation progressive des fichiers Markdown racine manquants.
- Conservation des fichiers deja presents sans ecrasement.
- Serveur confirme : /opt/apps/wealthtech-mcp-ssh-bridge.
- Depot attendu : Patricked-code/MCP.
- Branche : main.
- Limite : documentation seulement, aucun secret, aucune suppression, aucun deploiement.

## Regle
Chaque changement visible doit indiquer date, fichier, raison, impact, tests et rollback si applicable.

---

## 2026-07-09 — Validation production MCP GitHub ↔ serveur

- Ajout et validation de la gouvernance GitHub ↔ serveur MCP.
- Commit de référence : `fbc7c97 docs: formalize MCP GitHub production governance and inventory`.
- Validation Docker Compose réussie.
- Validation endpoint local `/health` réussie.
- Validation endpoint public `/health` réussie.
- Validation endpoints OAuth `.well-known` réussie.
- Validation `/mcp` sans token : `401 Unauthorized`, comportement attendu.
- Aucun secret critique ajouté.
- Aucune suppression destructive effectuée.

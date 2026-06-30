# AGENTS_ARCHITECTURE.md — Architecture des agents IA

## Objectif

Définir comment les agents IA doivent travailler en boucle sur l’écosystème WealthTech sans perdre le contexte, sans casser la production et sans exposer de secrets.

## Boucle standard

1. Lire `GPT.md`.
2. Lire `SUIVI.md`.
3. Lire le `POINT DE REPRISE COURANT`.
4. Identifier le serveur.
5. Identifier le domaine.
6. Inventorier.
7. Évaluer les risques.
8. Exécuter l’action autorisée.
9. Tester.
10. Documenter.
11. Mettre à jour le point de reprise.

## Agents recommandés

### Agent Architecte

Conçoit l’architecture cible WealthTech, Docker, microservices, base commune, Redis, ClickHouse et trajectoire Kubernetes.

### Agent Migration

Prépare les migrations S2 vers S1, GitHub, documentation, dry-run, tests et rollback.

### Agent Nettoyage

Inventorie les fichiers volumineux, sauvegardes, logs, caches et anciens projets sans toucher aux domaines protégés.

### Agent Sécurité

Vérifie secrets, clés, `.env`, RBAC, HTTPS, token MCP et règles GitHub.

### Agent Documentation

Maintient tous les fichiers Markdown et le point de reprise.

### Agent Tests

Teste HTTP, HTTPS, API, PM2, Docker, logs et non-régression.

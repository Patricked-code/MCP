# Plan d'exécution non destructif

## Phase 1 — Documentation

- publier cette branche documentaire
- ouvrir une PR draft
- ne pas fusionner automatiquement
- ne modifier ni S1 ni Docker

## Phase 2 — Snapshot forensique

Conserver :

- branche, HEAD et remote
- `git status`
- diff des fichiers suivis
- fichiers non suivis
- checksums
- catalogue des outils
- configuration Docker
- image ID, digest, labels et date
- volumes persistants
- journaux utiles sans secrets

Interdictions : aucun reset, clean, stash destructif ou suppression.

## Phase 3 — Baseline isolée

Créer un worktree ou clone de `097dac9`, puis exécuter :

- `npm ci`
- typecheck
- tests
- build
- scan de secrets
- instance isolée sur un autre port
- vérification OAuth, `/health` et `/mcp`
- comparaison des outils

## Phase 4 — Go/No-Go

GO uniquement si :

- tests verts
- image candidate attestée
- rollback prêt
- volumes compatibles
- parité fonctionnelle suffisante
- aucune perte de connexion GitHub durable
- validation humaine

## Phase 5 — Réalignement

Après autorisation :

- conserver l'image actuelle
- déployer l'image propre
- vérifier GitHub, S1 et Docker
- mettre à jour `PRODUCTION_STATE.json`
- mettre à jour `SUIVI.md`
- revenir immédiatement à l'ancienne image en cas d'échec

## Phase 6 — Évolution progressive

Ordre des PR :

1. séparation READ/WRITE
2. GitRegistry v2
3. frontend CRUD
4. écriture réversible
5. Git contrôlé
6. build
7. déploiement et rollback
8. quarantaine
9. purge différée
10. intégration projet par projet

Aucune opération destructive ne doit être réintroduite avant les phases de quarantaine et de purge
déclarée.

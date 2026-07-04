# PDF - Migration WealthTech / MCP

Ce dossier contient les archives PDF du contexte Migration disponibles au moment de la generation.

## PDF deja ajoutes

- `conversation_migration_part_01_of_05_2026-07-04.pdf`
- `conversation_migration_part_02_of_05_2026-07-04.pdf`

## Statut

Les parties 1 et 2 ont ete ajoutees directement par le connecteur GitHub. La partie 3 a ete refusee par le controle de securite du connecteur lors de l'ecriture directe du flux PDF. Le fichier `UPLOAD_STATUS_2026-07-04.md` explique cette limite.

## Sources textuelles dans le dossier Migration

Les fichiers textuels deja presents dans `Migration/` restent la reference lisible pour le contenu accessible :

- `Migration/01_CONTEXTE_CONVERSATIONS.md`
- `Migration/02_PLAN_MIGRATION_ET_SECURITE.md`
- `Migration/03_MANIFESTE_SOURCES.md`

## Pour une exhaustivite litterale

Ajouter les exports bruts des conversations ChatGPT/Claude dans `Migration/sources/`, verifier qu'ils ne contiennent pas de secrets, puis regenerer les PDF localement avec un environnement Git authentifie.

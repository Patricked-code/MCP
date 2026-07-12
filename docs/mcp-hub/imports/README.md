# Importer une conversation dans la mémoire MCP

## Destination canonique

Les conversations et mémoires conversationnelles du projet sont enregistrées dans :

```text
memory/
```

Ce dossier `docs/mcp-hub/imports/` contient uniquement le présent guide. Il ne doit pas recevoir les transcripts.

Le dossier `Migration/` est réservé au contexte, au plan, au manifeste et au journal de publication de la migration.  
Le dossier `wealthtech_project_memory/memory/` est une copie historique partielle et ne doit pas recevoir une seconde écriture automatique.

## Fichiers de registre à mettre à jour

Selon le contenu importé, vérifier et compléter :

- `memory/CONVERSATIONS_POUSSEES_20260701.md` ;
- `memory/INDEX_MEMOIRE_WEALTHTECH_20260701.md` ;
- `memory/CONVERSATION_COMPILED_INDEX_2026-07-01.md` ;
- `memory/manifest.json` si son schéma couvre le nouveau fichier ;
- `docs/mcp-hub/CONVERSATIONS_INDEX.md` comme index de navigation ;
- `SUIVI.md` pour le point de reprise, sans écraser les sections historiques.

## Formats acceptés

- Markdown UTF-8 ;
- texte brut UTF-8 converti en Markdown ;
- PDF textuel, après extraction et vérification ;
- export JSON lisible, après contrôle.

## Nommage

Conserver les conventions déjà présentes dans `memory/` :

```text
CONVERSATION_YYYYMMDD_<SUJET>.md
CONVERSATION_PART_<NN>_<SUJET>_YYYY-MM-DD.md
CHATGPT_<IDENTIFIANT>_TRANSCRIPT_YYYYMMDD.md
```

Exemples :

```text
CONVERSATION_20260712_REVUE_PR11.md
CHATGPT_6A448C60_TRANSCRIPT_20260702.md
```

## Métadonnées recommandées

Chaque nouveau fichier doit identifier explicitement :

```yaml
---
date: YYYY-MM-DD
source: ChatGPT|Claude|Codex|autre
titre: "..."
statut: TRANSCRIPT_VERIFIE|RESUME_STRUCTURE|REFERENCE_SEULE|A_IMPORTER
url_source: "si partageable"
sha256_source: "si un export brut existe"
contient_secrets: false
---
```

## Procédure

1. relire toute la conversation accessible ;
2. déterminer si le contenu est complet ou partiel ;
3. retirer tout token, mot de passe, clé privée, seed phrase, `.env`, dump, cookie et URL signée ;
4. ne jamais afficher les valeurs sensibles détectées ;
5. vérifier les doublons dans `memory/`, `docs/`, `Migration/` et `wealthtech_project_memory/` ;
6. compléter un fichier existant lorsqu’il représente déjà la même conversation ;
7. sinon créer le fichier assaini dans `memory/` ;
8. mettre à jour les index de mémoire pertinents ;
9. mettre à jour `docs/mcp-hub/CONVERSATIONS_INDEX.md` ;
10. travailler sur la branche `mcp/*` et la PR draft déjà actives pour cet objectif ;
11. ne jamais pousser directement sur `main` ;
12. ne pas fusionner, déployer ou synchroniser S1 automatiquement ;
13. vérifier après écriture le fichier, les index, le diff et l’absence de secrets.

## Interdictions

- ne jamais présenter un résumé comme un transcript complet ;
- ne jamais créer une copie dans plusieurs dossiers ;
- ne jamais utiliser `Migration/` comme stockage général des conversations ;
- ne jamais écrire automatiquement dans `wealthtech_project_memory/memory/` ;
- ne jamais publier de secrets ;
- ne jamais supprimer une ancienne mémoire avant comparaison et décision documentée.

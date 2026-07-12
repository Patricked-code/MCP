# Importer une conversation dans le hub MCP

## Formats acceptés

- Markdown UTF-8 ;
- texte brut UTF-8 ;
- PDF textuel ;
- export JSON lisible, après contrôle.

## Nommage

```text
YYYY-MM-DD_<SOURCE>_<SUJET_COURT>_<IDENTIFIANT>.md
```

Exemples :

```text
2026-07-12_CHATGPT_REVUE_PR11.md
2026-07-08_CLAUDE_CONNEXION_MCP.md
```

## Métadonnées obligatoires

Chaque fichier importé commence par :

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

1. exporter ou copier la conversation avec le compte autorisé ;
2. conserver une copie brute hors Git si elle contient des informations privées non publiables ;
3. retirer tout token, mot de passe, clé privée, seed phrase, `.env`, dump, cookie et URL signée ;
4. calculer le SHA-256 de l’export assaini ;
5. indiquer clairement s’il s’agit d’un transcript ou d’un résumé ;
6. placer le fichier assaini dans ce dossier ;
7. ajouter une ligne dans `../CONVERSATIONS_INDEX.md` ;
8. vérifier les doublons par date, titre, URL et hash ;
9. travailler sur une branche `mcp/*` ;
10. ouvrir une PR draft ;
11. faire relire avant fusion ;
12. après fusion validée, synchroniser le serveur uniquement par le workflow GitHub ↔ S1 autorisé.

## Interdictions

- ne jamais prétendre qu’un transcript est complet si seules des notes sont disponibles ;
- ne jamais importer automatiquement une conversation privée sans export ou autorisation ;
- ne jamais publier de secrets ;
- ne jamais pousser directement sur `main` ;
- ne jamais synchroniser S1 avant revue et fusion ;
- ne jamais supprimer une ancienne mémoire avant comparaison et décision documentée.

## Registre minimal

| Date | Source | Sujet | Fichier | Statut | SHA-256 |
|---|---|---|---|---|---|
| À compléter | | | | | |

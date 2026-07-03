# GUIDE_IMPORT_CONVERSATION_CHATGPT_EXTERNE_20260702

Date UTC : 2026-07-02T16:48:45.142501+00:00
Objet : procedure sure pour importer le transcript brut de la conversation ChatGPT externe referencee mais non accessible automatiquement.

## Conversation cible
- URL : `https://chatgpt.com/share/6a448c60-5794-83ed-8558-f1f4871748e5`
- Statut actuel : reference conservee, transcript brut non accessible dans l environnement Codex sans export/copie authentifiee.

## Methode recommandee
1. Ouvrir la conversation dans ChatGPT avec le compte qui y a acces.
2. Exporter ou copier le transcript complet en texte brut, Markdown ou PDF texte.
3. Verifier que le fichier ne contient pas de mot de passe, token, cle privee, seed phrase, .env ou dump sensible.
4. Nommer le fichier `CHATGPT_SHARE_6a448c60_TRANSCRIPT_YYYYMMDD.md` ou `.txt`.
5. Le placer dans `/root/wealthtech_project_memory/imports/` ou le fournir en piece jointe Codex.
6. Lancer une boucle d import en lecture seule: calcul SHA256, extraction sections, scan secrets cible, integration dans `memory/`.
7. Mettre a jour `MATRICE_TRACABILITE_SOURCES_EXIGENCES_TRACKS_20260702.md`, `LOOP_ENGINEERING_WEALTHTECH_PLAYBOOK_COMPLET_20260702.md` et `SUIVI_MEMORY.md`.

## Commande serveur proposee apres depot du fichier
```bash
mkdir -p /root/wealthtech_project_memory/imports
sha256sum /root/wealthtech_project_memory/imports/CHATGPT_SHARE_6a448c60_TRANSCRIPT_YYYYMMDD.md
```

## Gates de securite
- Aucun secret complet
- aucune cle privee
- aucun .env avec valeurs
- aucun token GitHub/OpenAI/MCP
- aucun dump SQL sensible
- scan cible OK avant commit/push

## Decision actuelle
Le Loop Engineering est complet pour les sources disponibles. Cette conversation externe ne peut etre integree mot-a-mot qu apres fourniture explicite du transcript.

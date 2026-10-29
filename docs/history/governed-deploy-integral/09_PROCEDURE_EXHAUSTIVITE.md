# Procédure pour atteindre l'exhaustivité sans résumer ni écraser

1. Capturer l'inventaire immuable de toutes les PR/issues et commits, avec horodatage et pagination complète, y compris les éléments fermés, drafts et supersédés.
2. Pour chaque PR, relever base/head exacts, diff, commits, fichiers, reviews, commentaires inline, checks et workflows associés, décision de merge, puis état du déploiement correspondant.
3. Pour chaque issue, relever chronologiquement chaque commentaire et chaque décision, en conservant le texte primaire par référence et non en inventant un état.
4. Pour chaque Governed Deploy, relier workflow/run, SHA, cible, santé, rollback, attestation et preuve de version S1/S2. Ne jamais confondre CI, merge et runtime.
5. Réconcilier GitRegistry V1/V2, PB-F, E3, C1–C5, F-01/F-03/F-04, #349 et GD-U ; identifier les antécédents, doublons et conflits.
6. Relier les checkpoints runtime avec leur session, Task exacte, claim, lock, statut et horodatage ; les UUID ne sont pas des continuity IDs.
7. Produire un dossier par événement lorsque les preuves sont volumineuses ; conserver les sources originales par liens/identifiants et éviter les copies de secrets.
8. Alimenter une matrice exigences ↔ pilotes ↔ défauts ↔ correctifs ↔ CI ↔ attestations, avec statuts historiques et courants séparés.
9. Contrôler le HEAD courant et les branches concurrentes avant toute écriture ; ce dossier est exclusivement documentaire.
10. Maintenir un journal append-only des compléments et corrections, avec dates, références et motif ; ne pas modifier les anciennes preuves.
11. Ne déclarer « historique intégral certifié » qu'après inventaire complet, absence de trous de pagination, vérification de chaque événement et concordance des autorités.

## Prochaine opération documentaire
Rechercher l'origine pré-août, les PR #1–#14, les workflows initiaux et l'historique des runs ; enrichir les dossiers chronologiques par lots indépendants. Aucun déploiement ou mutation runtime ne découle de cette procédure.

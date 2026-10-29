# Registre de couverture de l'audit historique — PR #356

## Sources de vérité et unité d'observation

Le numéro de PR est une clé de ressource, non un ordre chronologique absolu ; le `created_at` d'une PR, le `created_at` de chaque commentaire, le commit author/committer date, la date de CI, de fusion et de déploiement doivent être conservés séparément. Un résultat SearchCommits tronqué ou borné ne prouve jamais que les autres commits n'existent pas.

## Contrôles effectués directement sur des corps d'issues/PR

### PR / issues interrogées individuellement pour cette archive

Juillet : #1, #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14.

Août : #15, #16, #17, #18, #19, #20, #21, #22, #23, #24, #25, #26, #27, #28, #29, #30, #63, #64, #65.

Septembre : #67, #68, #69, #73, #75, #76, #78, #80, #83, #84, #85, #86, #88, #89, #90, #91, #92, #93, #95, #168, #188, #193, #202.

Octobre : #235, #257, #259, #260, #261, #263, #267, #271, #349, #350, #355, #356.

La classification mensuelle correspond aux dates de création connues des PR cités ; #235 est une directive de programme et non une PR d'octobre certifiée par sa simple position dans cette liste. Les tickets sont mentionnés comme contrôle de sources, non comme preuve d'exhaustivité du registre GitHub.

### Commentaires source : issue #349

Premier inventaire : **57 commentaires** et 243 892 caractères de corps, tous liés dans `10_REGISTRE_EXHAUSTIF_COMMENTAIRES_349.md`.

Pendant la constitution du dossier, deux commentaires supplémentaires ont été observés et ajoutés **append-only** : #6508271503 et #6508299718, soit **59 commentaires au dernier contrôle**. Les pièces techniques sont réparties en trois registres `11_REF_TECHNIQUES_ISSUE349_TRANCHE_1.md` à `TRANCHE_3.md`.

Le connecteur ne fournissait pas `created_at`/ `updated_at` des commentaires, malgré des champs présents : **heure exacte non attestée**. Les dates internes au texte sont conservées comme déclarations des rédacteurs.

### Vérifications techniques effectuées pour les fichiers de cette PR

- Création d'une branche documentaire dédiée depuis `main`, sans push sur main.
- Écriture uniquement de fichiers `.md` sous `docs/history/governed-deploy-integral/`.
- Mise à jour du registre par lecture préalable du blob SHA, puis écriture conditionnée par son SHA.
- Aucun appel à un outil de merge, déploiement, modification S1/S2, claim, task, lock ou runtime.
- Aucun recours à Codex.
- Le code MCP de la PR #355 n'a pas été modifié par cette collecte.

## Un point de blocage documentaire à préserver

Une tentative de duplication brute des textes entiers des commentaires dans des fichiers GitHub a été refusée par les contrôles de sécurité de l'outil. **Les corps originaux intégraux restent disponibles via chacun des 59 liens GitHub**, et aucun passage n'est déclaré archivé verbatim sur la branche. Les index préservent URL, numéro de commentaire, rubrique et références techniques SHA/runs. Cette limite est distincte des règles de l'utilisateur et de l'objectif final de conservation.

## Degrés de couverture restant à vérifier

- Tous les commits du dépôt depuis la création, y compris les branches historiques non mergées.
- Toutes les PR entre #1 et #356, y compris #31–#62 et nombreux intervalles ultérieurs.
- Toutes les reviews (inline et formelles) et leurs résolutions.
- Toutes les transitions de session/Task/Claim/Lock et leurs preuves runtime.
- Tous les workflows GitHub Actions, leur SHA de déclenchement, conclusion, logs et artefacts.
- Toutes les versions réellement déployées sur S1/S2, les tests de restauration et les éventuelles dérives.
- Les dates exactes des merges et l'association merge SHA ↔ runtime.
- Tous les commentaires d'issues autres que #349 et toutes les discussions de PR.
- Un éventuel continuity ID racine GLOBAL antérieur à cet audit.
- La filiation des pilots produits, du GRT et de Regulatory, dans leurs propres dépôts.
- Le premier commit et le premier déploiement absolus du système.

## Seuil de certification

Ne déclarer `COMPLETE` que lorsque les inventaires et paginations sont complets pour chacun des univers ci-dessus, que tous les numéros demandés et toutes les décisions sont présents, que les états historiques sont reliés à des preuves exactes, et que les contradictions ont un statut et une résolution sourcés. **Ce dossier est une construction en cours, non une attestation d'exhaustivité**.

## Prochaine direction documentaire sans collision

Compléter les trous #31–#62 et les premiers workflows Governed Deploy, inspecter les commits parents, puis réconcilier les preuves des PR #257–#271 et #350–#355. Continuer sur la PR #356, sans écrire sur main et sans utiliser Codex.

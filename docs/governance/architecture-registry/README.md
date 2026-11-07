# Registre architectural MCP — projection historique versionnée

**Statut :** index documentaire/analytique dérivé, **aucune autorité d'exécution**. Source de vérité : GitHub au SHA et autorités MCP existantes. La branche qui stocke cet inventaire n'est ni une version de production, ni une branche de travail des PR #372/#373/#374.

## Objectif

Conserver les résultats d'inventaires de toutes les branches et, progressivement, leurs fichiers, relations fonctionnelles, contrats, preuves et décisions. Le nom, le dossier et le préfixe ne suffisent JAMAIS à déduire le rôle d'un fichier. Les attributions sémantiques doivent être sourcées par l'analyse du contenu, des imports, des références, des contrôles et de l'historique.

## Première observation (2026-11-07T03:12:33.424Z)

- Dépôt : `Patricked-code/MCP`
- Base `main` : `7d29ad4212efa0bd343d53f400785e5c9cbf07f4` (tree `9b4480b32b663c9c67a30062b1372d174ef2b9a8`)
- Branches observées : **189** (pagination GitHub : 100+89+0; snapshot, pas une affirmation de permanence)
- Fichiers `main` : **844** ; dossiers : **145** ; inventaire recursive complet, `truncated=false`.
- Classification sémantique individuelle : **0/844** : analyse non réalisée, ne pas inventer.
- Arbres des autres branches : non encore collectés, à inventorier progressivement et individuellement.

## Fichiers du registre

- `index.json` : point d'entrée machine vers les sources.
- `snapshots/2026-11-07/branch-heads.json` : 189 branches et HEAD exact au moment de l'observation.
- `snapshots/2026-11-07/main-files.jsonl` : 844 fichiers de main (chemin, blob SHA, taille, mode Git), sans classification supposée.
- `snapshots/2026-11-07/main-summary.json` : SHA, statistiques, vérification de complétude.
- `catalog/sources.json` : liens vers les registres existants, PR et sources, sans duplication de leur autorité.
- `catalog/component-links.json` : premiers rapprochements sourcés (Governed Deploy et GWC-15), sans attestation runtime.
- `schema/schema.sql` : schéma SQL pour créer, à la demande, un **index SQLite dérivé** des snapshots versionnés.
- `checkpoints/current.json` : état de la mission et prochaine action précise.

## Contrat de lecture et d'évolution

1. **READ / OBSERVE :** relire les règles `AGENTS.md`, `SOURCE_OF_TRUTH.md`, `.mcp/branch-governance.json` et les états GitHub actuels ; ne pas considérer ce snapshot historique comme live.
2. **SNAPSHOT :** enregistrer chaque branche avec son HEAD exact; chaque fichier avec `branch + commit SHA + path + blob SHA`; ne jamais attribuer un fichier à une autre branche sans preuve.
3. **UNDERSTAND :** distinguer type physique, code réellement exécuté, conception, tests, archive, relations et interprétation; conserver `UNKNOWN` ou `CANDIDATE` en absence de preuve.
4. **RELATE :** établir `IMPLEMENTS / TESTS / GOVERNS / INVOKES / DEPENDS_ON / COMPLEMENTS / SUPERSEDES / REFERENCES`, provenance obligatoire et appartenance multiple autorisée.
5. **CHECKPOINT :** conserver résultats, contradictions, sources datées, empreintes, couverture, `NEXT_ACTION`; ne pas réécrire des instantanés historiques.
6. **BOUNDARIES :** ni seconde Queue/Session/Lock/Live State, ni nouvelle autorité GWC, ni modification S1, ni push direct main, ni fusion automatique. Les PR #372, #373, #374 restent indépendantes et non fusionnées sans autorisation.

Les SHA des blobs identiques permettent de rapprocher les contenus entre branches sans recopier les fichiers eux-mêmes. Le graphe d'identités/références peut être projeté en SQLite, mais les sources versionnées et les autorités d'origine priment.

## Reprise immédiate

Lire `checkpoints/current.json` et les fichiers de snapshot, puis **réobserver les HEAD de branches**. Prochaine étape : `REOBSERVE_BRANCH_REFS_THEN_INVENTORY_OTHER_BRANCH_TREES_IN_BOUNDED_BATCHES`. Aucune partie de cet inventaire n'accorde un mandat d'écriture runtime.

## Classification 1 — Nature technique des fichiers de main (2026-11-07)

À partir du snapshot immuable `main@7d29ad4212efa0bd343d53f400785e5c9cbf07f4`, **844/844 chemins+blob SHA** ont été associés à un type technique par extension (841) ou nom exact (3). Classification physique uniquement, **aucune lecture sémantique ni déduction du rôle depuis le dossier**.

- `catalog/technical-format-taxonomy.json` : onze formats techniques reconnus et règles de reconnaissance.
- `snapshots/2026-11-07/main-technical-classification.jsonl` : une ligne par fichier ; nom, version, type, méthode, validation de signature et rôle fonctionnel non examiné.
- `snapshots/2026-11-07/main-technical-summary.json` : agrégations, exemples et limites.
- `verify_technical_formats.mjs` : contrôle sans écriture des 844 rapprochements exacts.
- `schema/schema.sql` + `build_sqlite.py` : projection SQL additive, sans nouvelle autorité.

Répartition observée : TypeScript 402 ; Markdown 231 ; JSON 172 ; MJS 15 ; YAML 7 ; TXT 6 ; Shell 5 ; PDF 3 ; .env.example 1 ; .gitignore 1 ; Dockerfile 1 = 844.

**À ne pas confondre avec la deuxième classification** : le format d'un fichier ne prouve ni qu'il est chargé au runtime, ni qu'il gouverne, ni qu'il définit un contrat, ni son utilité dans un processus. Chaque ligne conserve `functionalRoleStatus=UNREVIEWED` et `signatureValidation=NOT_PERFORMED`. Les preuves de contenu et les relations viennent ensuite.

Le nouveau `README.md` de cette PR est inscrit dans le baseline documentaire existant afin de respecter les contrôles CI; cela ne modifie pas le snapshot historique `main`.

## Classification 1 — Extension multibranche achevée (190 branches au point figé)

Un nouvel instantané **`mcp-all-branches-20261107-01`** conserve les 190 HEAD observés le `2026-11-07T03:42:22.743Z`, leurs 19 lots de Trees complets et **96689 présences de fichiers** (chaque présence = branche + SHA du commit + chemin + blob SHA + type). **17836 présences de dossiers** sont comptées. Il s'agit de nombres cumulés entre branches, **pas de fichiers uniques**.

- `snapshots/2026-11-07/all-branches-v1/frozen-branch-heads.json` : référentiel immuable des 190 branches et SHA observés. Après l'écriture du registre, sa propre branche avance : son SHA figé reste historique et ne doit pas être confondu avec son SHA actuel.
- `snapshots/2026-11-07/all-branches-v1/manifest.json` : 19 lots, 190 branches, contrôles et provenance.
- `snapshots/2026-11-07/all-branches-v1/batches/batch-00.jsonl` ... `batch-18.jsonl` : un enregistrement par branche, contenant **tous les blobs de son arbre** sous forme de tuples `[path, blobSha, sizeBytes, gitMode, technicalTypeV1]`.
- `snapshots/2026-11-07/all-branches-v1/validation/part-00.json`, `part-01.json` : validation intégrale de tous les lots, branch SHA et détection technique.
- `snapshots/2026-11-07/all-branches-v1/summary.json` : 190 fiches de branche et totaux techniques par format.
- `catalog/technical-format-taxonomy-v2.json` : ajoute, sans remplacer la nomenclature de `main`, six types trouvés dans d'autres branches : Python, SQL, CSV, JavaScript, JSONL, .gitattributes. Le stockage initial conserve 61 catégories `UNREGISTERED:extension` à titre de provenance ; elles sont toutes résolues dans la projection V2, soit **0 format restant inconnu par nom de fichier**.
- `verify_multibranch_inventory.mjs` : validation reproductible des 190 inventaires (lecture seule).
- `build_sqlite.py --mode all-branches --output /chemin/architecture-all-branches.sqlite` : reconstruction hors ligne d'une base relationnelle interrogeable.

### Modèle de tables et exemples

Les tables existantes `observations`, `branches`, `files` et `file_technical_formats` sont réutilisées. Les vues SQL `v_branch_file_format_counts`, `v_file_versions_across_branches` et `v_identical_content_across_branches` sont additives ; elles ne confèrent aucune permission de runtime.

Exemples SQL (remplacer l'ID par `mcp-all-branches-20261107-01`) :

```sql
SELECT branch_name, format_type, file_count
FROM v_branch_file_format_counts
WHERE snapshot_id = 'mcp-all-branches-20261107-01'
ORDER BY branch_name, format_type;

SELECT path, branch_count, version_count
FROM v_file_versions_across_branches
WHERE snapshot_id = 'mcp-all-branches-20261107-01' AND version_count > 1
ORDER BY version_count DESC, path;
```

Les 190 inventaires ne signifient pas que nous avons **lu et compris le contenu** de tous les fichiers. La nature technique est classée d'après le nom ou l'extension, la validité du contenu et le rôle fonctionnel restant explicitement `NOT_PERFORMED / UNREVIEWED`.

**Étape suivante :** inspecter les fichiers par groupes bornés, comparer leurs contenus, appels, contrats et dépendances, puis renseigner les objets fonctionnels et relations vérifiées. La PR reste Draft ; aucun merge, déploiement ou modification d'une branche propriétaire n'est autorisé par ces données.

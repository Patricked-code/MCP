# L4 — Hierarchie de continuite profonde et navigation multi-niveaux

[← Racine](../README.md) · [Racines verifiees](ROOTS_AND_CHECKPOINTS.md) · [Checkpoint](POINT_OF_REPRISE_TEMPLATE.md)

## Regle d'identite

Le **Project UID** est la racine de recherche. Les **Continuity IDs** appartiennent a des chantiers/traces, pas au serveur global. Les `governedSessionId` appartiennent au moteur de sessions et ne deviennent jamais des IDs de continuite documentaire.

## Niveaux logiques de navigation

| Profondeur | Objet | Cle existante a chercher | Sortie |
| --- | --- | --- | --- |
| L0 | Projet | `WT-PROJECT-MCP-001` candidat / depot prouve | Project context |
| L1 | Registre et autorite | URL/chemin source | Provenance |
| L2 | Exigence/conception | Requirement/Design ID si atteste | Design, decision |
| L3 | Programme/chantier | Programme/Work ID ou issue | Prerequis |
| L4 | Racine de continuite | Continuity ID atteste | Historique de chantier |
| L5 | Episode/lot/sous-chantier | Parent ID + sous-identifiant atteste | Sequence locale |
| L6 | Tache/operation | Task ID ou GitHub issue/PR | Attribution/admission |
| L7 | Evenement/checkpoint | Event ID, Checkpoint ID | Etat et NEXT_ACTION |
| L8 | Preuve elementaire | Commit, CI run, review, deploy, OCI SHA | Verification |

Ces niveaux sont **des positions de navigation**, pas une nouvelle machine d'etats. Un episode peut avoir plusieurs parents de preuve ; conserver le parent primaire et les references croisees. Les liens non prouvés demeurent `UNVERIFIED`.

## Exemple d'arbre de navigation (n'est PAS une genealogie historique certifiee)

### L0 — `WT-PROJECT-MCP-001`

#### L1 — Branche « continuite documentaire »

##### L2 — [Index GWC](https://github.com/Patricked-code/MCP/blob/main/docs/gwc/README.md)

###### L3 — [Projet de l'arbre conversationnel PR #373](https://github.com/Patricked-code/MCP/pull/373)

###### L4 — `MCP-CONV-CONT-20261104-ROOT-01` (declare dans PR #373)

####### L5 — Enfant `.../NODE/6.8.GW` (exemple de navigation de la PR #373)

######## L6 — Registres relies : PR #372 (UTL), PR #374 (Global Work), PR #373 (arbre)

######### L7 — Evenement de discussion/checkpoint (a chercher dans l'arbre source de PR #373)

########## L8 — URL et pieces de preuve exactes (a verifier dans la source)

Les identifiants `ROOT/NODE` de la PR #373 sont **documentaires** : ne pas les transformer en Governed Sessions, Task IDs ou Continuity IDs runtime.

### L3 — Branche « pilote E2 »

- **L4 :** `MCP-PILOT-E2-01-CONT-20261030-ROOT-01`, [issue #359](https://github.com/Patricked-code/MCP/issues/359).
- **L5 :** [PR #360](https://github.com/Patricked-code/MCP/pull/360), [PR #365](https://github.com/Patricked-code/MCP/pull/365), [PR #369](https://github.com/Patricked-code/MCP/pull/369) : contributions liees dont l'etat courant doit etre reobserve.
- **L6 :** selection E2 NEW/RESUME uniquement apres son gate, pas depuis un index documentaire.
- **L7-L8 :** commentaires/checkpoints GitHub, runs de CI et preuves de deploiement s'ils existent.

### L3 — Branche « GD-U »

- **L4 :** `GD-U-CONT-20261030-ROOT-01`, [issue #349](https://github.com/Patricked-code/MCP/issues/349).
- **L5 :** un lot GD-U ne doit pas etre fusionne dans la genealogie E2 sans lien explicite.
- **L6-L8 :** branches/PR, tests et attestations verifies individuellement.

## Reprise dans n'importe quel sens

- **Descendre :** projet → programme → chantier → sous-lot → checkpoint → preuve.
- **Remonter :** SHA ou PR → issue/Task → Continuity ID → programme/design → projet.
- **Sauter :** projet + filtre `continuityId`, `Design ID`, `issue` ou `timestamp`.
- **Comparer :** deux checkpoints, a dates differentes, avec preuves, statuts et conflits.

**Interdit :** inventer une relation genealogique uniquement parce que deux IDs partagent un prefixe. L'absence d'une source est un **trou de couverture**, jamais une preuve negative.

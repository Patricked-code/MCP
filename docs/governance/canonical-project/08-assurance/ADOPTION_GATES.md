# L8 — Gates d'adoption de l'identite et du resolver

[← Racine](../README.md) · [Handoff](CONTINUITY_HANDOFF.md)

Cette tranche porte un **index Markdown de navigation**, pas un deploy du resolver runtime. L'ID `WT-PROJECT-MCP-001` est un **candidat**, a ne promouvoir en identite canonique active qu'apres validation de toutes les frontieres requises.

## Gates ordonnes

| Gate | Precondition | Preuve a produire | Etat de cette tranche |
| --- | --- | --- | --- |
| G0 Source/autorite | Lire les mappings historiques | Cartographie non destructrice des alias | Documente |
| G1 Collision | PR #348/#373/#374/#379/#372 auditees | Matrice de chevauchement et liens, sans doublon | Documente, a revalider |
| G2 Conception | Contrat complet d'ID/relations/versions | Design approuve et decision | **NON ATTESTE** |
| G3 Registre canonique | Accord sur `projectUid` | Binding additif dans GitRegistry existant, tests | **NON IMPLEMENTE** |
| G4 Docs/navigation | Fichiers index et registre de registries | Inventaire Markdown et liens verifies | **CANDIDATE PR** |
| G5 CLI/GitHub | Appel utilisateur par ID | Test sur branch/main, sortie sourcee | **PROTOCOLE DOCUMENTE** |
| G6 API MCP | Outil `mcp_resolve_canonical_project` | Tests de contrat/auth/sessions | **NON IMPLEMENTE** |
| G7 Integration | CI exact-head, revue, absence de collision | PR gouvernee | **A EXECUTER** |
| G8 Runtime | Fusion, CI main, Governed Deploy, runtime healthy | Live State exact SHA | **NON EXECUTE** |
| G9 Reprise multi-niveaux | Point d'entree depuis GitHub ET MCP | Test profondeur L0→L8 et retour preuve | **NON CERTIFIE** |

## Non-regression obligatoire

- Ne pas modifier les fichiers et branches de PR #348, #373, #374, #379, #372 ni leurs tables de verite.
- Ne jamais creer une deuxieme Operational Memory, Task Queue, Governed Session, Lock Service, GitRegistry, Live State ou pipeline.
- Ne pas rendre la consultation documentaire dependante du bridge si GitHub suffit.
- Ne pas reconnaitre un ID racine comme permission, session ou claim.
- Ne pas declarer la completude historique lorsque les sources ne sont pas accessibles.
- Ne pas ecrire en production sans gates d'admission, de tests, de revue et de deploy.

## Criteria d'acceptation de la tranche Markdown

1. Une racine L0 navigable, 8 familles de registres, des sous-niveaux et des liens croises.
2. Des sources **MAIN** distinguees des **PR DRAFT**.
3. Un registre de continuite relie a des issues/PRs connues et des points de reprise sources.
4. Des checkpoints a champs minimaux, provenance et NEXT_ACTION.
5. Un inventaire Markdown conforme a `docs:check`.
6. Une PR Draft documentee, sans merge ni action S1.
7. Aucun droit runtime ni adoption du nouveau Project UID declares.

## Suites dependantes

Apres approbation : definir le binding GitRegistry exact ; implementer le resolver read-only dans la surface MCP **en reutilisant les composants existants** ; ajouter les tests d'isolation identity/transport/Regulatory, des preuves historiques et du mode GitHub-only ; deployer gouverne et attester. Ne pas lancer ces suites automatiquement parce que les documents existent.

## Extension technique candidate (sans changement de catalogue MCP)

La PR #389 ajoute `src/projectIdentity/canonicalProjectEntry.ts`, un manifeste `.mcp/canonical-project-entry.json` et une projection additive `canonicalMcpProject` dans `get_project_context`, avec tests isolés. Cette fonction conserve sa signature actuelle et ne crée pas `mcp_resolve_canonical_project`. **Il reste à approuver le Project UID dans GitRegistry, implémenter une résolution paramétrée et certifier la persistance runtime après déploiement.**

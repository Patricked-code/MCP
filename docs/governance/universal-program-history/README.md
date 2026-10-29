# Programme d'extension universelle du MCP — navigateur historique
**Entrée unique de navigation (projection documentaire, NON AUTORITATIVE).**

> Autorité du programme : [issue #349](https://github.com/Patricked-code/MCP/issues/349). Historique GitHub : [PR #350 à #355](./03-pr-associees.md). Branche de consolidation : [PR #355](https://github.com/Patricked-code/MCP/pull/355). Registre de bifurcation existant : [`MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028`](../universal-capabilities-bifurcation-20261028.json).

Cette arborescence **rattache les preuves historiques sans les recopier ni les effacer**. Elle n'est ni une seconde mémoire canonique, ni une Task Queue, ni un registre de claims, ni un droit d'écriture. Chaque lien mène à l'enregistrement GitHub original. Les états sont des observations datées, jamais une autorisation actuelle.

## Arbre hiérarchique et ordre de lecture

```text
#349 — Autorité parent / programme universel
├── #350 — Fondations Plesk S1/S2 (fusionnée)
├── #351 — GRT / admission runtime (PR séparée)
├── #352 — Regulatory / préflight du sous-chemin (PR séparée)
├── #353 — Regulatory / admission & coordination (PR séparée)
├── #354 — GWC PRECODE / coordination d'agents (PR séparée)
└── #355 — Extension universelle, bifurcation GitHub-first (PR non fusionnée)
    ├── GD-U-01 — Préflight GitHub App
    ├── GD-U-A1 / MAX / COMPOSE / CONTINUITY / EXPOSE — compositions, méthodes
    └── GD-U-02 — capacités exécutables et admission gouvernée
        ├── GD-U-02A/B — Bindings et observations
        ├── GD-U-02C — Exécuteur Plesk borné
        └── GD-U-02D — autorités OAuth / Task / Session / Lock / E3
            ├── A — lecture des autorités
            ├── B1 / B2 — OAuth et session propriétaire
            └── B3a … B3j — chaîne de sécurité, liaison et admission
                └── GD-U-02D-CONT-20261029-B3I-ROOT-01
                    = continuité opérationnelle B3i / prolongements,
                      PAS racine du programme
```

| Lecture | Fichier de cette arborescence | Contenu |
|---|---|---|
| 0 — Origine | [00-fondations-issue349-pr350.md](./00-fondations-issue349-pr350.md) | Mandats, décisions, Plesk S1/S2, fusion #350 |
| 1 — GD-U-01 | [01-gd-u-01-compositions.md](./01-gd-u-01-compositions.md) | GD-U-01, A1, MAX, COMPOSE, CONTINUITY, EXPOSE |
| 2 — GD-U-02 | [02-gd-u-02-branches.md](./02-gd-u-02-branches.md) | 02A/B/C/D, sous-tranches B1–B3j, place du Continuity ID |
| 3 — PR liées | [03-pr-associees.md](./03-pr-associees.md) | #351–#354 sans confusion d'ownership |
| 4 — Preuves | [04-sources-et-regles.md](./04-sources-et-regles.md) | Registres d'origine, limites, méthode d'extension |
| Machine | [source-links.json](./source-links.json) | Index de **tous les liens** de commentaires et revues retrouvés pour #349 et #350–#355 |

## Identités : ne plus les confondre

- **Racine du programme** : issue [#349](https://github.com/Patricked-code/MCP/issues/349), et non un Continuity ID récent.
- **Tranches** : `GD-U-01`, `GD-U-02`, `GD-U-02D-B3i`, etc. Ce sont des *identifiants de travaux*, pas automatiquement des identités de session.
- **Continuité opérationnelle locale** : `GD-U-02D-CONT-20261029-B3I-ROOT-01` rattachée à B3i (réutilisée dans les checkpoints suivants) ; aucune attribution rétroactive de Continuity ID aux tranches historiques.
- **Document de bifurcation** : `MCP-GD-UNIVERSAL-CAPABILITIES-BIFURCATION-20261028` est l'identifiant d'une projection de travail [JSON](../universal-capabilities-bifurcation-20261028.json) déjà existante. Il ne crée ni tâche, ni nouvelle autorité, ni second programme.

## Reprise à froid pour Claude / ChatGPT

Lire `AGENTS.md`, `CLAUDE.md`, `SUIVI.md`, `docs/governance/README.md`, #349, les checkpoints de #350 à #355, le [JSON de bifurcation](../universal-capabilities-bifurcation-20261028.json) et la présente arborescence. Puis recontrôler le HEAD GitHub, la CI, les claims/locks réellement nécessaires, la propriété de branche et l'état S1/S2 avant toute mutation. La PR #355 peut évoluer pendant la lecture. Ne jamais utiliser le statut historique du JSON comme état live.

**Frontière de sécurité** : `PLESK_WRITE_HOLD` reste applicable en l'absence des preuves effectives de permissions et d'admission. La consolidation historique n'est pas une autorisation de fusion, d'exécution Plesk ou de déploiement.

**Maintien dans le temps** : après chaque tranche, ajouter des liens aux pages appropriées et aux commentaires de #349/#355 ; conserver les anciennes ancres, ne jamais réécrire un checkpoint historique. Les preuves GitHub et autorités MCP existantes ont toujours priorité. La persistance OAuth [#346](https://github.com/Patricked-code/MCP/issues/346) reste un chantier distinct.

**Provenance de création** : index construit depuis les données GitHub consultées le 29/10/2026 sur la branche #355 @ `4424cc3cf217f676c462bb39d4b93b79d3a20e1b` ; il indexe les commentaires et revues *retournés par le connecteur*, pas l'intégralité du contenu des commits, artefacts CI, journaux ni des événements GitHub. Les liens sources pointent vers les originaux à relire.

## Archive historique approfondie — PR #356 (lien croisé sans duplication)

Pour retrouver **l'histoire intégrale au-delà du seul GD-U** (origines juillet 2026, GitRegistry, Governed Deploy du MCP, provisioning PB-F, pilotes et lignée #349), consulter [l'archive historique de la PR #356](https://github.com/Patricked-code/MCP/blob/docs/governed-deploy-integral-history-20261029/docs/history/governed-deploy-integral/README.md) et sa [PR documentaire #356](https://github.com/Patricked-code/MCP/pull/356).

**Répartition durable :** la présente arborescence sur PR #355 reste un **navigateur opérationnel GD-U-01/02**, pointant vers les preuves et la prochaine reprise, tandis que la PR #356 conserve **la recherche forensique, les chronologies anciennes et les registres de lacunes**. Ne pas copier ni réécrire son contenu ici. Les commentaires de l'[issue canonique #349](https://github.com/Patricked-code/MCP/issues/349) demeurent les événements originaux du programme ; les deux dossiers ne sont pas des autorités runtime.

**Règle d'intégration :** les deux branches possèdent des fichiers Markdown différents mais modifient toutes deux `docs/governance/markdown-inventory.json`. Avant toute fusion de la seconde branche, reconstituer l'union de leurs entrées depuis les HEAD actualisés, sans supprimer un seul chemin ni réutiliser un inventaire ancien. La présence de ces liens ne fusionne pas les branches, n'attribue aucune permission et ne certifie aucun déploiement.

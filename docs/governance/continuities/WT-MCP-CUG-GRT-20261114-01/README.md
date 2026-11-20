# Chantier CUG — couverture GitHub, écoute et inventaire

Identifiant de continuité **`WT-MCP-CUG-GRT-20261114-01`**. Projet hôte **[Patricked-code/MCP](../../../../README.md)**, branche de référence `main`. Le chantier est documentairement rattaché à ce projet. **`WT-PROJECT-MCP-001`** est le Project UID candidat du projet MCP dans [la PR #389](https://github.com/Patricked-code/MCP/pull/389), pas un binding runtime créé par ce dossier. Le projet GRT conserve ses propres autorités dans son dépôt.

## Ce que le chantier doit livrer

CUG doit couvrir, en mode **Tous les dépôts**, les dépôts actuels et futurs des comptes et organisations GitHub visés. Un webhook central écoute les changements. Le collecteur vérifie les informations auprès de GitHub. Les bonnes données alimentent des registres extensibles et des pages dédiées dans le front-end, en réutilisant les raccordements existants. UAES est le premier pilote, pas la limite de l'objectif.

## Reprendre ce chantier

1. Lire [CONTINUITY.md](CONTINUITY.md), puis [SUIVI.md](SUIVI.md) pour le point de reprise et l'unique `NEXT_ACTION`.
2. Lire [EXIGENCES.md](EXIGENCES.md) et [DECISIONS_LOG.md](DECISIONS_LOG.md) pour distinguer demandes, décisions et choix encore ouverts.
3. Revenir aux [preuves](PREUVES.md), à l'[architecture](ARCHITECTURE.md) et à la [cartographie](CARTOGRAPHIE.md) avant toute décision de mise en œuvre.
4. Poursuivre selon la [feuille de route](ROADMAP.md) et le [backlog](TODO.md), sans rejouer le pilote attesté.

Le [runbook technique](../../cug-webhook-receiver.md) reste la référence opérateur. Le [suivi global MCP](../../../../SUIVI.md) pointe ici, sans dupliquer les checkpoints détaillés. Le dossier ne crée ni nouvelle Task Queue, ni nouvelle autorité, ni droit d'écriture ou de déploiement.

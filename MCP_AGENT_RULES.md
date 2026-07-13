# MCP Agent Rules

## Agents connus

- ChatGPT : supervision, architecture, documentation, orchestration.
- Claude : développement, correction, analyse de code.
- Codex : édition technique, branches, tests, PR.
- Agent serveur : diagnostic S1/S2.
- Agent audit : vérification sécurité et non-régression.
- Agent déploiement : actions contrôlées uniquement.

## Règles obligatoires

- Aucun agent ne pousse directement sur `main` sauf validation explicite.
- Les agents travaillent sur branches dédiées : `chatgpt/`, `claude/`, `codex/`, `agent/`, `mcp/`.
- Les secrets ne doivent jamais être lus, affichés ou committés.
- Les actions serveur destructives sont interdites sans inventaire et validation.

---

<!-- MCP-GOVERNANCE-MANUAL-REFERENCE -->

## Référence MCP anti-dispersion et manuel complet

Cette documentation renvoie aux fichiers de gouvernance ajoutés :

- MCP_ANTI_DISPERSION_GOVERNANCE.md
- MCP_FUNCTIONS_AND_TOOLS_MANUAL.md
- MCP_FUNCTIONAL_CARTOGRAPHY.md
- MCP_CONNECTION_IDENTITY_MODEL.md
- MCP_INTELLIGENT_USAGE_MODE.md
- .mcp/branch-governance.json
- .mcp/function-cartography.json
- .mcp/identity-policy.json

Règles permanentes :

- pas de travail isolé ;
- pas de push direct sur main ;
- branches MCP sous mcp/* ;
- PR draft obligatoire pour changement significatif ;
- double vérification GitHub vers serveur ;
- documentation dans SUIVI.md ;
- DirtyCount à zéro avant pull, merge, deploy, migration ou nettoyage ;
- non-régression obligatoire.

Mise à jour : 2026-07-09T20:08:09Z

## Matrice opérationnelle

| Rôle | Lire | Branche contrôlée | Ouvrir une PR | Modifier S1 | Déployer | Secrets |
|---|---:|---:|---:|---:|---:|---:|
| ChatGPT | oui | oui | oui | non par défaut | non | interdit |
| Claude | oui | oui | oui | non par défaut | non | interdit |
| Codex | oui | oui | oui | non par défaut | non | interdit |
| Agent audit | oui | non | non | lecture seule | non | interdit |
| Agent serveur | selon outil | non | non | outil borné seulement | sur autorisation dédiée | interdit |
| Humain approbateur | selon rôle | oui | oui | selon habilitation | oui si procédure validée | hors documentation/Git |

Cette table résume la politique ; `.mcp/agents.json` et `.mcp/permissions.json` restent les déclarations machine. En cas de divergence, appliquer le droit le plus restrictif et ouvrir une décision.

## Actions nécessitant une validation humaine

- changement de permissions ou rôle ;
- écriture sur S1/S2, déploiement, restart, migration ou rollback ;
- accès à des données non publiques ou à un domaine protégé ;
- merge, fermeture d’un conflit de source de vérité ou exception à la politique ;
- création d’un outil d’écriture ou extension de son périmètre.

## Actions strictement interdites

Lecture ou publication de secret, push forcé, écriture directe sur `main`, suppression non inventoriée, commande arbitraire root, contournement de revue, falsification d’un test et marquage d’un onboarding comme terminé sans preuve.

## Boucle agent obligatoire

Identifier → lire → vérifier les droits → auditer → planifier → agir dans le périmètre → tester → journaliser → préparer la reprise → demander la revue.

## Historique

- 2026-07-13 : ajout de la matrice, des validations et interdictions explicites.

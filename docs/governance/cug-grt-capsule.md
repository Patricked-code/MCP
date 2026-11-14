# Capsule isolée CUG/GRT — WT-MCP-CUG-GRT-20261114-01

## Premier incrément

Le dépôt MCP embarque sous `capsules/grt-repository-creation/` un module de consultation de reprise. Il n’est ni monté dans Express ni enregistré comme outil MCP. Le moteur GRT reste propriétaire du questionnaire, du workflow de création, du handoff et des reçus. La capsule ne contient aucune copie de ce moteur. Le pilote existant `/gouvern` reste distinct et intact. Aucun pilote à lancer avec le propriétaire pour valider cet incrément.

## Contrat et communication

Le point de reprise est référencé dans [MCP #389](https://github.com/Patricked-code/MCP/pull/389#issuecomment-6869339990), [GRT #342](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/issues/342) et [GRT #343](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/pull/343). Les fixtures viennent du contrat GRT au SHA `b1fe9bf60480680e80b4654d7c4c059894b4812e`. L’interface de ce lot ne communique pas avec la GitHub App CUG ni ne lance un workflow distant. La documentation du contrat et les tests de fixtures ne valent pas preuve d’une communication réelle.

`resumeRepositoryCreation` prend une référence d’acteur déjà vérifiée par l’hôte. Les ports d’autorisation et de lecture lui sont fournis par l’hôte, jamais par l’appelant. Le module autorise avant toute lecture, utilise d’abord la demande centrale et ne consulte le dépôt cible qu’après un handoff corrélé. L’identité du dépôt, sa révision et la provenance des lectures doivent être attestées par le futur adaptateur de l’hôte. Aucun jeton, corps d’issue ou réponse du questionnaire ne sort de la projection. `READY` signifie consultable, pas exécutable. L’attestation de baseline n’est ni un déploiement ni une évaluation d’architecture.

## Lots suivants

1. Raccorder l’appel MCP et une page distincte avec App ID + Bearer, sans Client ID demandé ni changement de la connexion existante. Les clients qui ne peuvent ouvrir la page reçoivent un lien. Le Bearer est vérifié côté serveur et n’est ni stocké ni journalisé. Un secret partagé ne constitue pas une identité personnelle.
2. Vérifier les comptes autorisés par l’installation CUG et les droits de l’acteur. La sélection retrouve ou crée une identité canonique et sa racine de continuité, sans session gouvernée ni travail automatique.
3. Raccorder la lecture GRT au registre de reprise. Distinguer créer, observer et reprendre. Une création explicite reçoit son propre ID et ses checkpoints par silo. En cas de réponse incertaine, relire l’état et les preuves avant tout rejeu. Observer ne crée aucun dossier. Le contrat machine de GRT #343 et sa disponibilité réelle doivent être vérifiés avant d’autoriser une création.
4. Valider hors pilote historique les lectures autorisées et refusées, puis le raccordement réel CUG avec les autorisations requises. Vérifier les routes et le catalogue MCP, la CI exacte, la revue et le déploiement gouverné par le pipeline existant. Aucun changement manuel sur S1.

## Tests de la tranche

`node --test capsules/grt-repository-creation/test/*.test.mjs` depuis la racine. La CI dédiée ne demande que `contents: read`, ne reçoit aucun secret et ne déclenche aucun déploiement. Le serveur existant, son pilote, son image et ses routes restent inchangés.

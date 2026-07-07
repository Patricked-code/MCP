# MCP Security Model

## Separation des tokens

Le token MCP authentifie l acces au MCP. Le token GitHub ou la future GitHub App authentifie l acces a GitHub. Un token GitHub ne donne jamais automatiquement le role SuperAdmin MCP.

## Token MCP maitre

Le role SuperAdmin MCP appartient uniquement au token MCP maitre. La creation d un profil SuperAdmin est bloquee tant que cette validation n est pas implementee explicitement.

## Interdiction des tokens bruts

Le code, les logs, le registre, les fichiers `.mcp`, les documents et les reponses API ne doivent jamais stocker de token brut. Le moteur utilise des identifiants de session comme `mcp-web-session`.

## Modele de droits

Les droits sont derives en plusieurs niveaux:

- lecture compte;
- lecture organisation;
- lecture repos;
- lecture branches et fichiers;
- ecriture branche MCP;
- ouverture de pull request;
- administration repo;
- administration organisation.

Les droits sensibles restent des indices tant qu ils n ont pas ete confirmes par une action non destructive sur branche dediee.

## Ecriture uniquement sur branche

Les branches officielles `main`, `master` et la branche par defaut du repo ne doivent pas recevoir d ecriture directe de la part du MCP. Le bootstrap propose `mcp/onboarding-setup`.

## Validation humaine

Les agents IA, le deploiement, l administration organisation et tout choix de correction directe necessitent une validation humaine explicite.

## Audit

Les connexions, sessions d onboarding, reponses au questionnaire, creations d agent et tentatives de bootstrap doivent creer des evenements d audit.

## Gestion des erreurs

Une erreur de droits, de token absent, d organisation inaccessible ou de choix interdit doit devenir un blocage controle, pas une action de contournement.

## Futur GitHub App / OAuth

La cible long terme est une GitHub App ou un OAuth avec permissions minimales, rotation et traces d audit, plutot qu un token personnel durable.

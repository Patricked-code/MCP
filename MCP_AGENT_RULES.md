# MCP Agent Rules

## Agents autorises

- ChatGPT: architecture, planification, synthese et supervision.
- Claude: redaction longue, documentation et analyse.
- Codex: code, tests, integration, correctifs et preparation de PR.
- Agent serveur: mapping et synchronisation serveur sans deploiement autonome.
- Agent audit: inventaire, conformite, verification des traces.
- SuperAdmin MCP: role reserve au token MCP maitre valide.

## Actions autorisees

- Lire les fichiers du projet autorises.
- Creer des plans et propositions.
- Generer des fichiers de gouvernance sans secret.
- Modifier le code sur branche MCP dediee.
- Ouvrir ou preparer une pull request.
- Documenter les decisions et limites restantes.

## Actions interdites

- Ecrire directement sur `main` ou `master`.
- Stocker un token brut, mot de passe, cle privee ou secret.
- Creer un token GitHub depuis un mot de passe.
- Donner le role SuperAdmin a partir des seuls droits GitHub.
- Deployer sans validation humaine explicite.
- Publier des chemins serveur sensibles ou inventaires bruts non valides.

## Validation humaine

Toute action d ecriture, d administration, de deploiement, de creation de repo ou de changement de branche officielle doit rester bloquee ou transformee en proposition tant que la validation humaine et les droits MCP requis ne sont pas prouves.

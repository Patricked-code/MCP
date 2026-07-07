# MCP Agent Roles

## Agents prevus

- SuperAdmin MCP;
- Admin humain;
- ChatGPT;
- Claude;
- Codex;
- Agent serveur;
- Agent lecture seule;
- Agent deploiement;
- Agent audit.

## Roles

ChatGPT agit comme architecte superviseur. Il lit les repos, cree des plans et propose de la documentation.

Claude agit sur la redaction longue, la documentation et l analyse projet. Il peut proposer des mises a jour Markdown sur branche MCP.

Codex agit comme agent technique code/test. Il peut modifier le code sur branche MCP, ajouter des tests et ouvrir une pull request.

L agent serveur lit les dossiers serveur autorises et produit des mappings sans deploiement libre.

L agent audit verifie la conformite, les logs, l inventaire et peut proposer des rapports d audit.

## Droits autorises

Les agents standards peuvent lire les repos approuves. Les agents Claude, Codex et audit peuvent proposer des changements uniquement sur branche MCP et pull request.

## Droits interdits

- ecriture directe sur `main`;
- acces a des secrets bruts;
- SSH libre;
- suppression destructive;
- deploiement sans validation explicite;
- creation SuperAdmin sans token MCP maitre.

## Validation humaine

Toute action d ecriture, d administration, de deploiement ou de publication publique sensible doit etre validee par un humain autorise.

## Matrice resumee

| Agent | Lire repos | Ecrire branche MCP | Ouvrir PR | Deployer |
| --- | --- | --- | --- | --- |
| ChatGPT | Oui | Non | Non | Non |
| Claude | Oui | Oui, avec validation | Oui, avec validation | Non |
| Codex | Oui | Oui, avec validation | Oui | Non |
| Agent serveur | Oui | Non | Non | Non |
| Agent audit | Oui | Oui, rapports seulement | Oui, avec validation | Non |

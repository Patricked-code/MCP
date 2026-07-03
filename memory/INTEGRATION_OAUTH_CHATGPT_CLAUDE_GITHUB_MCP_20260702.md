# INTEGRATION_OAUTH_CHATGPT_CLAUDE_GITHUB_MCP_20260702

Date UTC : 2026-07-02T16:48:45.142501+00:00
Source : `/opt/apps/wealthtech-mcp-ssh-bridge/docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md`
SHA256 : `0dd1f0fccc0fe7a17f22d6fd90dcd355fbb78e13fd1502461d78d598ca1ad45f`
Mode : integration documentaire. Le document source annonce ne contenir aucun secret complet; les libelles OAuth de type secret client sont des placeholders.

## Points a retenir
- MCP courant : `wealthtech_ssh_bridge` expose sur `https://mcp.wealthtechinnovations.com/mcp`.
- Auth actuelle : Bearer token statique via header, suffisante seulement pour les clients acceptant des headers personnalises.
- OAuth 2.1 natif non implemente actuellement; necessaire pour integration OAuth ChatGPT avancee.
- Scopes recommandes : `mcp:read` en premier; `mcp:write` pour actions controlees; `mcp:admin` a ne pas activer sans garde-fous.
- Endpoints OAuth futurs : authorize, token, metadata OAuth et protected resource metadata.
- GitHub : utiliser tokens fine-grained limites; ne jamais stocker token dans fichier public ou GitHub.
- Cette source renforce les tracks F0 et I1: persistance MCP/GitHub et inventaire/synchronisation GitHub.

## Impacts Loop Engineering
- F0 doit conserver le modele read-only-first et les checks secrets avant tout push.
- I1 doit choisir une voie GitHub claire: connecteur GitHub, bridge/gh cote serveur ou OAuth MCP futur.
- Toute evolution OAuth doit etre une boucle separee avec audit securite, scopes et confirmation utilisateur.

## Extrait public integre
Le document complet reste dans `docs/OAUTH_CHATGPT_CLAUDE_GITHUB.md`; cette integration ne recopie que les decisions et valeurs non secretes utiles au plan.

# MCP Repo Inventory

## Repository

- Repository actuel: `Patricked-code/MCP`
- Organisation cible: `chainsolutions-wealthtech`
- Branche de travail MCP: `mcp/migration-governance-setup`
- Branche par defaut attendue: `main`
- Langage principal: TypeScript / Node.js
- Framework HTTP: Express

## Zones importantes

- `src/server.ts`: routes web/API MCP, Git et GitHub.
- `src/github/`: statut de connexion GitHub, registre local MCP/Git.
- `src/onboarding/`: MCP GitHub Governance & Onboarding Engine.
- `docs/`: documentation technique et securite.
- `Migration/`: archive structuree de migration et paquet organisation cible.
- `.mcp/`: manifeste de gouvernance du repository MCP.
- `tests/onboarding.test.ts`: tests de garde-fous onboarding.

## Commandes de verification

- `npm run test:onboarding`
- `npm run typecheck`
- `npm run build`
- `npm run lint:secrets`
- `npm run docs:check`

## Points de vigilance

- Le connecteur GitHub voit actuellement `Patricked-code`, pas encore `chainsolutions-wealthtech`.
- Les operations directes sur l organisation cible restent bloquees jusqu a autorisation.
- Les fichiers serveur et secrets reels ne doivent pas etre ajoutes au repository.
- Les routes existantes `/login`, `/dashboard`, `/git`, `/github` ne doivent pas regresser.

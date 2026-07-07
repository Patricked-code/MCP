# Public-safe blocker evidence

This directory is reserved for public-safe evidence that can unblock the MCP migration completion audit without publishing private operational material.

Use `PUBLIC_SAFE_BLOCKER_EVIDENCE.example.json` as the template. When the operator has completed the external/private prerequisites, create `PUBLIC_SAFE_BLOCKER_EVIDENCE.json` from the template and keep only public-safe summaries in Git.

Rules:

- Do not store raw tokens, `.env` values, private keys, recovery codes, private server paths, raw command logs or raw live inventory.
- Keep private server inventory, backups, rollback references and approval records outside Git.
- Set `evidenceStatus` to `public_safe_evidence_complete` only after every acceptance criterion for the blocker has public-safe evidence.
- Keep `productionActionExecuted=false` until explicitly approved execution evidence exists outside this public gate.
- Run `npm run blockers:evidence:check`, regenerate the gate and run the no-regression checks before any PR update.

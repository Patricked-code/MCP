# 28–29 octobre 2026 — GD-U, PR #355 et continuité B3i

## 2026-10-28T04:27:40Z — PR #355
Titre : feat(github): additive universal GitHub/Plesk/server capability foundations (GD-U-01). Branche `mcp/universal-github-plesk-server-capabilities-20261028`. Base annoncée `48a529889517aa1c11974802d23acc3f35e0f187`. Première tranche : readiness GitHub App par installation/repo/permissions, read-only ; aucune autorisation runtime induite.
Source : https://github.com/Patricked-code/MCP/pull/355

## 2026-10-29 — B3i
Commentaire #6506328959 : **Continuity ID existant** `GD-U-02D-CONT-20261029-B3I-ROOT-01`. Commit `8248fc86679a2e4cacb4a81168513d7f349b11c5` modifie `src/server.ts` en conservant les routes et stores. Admission via `inspectPleskHttpToMcpAdmissionFromRuntime`, mais `trustedMcpTransport:null` faute de preuve d'association cookie web ↔ transport MCP authentifié ; write refusé, consentement non consommé.
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506328959

## Blocage et prochaines conditions
Commentaire #6506342426 : B3i partiel, transport OAuth authentifié non lié, aucun write Plesk. À faire : association transactionnelle authentifiée E3/OAuth/SessionRequest, consommation unique, protections CSRF/replay/expiration, vérification des permissions exactes, TDD, CI, revue et deploy gouverné avant pilote réel.
Source : https://github.com/Patricked-code/MCP/issues/349#issuecomment-6506342426

## Frontière
Ce continuity ID appartient à B3i, et ne peut pas être rétroactivement attribué à août, septembre, TB-W3-F, ou au programme entier.

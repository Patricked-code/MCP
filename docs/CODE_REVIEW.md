# CODE_REVIEW.md — Revue du code

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **revue du code**, commencer par [le document racine](../CODE_REVIEW.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## État initial

Le dépôt vient d’être initialisé. Aucune revue runtime n’a encore été exécutée sur une machine Node.js.

## Points à vérifier

- Compatibilité exacte avec la version installée de `@modelcontextprotocol/sdk`.
- Signature de `server.tool`.
- Signature de `StreamableHTTPServerTransport`.
- Gestion des sessions HTTP MCP.
- Robustesse du client SSH.
- Qualité du filtrage read-only.
- Journalisation sans fuite de secrets.

## Risques connus

- Un garde-fou par filtrage de chaînes ne suffit pas pour des outils sensibles ; les futures actions sensibles devront être implémentées comme outils spécialisés, jamais comme shell libre.
- Les clés SSH doivent être dédiées et stockées hors Git.
- Le MCP doit rester accessible uniquement en HTTPS et avec token.

## Décision actuelle

Valider d’abord le mode lecture seule avant d’ajouter toute action de migration ou de nettoyage actif.

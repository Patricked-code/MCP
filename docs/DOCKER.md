# DOCKER.md

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **configuration Docker**, commencer par [le document racine](../DOCKER.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

Document de préparation Docker pour le serveur MCP WealthTech.

Le conteneur doit rester simple : une application Node.js exposée localement, placée derrière un reverse proxy HTTPS.

Points à documenter lors du déploiement :

- image Node.js utilisée ;
- port local ;
- variables d’environnement ;
- volume des journaux ;
- méthode de redémarrage ;
- commande de build ;
- commande de lancement ;
- procédure de rollback.

Le déploiement initial peut aussi se faire avec PM2 si cela permet de tester plus vite le mode lecture seule.

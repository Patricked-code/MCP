# DOCKER.md

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

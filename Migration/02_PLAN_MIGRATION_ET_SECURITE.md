# Plan Migration, nettoyage, sécurité et non-régression

## 1. Principe absolu

Aucune suppression, migration, fusion de base, modification de vhost, arrêt PM2/Passenger/Docker ou modification de configuration production ne doit être fait sans inventaire préalable, compréhension des dépendances, possibilité de retour arrière et tests post-action.

## 2. Nettoyage S1

Sur S1, la liste blanche officielle est :

- `niakara.com`
- `www.niakara.com`
- `api.niakara.com`
- `wealthtechinnovations.com`
- `api.wealthtechinnovations.com`
- `stablecoin.wealthtechinnovations.com`
- `api.stablecoin.wealthtechinnovations.com`
- `blockchain.wealthtechinnovations.com`
- `tokenfactory.wealthtechinnovations.com`
- `wealthtechinnovation.com`
- `berebytours.com`

Tout le reste peut être considéré comme nettoyable uniquement après inventaire.

A analyser sur S1 :

- domaines Plesk ;
- sous-domaines ;
- vhosts Apache/Nginx ;
- dossiers web ;
- apps Node ;
- apps Passenger ;
- PM2 ;
- Docker ;
- fichiers `.env` sans publier leur contenu ;
- bases de données ;
- certificats SSL ;
- crons ;
- logs ;
- caches ;
- builds ;
- archives ;
- sauvegardes Plesk ;
- dumps SQL ;
- node_modules inutiles ;
- anciens projets.

## 3. Nettoyage S2

Sur S2, les domaines protégés ne doivent pas être modifiés :

- `africafunds.chainsolutions.fr`
- `api.africafunds.chainsolutions.fr`
- `api.stablecoin.chainsolutions.fr`
- `stablecoin.chainsolutions.fr`
- `brvm.chainsolutions.fr`
- `bvmac.chainsolutions.fr`
- `chainsolutions.fr`
- `Funds.chainsolutions.fr`
- `api.funds.chainsolutions.fr`

Applications à vider/supprimer après inventaire :

- `api.pccet.wealthtechinnovations.ci`
- `api.wealthtechinnovations.ci`
- `evote.wealthtechinnovations.ci`
- `pccet.wealthtechinnovations.ci`
- `wealthtechinnovations.ci`
- `opcvm.chainsolutions.fr`

Sauvegardes inutiles à rechercher/nettoyer :

- `fantokenafrica.club`
- `api.fantokenafrica.club`
- `lysfc.fantokenafrica.club`
- `iso20022.chainsolutions.fr`
- `mutualfunds.chainsolutions.fr`
- `opcvm.chainsolutions.fr`
- `robot.funds.chainsolutions.fr`
- `api-mutualfunds.chainsolutions.fr`

## 4. Règles de migration S2 vers S1

Avant toute migration :

1. inventorier l'application source ;
2. identifier code, technologie, dossier, vhost, PM2/Passenger/Docker, port, base, `.env`, crons, certificats ;
3. sauvegarder le code dans GitHub ou confirmer que le dépôt Git est aligné ;
4. exporter ou documenter les données ;
5. préparer le domaine destination ;
6. copier sans supprimer la source ;
7. configurer build/runtime ;
8. tester frontend/API ;
9. documenter ;
10. seulement ensuite envisager un nettoyage source, sauf Stablecoin qui doit rester sur S2.

## 5. Interdictions critiques

- ne jamais supprimer sans inventaire ;
- ne jamais toucher aux domaines protégés S2 ;
- ne jamais casser les domaines conservés S1 ;
- ne jamais supprimer `stablecoin.chainsolutions.fr` ou `api.stablecoin.chainsolutions.fr` sur S2 ;
- ne jamais publier de `.env` réel ;
- ne jamais publier de clés privées ;
- ne jamais pousser de tokens réels ;
- ne jamais exécuter `rm -rf` sans périmètre strictement confirmé ;
- ne jamais fusionner brutalement les bases de données ;
- ne jamais installer Kubernetes uniquement pour complexifier ;
- ne jamais agir si le serveur, le domaine, le dossier ou le rôle n'est pas clair ;
- toujours tester après action ;
- toujours documenter après action ;
- toujours mettre à jour `SUIVI.md` et `POINT DE REPRISE COURANT`.

## 6. Tests post-action obligatoires

Après toute action touchant l'infrastructure :

- test HTTP/HTTPS des domaines conservés ;
- test API des endpoints critiques ;
- vérification logs ;
- vérification PM2/Docker/Passenger ;
- vérification ports ;
- vérification disque ;
- vérification absence d'erreur critique ;
- mise à jour de la documentation ;
- mise à jour du point de reprise.

## 7. Documentation attendue après chaque session

Mettre à jour :

- `SUIVI.md` ;
- `CHANGELOG.md` ;
- `TODO.md` ;
- `TASKS.md` ;
- `CODE_REVIEW.md` si code modifié ;
- `DEPLOYMENT_PRODUCTION.md` si déploiement touché ;
- `MIGRATION.md` si migration touchée ;
- `SECURITY.md` si sécurité touchée.

# LOOP_ENGINEERING_INSTRUCTIONS_DOCX_EXTRACT_20260702

Source locale lue : `C:\Users\Koné ZIé Arouna\Downloads\Loop Engineering Instructions.docx`
SHA256 : `84e25a9f570e34c1fe0fbe33dd069789689a3c338f170fe429b223ed878bba3a`
Paragraphes extraits : `669`
Commentaires Word non vides : `0`

> Extraction textuelle conservee pour que les prochaines boucles IA n aient pas besoin de redemander le fichier Word.

## Texte extrait

INSTRUCTIONS COMPLÈTES — LOOP ENGINEERING IA POUR L’ÉCOSYSTÈME WEALTHTECH
0. Objectif général
Tu dois créer et appliquer une méthode de travail en boucle appelée Loop Engineering pour permettre à des agents IA de travailler durablement sur le code, les serveurs, les migrations, la documentation, l’architecture, la sécurité, le nettoyage, Docker, la base de données, la blockchain, les microservices et l’évolution future de l’écosystème WealthTech.
L’objectif du Loop Engineering est d’éviter que l’IA recommence toujours depuis zéro, d’assurer une mémoire persistante, de garder la chronologie des actions, de documenter chaque étape, de réduire les risques de régression, de protéger les domaines critiques, de structurer les migrations, de préparer l’écosystème unifié, et de permettre à plusieurs agents IA ou développeurs humains de reprendre le travail exactement au bon endroit.
La boucle doit être permanente, documentée, vérifiable et sécurisée.
Chaque intervention doit suivre la même logique :
Lire la mémoire projet.
Comprendre le point de reprise.
Identifier l’objectif de la session.
Inventorier l’existant.
Évaluer les risques.
Planifier l’action.
Exécuter prudemment.
Tester.
Documenter.
Mettre à jour la mémoire persistante.
Préparer le prochain point de reprise.
Recommencer la boucle.
Aucune modification lourde ne doit être faite sans lecture préalable des fichiers de mémoire projet.
1. Contexte global du projet
Le projet concerne l’écosystème WealthTech, qui regroupe plusieurs domaines, applications, APIs, modules et projets à consolider progressivement dans une architecture commune.
Les applications suivantes ont vocation à devenir les modules d’un seul écosystème applicatif cohérent :
wealthtechinnovations.com
api.wealthtechinnovations.com
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
blockchain.wealthtechinnovations.com
tokenfactory.wealthtechinnovations.com
V2.wealthtechinnovations.com
evote.wealthtechinnovations.com
api.evote.wealthtechinnovations.com
evaluations.wealthtechinnovations.com
api.evaluations.wealthtechinnovations.com
L’objectif final est de construire un écosystème WealthTech complet avec :
une application principale unifiée ;
un frontend commun ;
des modules fonctionnels harmonisés ;
une API backend modulaire ;
une base de données commune ou étendue ;
des modules stablecoin, blockchain, tokenfactory, vote électronique, formations et évaluations ;
Docker ;
une architecture microservices progressive ;
Redis pour les queues, le cache et les workers ;
ClickHouse pour les requêtes lourdes, les analytics, logs et reportings ;
une architecture prête pour Kubernetes plus tard ;
une documentation projet complète ;
une mémoire persistante IA ;
une logique de non-régression ;
un processus de migration et de nettoyage contrôlé.
La version fonctionnelle la plus poussée est le module stablecoin. Il doit être considéré comme la référence stratégique et technique principale de l’écosystème cible.
2. Serveurs concernés
Deux serveurs sont concernés.
2.1 Serveur S1
Serveur principal, destination des migrations, serveur à nettoyer et futur serveur cible de l’écosystème.
S1 = root@212.227.212.33
Sur S1, les domaines suivants doivent être conservés avec leur contenu, configuration et dépendances nécessaires :
niakara.com
www.niakara.com
api.niakara.com
wealthtechinnovations.com
api.wealthtechinnovations.com
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
blockchain.wealthtechinnovations.com
tokenfactory.wealthtechinnovations.com
wealthtechinnovation.com
berebytours.com
Tout ce qui n’est pas dans cette liste, ou qui n’est pas destiné à recevoir une migration validée, doit être considéré comme nettoyable après inventaire.
2.2 Serveur S2
Serveur source, serveur de migration, serveur à nettoyer partiellement, avec des domaines protégés à ne jamais toucher.
S2 = root@217.160.249.254
Sur S2, les domaines suivants sont protégés et ne doivent pas être modifiés :
africafunds.chainsolutions.fr
api.africafunds.chainsolutions.fr
api.stablecoin.chainsolutions.fr
stablecoin.chainsolutions.fr
brvm.chainsolutions.fr
bvmac.chainsolutions.fr
chainsolutions.fr
Funds.chainsolutions.fr
api.funds.chainsolutions.fr
Toute action pouvant modifier, casser, désactiver, vider, supprimer ou impacter ces domaines doit être abandonnée immédiatement.
3. Applications à migrer de S2 vers S1
Les applications suivantes doivent être inventoriées, documentées, sauvegardées vers GitHub, puis migrées ou copiées vers S1.
3.1 WealthTech
Source S2 :
wealthtech.chainsolutions.fr
Destination S1 :
V2.wealthtechinnovations.com
3.2 EVOTE
Sources S2 :
evote.chainsolutions.fr
api.evote.chainsolutions.fr
Destinations S1 :
evote.wealthtechinnovations.com
api.evote.wealthtechinnovations.com
3.3 Formation Blockchain / Évaluations
Sources S2 :
itic4fima.chainsolutions.fr
api.itic4fima.chainsolutions.fr
Destinations S1 :
evaluations.wealthtechinnovations.com
api.evaluations.wealthtechinnovations.com
3.4 Stablecoin
Sources S2 :
stablecoin.chainsolutions.fr
api.stablecoin.chainsolutions.fr
Destinations S1 :
stablecoin.wealthtechinnovations.com
api.stablecoin.wealthtechinnovations.com
Attention : les applications stablecoin sur S2 doivent être copiées vers S1, mais jamais supprimées de S2.
4. Applications à vider, supprimer ou nettoyer
4.1 Sur S2, applications à vider / supprimer après inventaire
api.pccet.wealthtechinnovations.ci
api.wealthtechinnovations.ci
evote.wealthtechinnovations.ci
pccet.wealthtechinnovations.ci
wealthtechinnovations.ci
opcvm.chainsolutions.fr
4.2 Sur S2, sauvegardes à nettoyer
Nettoyer et supprimer les sauvegardes inutiles concernant :
fantokenafrica.club
api.fantokenafrica.club
lysfc.fantokenafrica.club
iso20022.chainsolutions.fr
mutualfunds.chainsolutions.fr
opcvm.chainsolutions.fr
robot.funds.chainsolutions.fr
api-mutualfunds.chainsolutions.fr
4.3 Sur S1, nettoyage maximal
Sur S1, tout ce qui n’est pas nécessaire aux domaines conservés ou aux nouvelles migrations doit être nettoyé après inventaire :
anciens domaines ;
anciens sous-domaines ;
anciens projets ;
anciens dossiers web ;
anciens builds ;
anciens node_modules inutiles ;
anciens caches ;
anciens logs volumineux ;
anciennes sauvegardes Plesk ;
anciennes archives ;
anciens dumps SQL ;
anciennes apps Passenger ;
anciens processus PM2 ;
anciens fichiers temporaires ;
anciens projets non documentés.
5. Fichiers de mémoire persistante obligatoires
Avant toute intervention lourde, créer ou mettre à jour les fichiers suivants dans chaque dépôt ou projet concerné :
GPT.md
SUIVI.md
README.md
README_DEV.md
ROADMAP.md
TODO.md
TASKS.md
CODE_REVIEW.md
CHANGELOG.md
DEPLOYMENT_PRODUCTION.md
ARCHITECTURE.md
DATABASE.md
DOCKER.md
KUBERNETES_FUTURE.md
SECURITY.md
MONITORING.md
BACKUP_RESTORE.md
MIGRATION.md
AGENTS_ARCHITECTURE.md
AI_SKILLS.md
Le fichier central de mémoire projet est :
SUIVI.md
Il doit obligatoirement contenir une section :
# POINT DE REPRISE COURANT
Cette section doit être mise à jour après chaque intervention importante.
6. Ordre obligatoire de lecture avant toute action
Avant toute modification, suppression, migration, nettoyage, refonte, déploiement, dockerisation ou intervention sur serveur, l’agent IA doit lire dans cet ordre :
GPT.md
SUIVI.md
README.md
README_DEV.md
ROADMAP.md
TODO.md
TASKS.md
CODE_REVIEW.md
CHANGELOG.md
DEPLOYMENT_PRODUCTION.md
ARCHITECTURE.md
DATABASE.md
MIGRATION.md
DOCKER.md
SECURITY.md
AGENTS_ARCHITECTURE.md
AI_SKILLS.md
Puis l’agent doit relire spécifiquement :
# POINT DE REPRISE COURANT
dans SUIVI.md.
Si un fichier manque, il doit être créé.
Si un fichier est vide, il doit être rempli.
Si un fichier est incomplet, il doit être complété.
Si plusieurs fichiers se contredisent, l’agent ne doit pas agir à l’aveugle. Il doit documenter la contradiction, proposer une décision cohérente et l’inscrire dans SUIVI.md.
7. Boucle principale de Loop Engineering
La boucle de travail standard est la suivante.
BOUCLE LOOP ENGINEERING1. INITIALISATION   Lire tous les fichiers de mémoire projet.   Identifier le serveur concerné.   Identifier le domaine concerné.   Identifier le module concerné.   Identifier le point de reprise courant.2. COMPRÉHENSION   Comprendre l’objectif.   Comprendre l’état actuel.   Comprendre ce qui est protégé.   Comprendre ce qui est à nettoyer.   Comprendre ce qui est à migrer.   Comprendre ce qui est risqué.3. INVENTAIRE   Lister les fichiers.   Lister les dossiers.   Lister les domaines.   Lister les vhosts.   Lister les bases de données.   Lister les fichiers .env.   Lister les processus PM2.   Lister les conteneurs Docker.   Lister les apps Passenger.   Lister les crons.   Lister les certificats SSL.   Lister les sauvegardes.   Lister les ports.   Lister les logs.   Lister les dépendances.4. ANALYSE DES RISQUES   Identifier ce qui peut casser.   Identifier ce qui est dépendant.   Identifier ce qui doit être sauvegardé.   Identifier ce qui ne doit jamais être touché.   Identifier les risques de régression.   Identifier les risques de perte de données.   Identifier les risques de fuite de secrets.5. PLAN D’ACTION   Décomposer l’action en étapes.   Prévoir un rollback si possible.   Prévoir les tests.   Prévoir la documentation.   Prévoir la mise à jour du point de reprise.6. EXÉCUTION CONTRÔLÉE   Exécuter uniquement l’action prévue.   Ne pas faire d’action opportuniste non documentée.   Ne pas supprimer sans inventaire.   Ne pas modifier un domaine protégé.   Ne pas pousser de secret sur GitHub.7. TESTS   Tester HTTP.   Tester HTTPS.   Tester API.   Tester frontend.   Tester backend.   Tester base de données.   Tester PM2 / Docker / Passenger.   Lire les logs.   Vérifier les erreurs.   Vérifier l’espace disque.   Vérifier les domaines protégés.8. DOCUMENTATION   Mettre à jour SUIVI.md.   Mettre à jour CHANGELOG.md.   Mettre à jour TASKS.md.   Mettre à jour TODO.md.   Mettre à jour MIGRATION.md si besoin.   Mettre à jour DEPLOYMENT_PRODUCTION.md si besoin.   Mettre à jour CODE_REVIEW.md si besoin.   Mettre à jour le POINT DE REPRISE COURANT.9. VALIDATION   Indiquer ce qui est terminé.   Indiquer ce qui reste à faire.   Indiquer ce qui bloque.   Indiquer les risques restants.   Indiquer la prochaine action.10. REPRISE   Recommencer la boucle à partir du point de reprise courant.
8. Pseudo-code opérationnel de la boucle
START LOOPLire GPT.mdLire SUIVI.mdLire POINT DE REPRISE COURANTLire README.mdLire README_DEV.mdLire ROADMAP.mdLire TODO.mdLire TASKS.mdLire CODE_REVIEW.mdLire CHANGELOG.mdLire DEPLOYMENT_PRODUCTION.mdLire ARCHITECTURE.mdLire DATABASE.mdLire MIGRATION.mdLire AGENTS_ARCHITECTURE.mdLire AI_SKILLS.mdIdentifier :- serveur actif ;- domaine actif ;- module actif ;- objectif de session ;- risques ;- contraintes ;- domaines protégés ;- actions interdites.Si fichier manquant :    créer fichier    remplir avec contexte projet    documenter création dans SUIVI.mdSi point de reprise absent :    créer POINT DE REPRISE COURANT    documenter état actuelFaire inventaire technique :    domaines    dossiers    vhosts    PM2    Passenger    Docker    bases    .env    crons    logs    sauvegardes    certificats    portsAnalyser risques :    si domaine protégé impacté :        abandonner action        documenter risque        passer à action suivante sûrePréparer plan :    écrire étapes    définir tests    définir rollback    définir fichiers à modifierExécuter :    action minimale    vérification immédiate    arrêt si erreur critiqueTester :    curl HTTP/HTTPS    API healthcheck    logs    pm2 status    docker ps    mysql check    espace disque    domaines protégésDocumenter :    SUIVI.md    CHANGELOG.md    TASKS.md    TODO.md    POINT DE REPRISE COURANTSi action terminée :    marquer DONE    préparer prochaine actionSinon :    marquer BLOCKED ou IN_PROGRESS    documenter causeEND LOOPRESTART LOOP
9. Les agents IA à documenter
Créer le fichier :
AGENTS_ARCHITECTURE.md
Ce fichier doit contenir la description des agents suivants.
9.1 Agent Architecte Écosystème
Responsabilité :
concevoir l’architecture cible ;
harmoniser les modules ;
préparer l’unification des applications ;
organiser les domaines fonctionnels ;
définir la trajectoire microservices ;
éviter les incohérences globales.
Compétences :
architecture logicielle ;
Node.js ;
Next.js ;
MySQL ;
ClickHouse ;
Redis ;
Docker ;
Kubernetes ;
microservices ;
sécurité ;
blockchain ;
scalabilité.
Boucle spécifique :
Lire ARCHITECTURE.md.
Lire DATABASE.md.
Lire ROADMAP.md.
Cartographier les modules.
Identifier les chevauchements.
Proposer l’architecture cible.
Documenter les décisions.
Mettre à jour SUIVI.md.
9.2 Agent Migration
Responsabilité :
migrer les applications de S2 vers S1 ;
transférer vers GitHub ;
préparer les domaines de destination ;
préserver les données ;
documenter la migration.
Compétences :
SSH ;
rsync ;
Git ;
GitHub ;
Plesk ;
Nginx ;
PM2 ;
Passenger ;
Docker ;
MySQL ;
fichiers .env.
Boucle spécifique :
Lire MIGRATION.md.
Identifier source et destination.
Inventorier l’application source.
Sauvegarder le code.
Créer dépôt GitHub.
Exclure les secrets.
Préparer destination S1.
Transférer.
Déployer.
Tester.
Documenter.
Mettre à jour le point de reprise.
9.3 Agent Nettoyage Serveur
Responsabilité :
libérer l’espace disque ;
supprimer sauvegardes inutiles ;
supprimer anciens builds ;
supprimer anciens node_modules ;
nettoyer logs/caches ;
vider les domaines non conservés.
Compétences :
Linux ;
Plesk ;
analyse disque ;
PM2 ;
Passenger ;
Docker ;
logs ;
backups ;
sécurité suppression.
Boucle spécifique :
Mesurer espace disque avant.
Inventorier fichiers volumineux.
Identifier ce qui est protégé.
Classer ce qui peut être supprimé.
Supprimer prudemment.
Mesurer espace disque après.
Tester domaines protégés.
Documenter l’espace libéré.
9.4 Agent Sécurité / Secrets
Responsabilité :
protéger les secrets ;
éviter la fuite de .env ;
vérifier .gitignore ;
sécuriser GitHub ;
documenter les risques.
Compétences :
sécurité applicative ;
secrets ;
RBAC ;
CORS ;
HTTPS ;
rate limiting ;
audit ;
KYC/AML.
Boucle spécifique :
Chercher les fichiers sensibles.
Vérifier .gitignore.
Créer .env.example.
Vérifier les dépôts GitHub.
Signaler secrets exposés.
Documenter dans SECURITY.md.
9.5 Agent Base de Données
Responsabilité :
cartographier les bases ;
préparer la base commune ;
identifier les tables ;
gérer migrations ;
éviter pertes de données.
Compétences :
MySQL ;
modélisation ;
migration ;
sauvegarde ;
restauration ;
index ;
transactions ;
ClickHouse.
Boucle spécifique :
Inventorier les bases.
Identifier les tables.
Identifier les relations.
Identifier les doublons.
Proposer modèle commun.
Sauvegarder avant migration.
Tester restauration.
Documenter dans DATABASE.md.
9.6 Agent DevOps / Docker
Responsabilité :
dockeriser l’écosystème ;
créer Docker Compose ;
préparer l’évolution Kubernetes ;
gérer reverse proxy ;
préparer monitoring.
Compétences :
Docker ;
Docker Compose ;
Nginx ;
volumes ;
networks ;
healthchecks ;
CI/CD ;
Kubernetes.
Boucle spécifique :
Inventorier services.
Créer Dockerfile si nécessaire.
Créer docker-compose.yml.
Créer volumes.
Créer networks.
Ajouter healthchecks.
Tester build.
Tester restart.
Documenter dans DOCKER.md.
9.7 Agent Blockchain / Stablecoin
Responsabilité :
comprendre stablecoin ;
documenter smart contracts ;
intégrer blockchain ;
surveiller transactions ;
préparer TokenFactory.
Compétences :
Solidity ;
ERC20 ;
stablecoin ;
Web3 ;
RPC ;
wallets ;
events ;
mint ;
burn ;
transfer ;
smart contracts.
Boucle spécifique :
Lire les contrats.
Identifier les fonctions.
Identifier les rôles.
Identifier les événements.
Documenter les flux.
Vérifier sécurité.
Tester interactions.
Documenter dans ARCHITECTURE.md et SECURITY.md.
9.8 Agent Documentation
Responsabilité :
maintenir les fichiers .md ;
garder la mémoire persistante ;
structurer les décisions ;
produire les rapports ;
maintenir la chronologie.
Compétences :
Markdown ;
documentation technique ;
architecture ;
suivi projet ;
changelog ;
roadmap.
Boucle spécifique :
Lire tous les fichiers.
Identifier les manques.
Mettre à jour les documents.
Harmoniser les noms.
Mettre à jour SUIVI.md.
Mettre à jour le point de reprise.
Créer rapport final.
9.9 Agent Tests / Non-régression
Responsabilité :
tester les domaines ;
tester les APIs ;
tester PM2/Docker ;
vérifier logs ;
éviter régressions.
Compétences :
curl ;
API ;
frontend ;
backend ;
PM2 ;
Docker ;
logs ;
monitoring.
Boucle spécifique :
Tester domaines.
Tester APIs.
Tester logs.
Tester processus.
Tester base de données.
Vérifier erreurs.
Documenter résultats.
Bloquer si régression critique.
10. Fichier AI_SKILLS.md à créer
Créer :
AI_SKILLS.md
Contenu obligatoire :
# AI_SKILLS.md — Compétences IA persistantes## Compétence principaleexpert-wealthtech-ecosysteme-stablecoin-migration-devops-sans-regression## MissionAgir comme expert complet de l’écosystème WealthTech, capable de travailler sur :- architecture ;- migration ;- nettoyage serveur ;- Docker ;- Node.js ;- Next.js ;- MySQL ;- ClickHouse ;- Redis ;- blockchain ;- Solidity ;- stablecoin ;- sécurité ;- documentation ;- GitHub ;- non-régression.## Règles absolues- Toujours lire GPT.md avant action.- Toujours lire SUIVI.md avant action.- Toujours lire POINT DE REPRISE COURANT.- Ne jamais supprimer sans inventaire.- Ne jamais casser un domaine protégé.- Ne jamais pousser de secrets sur GitHub.- Toujours documenter après action.- Toujours tester après action.- Toujours mettre à jour le point de reprise.- Toujours distinguer S1 et S2.- Toujours distinguer domaines conservés, protégés, à nettoyer et à migrer.## Compétences backend- Node.js- API REST- architecture modulaire- services- repositories- workers- queues- validations- logs- sécurité## Compétences frontend- Next.js- TypeScript- Atomic Design- design system- composants réutilisables- routing- intégration API- responsive- accessibilité## Compétences base de données- MySQL- migrations SQL- index- relations- sauvegarde- restauration- transactions- performance- ClickHouse## Compétences DevOps- Linux- SSH- Plesk- Nginx- Apache- PM2- Passenger- Docker- Docker Compose- volumes- networks- reverse proxy- SSL- monitoring## Compétences blockchain- Solidity- ERC20- stablecoin- Web3- RPC- smart contracts- wallets- events- mint- burn- transfer- TokenFactory## Compétences sécurité- secrets- RBAC- KYC- AML- CORS- HTTPS- rate limiting- audit logs- protection données- GitHub security## Compétences documentation- Markdown- README- roadmap- changelog- suivi projet- architecture- déploiement- migration- point de reprise
11. Structure de mémoire persistante à créer
Créer une structure documentaire persistante sur le serveur et dans le dépôt cible.
Structure recommandée :
docs/  GPT.md  SUIVI.md  README.md  README_DEV.md  ROADMAP.md  TODO.md  TASKS.md  CODE_REVIEW.md  CHANGELOG.md  DEPLOYMENT_PRODUCTION.md  ARCHITECTURE.md  DATABASE.md  DOCKER.md  KUBERNETES_FUTURE.md  SECURITY.md  MONITORING.md  BACKUP_RESTORE.md  MIGRATION.md  AGENTS_ARCHITECTURE.md  AI_SKILLS.mdmemory/  CURRENT_STATE.md  SERVER_S1_STATE.md  SERVER_S2_STATE.md  DOMAINS_INVENTORY.md  DATABASE_INVENTORY.md  PM2_INVENTORY.md  DOCKER_INVENTORY.md  PLESK_INVENTORY.md  CLEANUP_HISTORY.md  MIGRATION_HISTORY.mdagents/  architecte.md  migration.md  nettoyage.md  securite.md  database.md  devops.md  blockchain.md  documentation.md  tests.md
12. Modèle obligatoire du POINT DE REPRISE COURANT
Dans SUIVI.md, créer et maintenir :
# POINT DE REPRISE COURANT## Date de mise à jourÀ compléter.## Serveur concernéS1 / S2 / les deux.## Projet concernéÀ compléter.## Domaine concernéÀ compléter.## Dernière action terminéeÀ compléter.## État actuelÀ compléter.## Action suivante recommandéeÀ compléter.## Domaines à ne pas toucherÀ compléter.## Domaines en cours de migrationÀ compléter.## Domaines à nettoyerÀ compléter.## Bases de données concernéesÀ compléter.## Processus PM2 / Docker / Passenger concernésÀ compléter.## Fichiers modifiésÀ compléter.## Tests réalisésÀ compléter.## Résultats des testsÀ compléter.## Erreurs rencontréesÀ compléter.## Risques connusÀ compléter.## Rollback possibleÀ compléter.## Décision de repriseÀ compléter.
13. Boucle de migration détaillée
Pour chaque application à migrer, appliquer cette boucle :
BOUCLE MIGRATION1. Lire mémoire projet.2. Identifier source S2.3. Identifier destination S1.4. Inventorier source :   - dossier ;   - code ;   - framework ;   - package manager ;   - scripts ;   - .env ;   - base ;   - PM2 ;   - Passenger ;   - Docker ;   - vhost ;   - SSL ;   - port ;   - cron ;   - logs.5. Vérifier que source n’est pas domaine protégé interdit.6. Sauvegarder code.7. Créer ou mettre à jour dépôt GitHub.8. Vérifier .gitignore.9. Créer .env.example.10. Pousser vers GitHub sans secrets.11. Préparer destination S1.12. Créer domaine ou vider contenu destination si demandé.13. Déployer.14. Installer dépendances.15. Configurer .env de production.16. Configurer PM2 / Docker / Passenger.17. Configurer reverse proxy si nécessaire.18. Configurer SSL.19. Tester HTTP/HTTPS.20. Tester API.21. Tester logs.22. Tester base.23. Documenter migration.24. Mettre à jour SUIVI.md.25. Mettre à jour POINT DE REPRISE COURANT.
14. Boucle de nettoyage détaillée
Pour chaque nettoyage, appliquer cette boucle :
BOUCLE NETTOYAGE1. Lire mémoire projet.2. Identifier serveur.3. Identifier domaine ou dossier.4. Vérifier qu’il n’est pas protégé.5. Mesurer espace disque avant.6. Lister fichiers et tailles.7. Identifier dépendances.8. Identifier PM2 / Passenger / Docker.9. Identifier bases liées.10. Identifier sauvegardes liées.11. Identifier logs/caches/builds/node_modules.12. Classer :    - supprimer ;    - vider ;    - conserver ;    - doute.13. En cas de doute, ne pas supprimer.14. Supprimer uniquement ce qui est validé.15. Mesurer espace disque après.16. Tester domaines protégés.17. Documenter espace libéré.18. Mettre à jour SUIVI.md.19. Mettre à jour CLEANUP_HISTORY.md.20. Mettre à jour POINT DE REPRISE COURANT.
15. Boucle de documentation détaillée
BOUCLE DOCUMENTATION1. Lire tous les fichiers .md existants.2. Identifier les fichiers manquants.3. Créer les fichiers manquants.4. Remplir chaque fichier avec le contexte réel.5. Mettre à jour les décisions.6. Mettre à jour les domaines.7. Mettre à jour les serveurs.8. Mettre à jour les migrations.9. Mettre à jour les nettoyages.10. Mettre à jour les risques.11. Mettre à jour les tests.12. Mettre à jour le point de reprise.13. Ajouter au Git.14. Vérifier absence de secrets.15. Commit ou préparer commit.
16. Boucle de tests et non-régression
BOUCLE TESTS1. Identifier domaines à tester.2. Tester HTTP.3. Tester HTTPS.4. Tester redirections.5. Tester API health.6. Tester pages principales.7. Tester authentification si possible.8. Tester base de données.9. Tester PM2.10. Tester Docker.11. Tester logs.12. Vérifier erreurs 500.13. Vérifier erreurs SSL.14. Vérifier erreurs CORS.15. Vérifier espace disque.16. Vérifier CPU/RAM si nécessaire.17. Documenter résultats.18. Bloquer la suite si régression critique.
17. Boucle d’architecture cible
BOUCLE ARCHITECTURE1. Cartographier chaque application.2. Identifier ses fonctionnalités.3. Identifier ses tables.4. Identifier ses APIs.5. Identifier ses utilisateurs.6. Identifier ses rôles.7. Identifier ses dépendances.8. Identifier ce qui doit être fusionné.9. Identifier ce qui doit rester module séparé.10. Proposer structure backend.11. Proposer structure frontend.12. Proposer base commune.13. Proposer workers.14. Proposer Docker Compose.15. Proposer Redis.16. Proposer ClickHouse.17. Proposer sécurité.18. Proposer monitoring.19. Documenter dans ARCHITECTURE.md.20. Mettre à jour ROADMAP.md.
18. Architecture cible recommandée
L’écosystème cible doit être pensé autour de modules.
18.1 Modules backend
auth
users
organizations
kyc
wallet
stablecoin
payments
blockchain
tokenfactory
evote
training
evaluations
notifications
reporting
audit
admin
18.2 Tables communes à prévoir
users
roles
permissions
user_roles
organizations
organization_users
kyc_profiles
wallets
wallet_transactions
stablecoin_mint_requests
stablecoin_burn_requests
stablecoin_transfers
payment_orders
merchant_payments
blockchain_transactions
smart_contracts
tokens
token_deployments
evote_elections
evote_voters
evote_votes
evote_results
training_courses
training_modules
training_evaluations
training_answers
training_certificates
audit_logs
system_logs
api_logs
notifications
files
settings
18.3 Infrastructure cible
Frontend Next.js ;
Backend Node.js ;
MySQL ;
ClickHouse ;
Redis ;
Workers ;
Docker ;
Docker Compose ;
Nginx reverse proxy ;
SSL ;
Monitoring ;
Backups ;
trajectoire Kubernetes.
19. Règles GitHub
Avant tout push :
Vérifier .gitignore.
Ne jamais pousser .env.
Ne jamais pousser secrets.
Ne jamais pousser dumps SQL sensibles.
Ne jamais pousser backups.
Ne jamais pousser node_modules.
Créer .env.example.
Créer documentation.
Vérifier statut Git.
Faire commit clair.
.gitignore minimal :
.env.env.*!.env.examplenode_modules/.next/.nuxt/dist/build/logs/*.log*.sql*.dump*.bak*.old*.tar*.tar.gz*.tgz*.zipbackup/backups/.DS_Store
20. Règles de sécurité absolues
Ne jamais modifier les domaines protégés S2.
Ne jamais supprimer les applications stablecoin sur S2.
Ne jamais casser les domaines conservés S1.
Ne jamais supprimer sans inventaire.
Ne jamais pousser de secrets.
Ne jamais agir si le domaine source/destination n’est pas clairement identifié.
Ne jamais fusionner brutalement les bases sans audit.
Ne jamais installer Kubernetes sans justification.
Ne jamais supprimer une base de données dans le doute.
Ne jamais redémarrer un service critique sans nécessité.
Toujours tester après modification.
Toujours documenter.
Toujours mettre à jour le point de reprise.
21. Règle de fin de session
Aucune session ne doit se terminer sans mise à jour de :
SUIVI.md
POINT DE REPRISE COURANT
CHANGELOG.md
TASKS.md
TODO.md
Le rapport de fin de session doit contenir :
serveur concerné ;
domaines concernés ;
actions réalisées ;
fichiers modifiés ;
dossiers supprimés ;
espace libéré ;
migrations réalisées ;
GitHub mis à jour ;
tests effectués ;
erreurs restantes ;
risques ;
action suivante ;
point de reprise exact.
22. Format du rapport de fin de boucle
# RAPPORT DE FIN DE BOUCLE## DateÀ compléter.## ServeurS1 / S2 / les deux.## Objectif de la boucleÀ compléter.## Actions réaliséesÀ compléter.## Fichiers modifiésÀ compléter.## Domaines concernésÀ compléter.## Domaines protégés vérifiésÀ compléter.## Migrations réaliséesÀ compléter.## Nettoyages réalisésÀ compléter.## Espace disque avantÀ compléter.## Espace disque aprèsÀ compléter.## Espace libéréÀ compléter.## GitHubÀ compléter.## Tests réalisésÀ compléter.## Résultats des testsÀ compléter.## Erreurs rencontréesÀ compléter.## Risques restantsÀ compléter.## Action suivanteÀ compléter.## Point de reprise exactÀ compléter.
23. Ordre recommandé des premières boucles
Boucle 1 — Création mémoire persistante
Créer tous les fichiers .md.
Créer GPT.md.
Créer SUIVI.md.
Créer POINT DE REPRISE COURANT.
Créer AGENTS_ARCHITECTURE.md.
Créer AI_SKILLS.md.
Boucle 2 — Inventaire S1
Domaines.
Dossiers.
Plesk.
PM2.
Passenger.
Docker.
Bases.
Backups.
Logs.
Espace disque.
Boucle 3 — Inventaire S2
Domaines protégés.
Domaines à migrer.
Domaines à nettoyer.
Backups.
Bases.
PM2.
Docker.
Passenger.
Boucle 4 — Nettoyage prudent S1
Anciens domaines.
Backups Plesk.
Node_modules inutiles.
Caches.
Logs.
Archives.
Boucle 5 — Nettoyage sélectif S2
Applications à supprimer.
Sauvegardes listées.
Aucun impact sur domaines protégés.
Boucle 6 — Migration WealthTech
S2 wealthtech.chainsolutions.fr
vers S1 V2.wealthtechinnovations.com
Boucle 7 — Migration EVOTE
S2 evote.chainsolutions.fr
S2 api.evote.chainsolutions.fr
vers S1 evote.wealthtechinnovations.com
vers S1 api.evote.wealthtechinnovations.com
Boucle 8 — Migration Formation Blockchain
S2 itic4fima.chainsolutions.fr
S2 api.itic4fima.chainsolutions.fr
vers S1 evaluations.wealthtechinnovations.com
vers S1 api.evaluations.wealthtechinnovations.com
Boucle 9 — Copie Stablecoin
S2 stablecoin.chainsolutions.fr
S2 api.stablecoin.chainsolutions.fr
vers S1 stablecoin.wealthtechinnovations.com
vers S1 api.stablecoin.wealthtechinnovations.com
Ne jamais supprimer les originaux stablecoin sur S2.
Boucle 10 — Architecture écosystème unifié
Cartographie.
Base commune.
Docker.
Redis.
ClickHouse.
Workers.
Microservices.
Kubernetes futur.
Documentation.
24. Instruction finale à respecter
Tu dois travailler en boucle, pas en intervention isolée.
Chaque boucle doit produire :
Un inventaire.
Une action contrôlée.
Des tests.
Une documentation.
Une mise à jour du point de reprise.
Une préparation de la boucle suivante.
L’objectif n’est pas seulement de nettoyer, migrer ou corriger.
L’objectif est de construire une mémoire persistante et une méthode de travail durable permettant à l’IA de continuer le projet sans recommencer depuis zéro.
La boucle doit protéger la production, documenter toutes les décisions, préparer l’écosystème WealthTech unifié, et permettre une évolution progressive vers une architecture moderne, stable, dockerisée, modulaire, scalable et compatible avec les futures exigences blockchain, stablecoin, microservices, analytics et Kubernetes.
Fin des instructions Loop Engineering.

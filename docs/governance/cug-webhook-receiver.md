# Webhook CUG — réception seule et pilote UAES

Ce lot prolonge la découverte GitHub envisagée dans [MCP #401](https://github.com/Patricked-code/MCP/pull/401), sans modifier l'admission CUG/GRT. Il organise les observations du webhook dans un registre d'entrée local et privé, sans écrire dans le GitRegistry canonique. Il ne réalise pas encore l'inventaire par API, ne déclenche aucune tâche, création, écriture GitHub ou opération serveur. Aucun token d'installation ou clé privée CUG n'est nécessaire pour vérifier une livraison signée.

## Déployer et valider

1. Valider la CI et la revue de la révision exacte. Après fusion autorisée, vérifier le run **MCP Governed Deploy** et son attestation pour le SHA attendu. Ne pas modifier directement le code sur S1, ni exposer un nouveau port. Confirmer que le proxy HTTPS existant transmet la route à MCP.
2. Confirmer dans GitHub que l'installation choisie est celle de CUG (App ID `5417646`) et qu'elle couvre `chainsolutions-wealthtech/universal-agent-engineering-system` (Repository ID `1429189311`). Ne pas reprendre un ID d'installation d'un autre connecteur sans cette preuve.
3. Via la configuration opérateur de S1, placer dans `/app/secrets/cug-webhook-secret` un secret aléatoire dédié sous forme de 64 caractères hexadécimaux minuscules (32 octets d'aléa). Un saut de ligne final est accepté. Le fichier doit être régulier, lisible par le processus et en mode `0600`. Ne jamais versionner le secret. Le volume existant `/app/data` doit pouvoir accueillir le sous-répertoire privé `cug-webhook-receipts`.
4. Configurer `MCP_CUG_WEBHOOK_PILOT_INSTALLATION_ID` avec l'ID attesté et `MCP_CUG_WEBHOOK_ENABLED=true` par le circuit opérateur. Vérifier que `/health` et l'authentification MCP ne régressent pas. Un POST non signé à `/webhooks/github/cug` doit être refusé avec `401` et ne créer aucun reçu.
5. Dans les réglages de CUG, activer le webhook avec l'URL HTTPS effectivement déployée, le type JSON, le même secret et la vérification TLS. Vérifier l'abonnement `repository`. Dans **Recent deliveries**, contrôler le statut du ping s'il est livré, puis corréler un événement pilote réel accepté avec un reçu unique par `X-GitHub-Delivery`. Une relivraison identique doit rester sans doublon. Ne pas créer ou renommer de dépôt uniquement pour provoquer ce test sans autorisation de cette mutation.

## Contrat et limites

- Route inactive par défaut (`404`). Corps brut JSON borné à 2 Mio et sans compression. Signature `X-Hub-Signature-256` validée avant de lire les données métier.
- `ping` authentifié et événements hors périmètre ignorés avec `204`. Pour `repository`, l'ID stable du dépôt doit être celui d'UAES. `installation` et `installation_repositories` n'enregistrent qu'un signal relatif à l'installation pilote, pas la liste des dépôts présents dans la charge utile.
- `202` signifie reçu durable et non traitement métier. `204` signifie aussi rejeu identique, `409` identifiant réutilisé avec données différentes, `503` prérequis ou stockage indisponibles. Le récepteur ne stocke ni corps brut, ni entêtes, ni descriptions. Il ne conserve des champs de dépôt que pour l'ID stable du pilote autorisé. Le nom du fichier est l'ID de livraison normalisé.
- Journal pilote borné à 10 000 entrées et 32 demandes en attente par processus. Le volume doit permettre une écriture atomique avec lien physique et synchronisation. Le récepteur ne purge pas automatiquement. À saturation, une nouvelle livraison n'est pas acquittée. Prévoir la rétention et le rattrapage lors du raccordement du collecteur.
- Retrait : désactiver le webhook dans GitHub et remettre `MCP_CUG_WEBHOOK_ENABLED=false` via le circuit opérateur. Conserver les reçus comme preuves. L'admission CUG, `/gouvern` et le GitRegistry ne changent pas.

## Structure du registre et raccordements

| Niveau | Clé | Données et autorité |
| --- | --- | --- |
| Reçu immuable | `deliveryId` | Version du format, événement, action, heure, ID d'installation et empreinte SHA-256. Les reçus v1 restent lisibles et dédupliqués sans réécriture. |
| Observation pilote | `githubRepositoryId` dans l'observation | Propriétaire, ID propriétaire si fourni, nom et URL GitHub si présents et cohérents. Source et état `PENDING_GITHUB_API`. Une observation n'est ni l'état courant vérifié, ni une permission. Un transfert reste à revérifier. |
| Extensions typées | Espace de noms et version | `github.installations.v1` identifie CUG et l'installation émettrice, mais ne confirme pas sa couverture actuelle ni celle des autres apps. Les nouveaux domaines ajoutent leurs propres schémas bornés, pas un objet libre issu du webhook. |
| Suite proposée | Une suggestion dans le reçu | `REFRESH_GITHUB_INVENTORY`, `PROPOSED`, `automaticExecution=false`. Une future intégration lira et réconciliera les observations dans la chaîne existante, sans prendre les indications du webhook pour un mandat d'exécution. |

La lecture interne `listCugRegister` est bornée et paginée par ID de livraison. Elle n'est pas exposée en HTTP et son curseur n'est pas un checkpoint chronologique fiable pendant des insertions concurrentes. Un consommateur durable doit réconcilier par identité, version et déduplication avant tout suivi automatisé.

Le prochain raccordement vérifie le dépôt auprès de l'API GitHub, reconstruit une fiche courante par ID stable à partir de preuves fraîches et propose un candidat au **GitRegistry existant**. Un enrichissement peut ajouter les apps confirmées, leurs App IDs et leurs IDs d'installation, avec une couverture explicite. Absence de preuve ne signifie pas absence d'app.

Pour le provisioning, cette fiche sera un **input**. L'action, sa cible, les preuves serveur, l'idempotence et l'autorisation restent à résoudre dans le flux Governed Deploy Applications et les registres existants. Ni un événement `repository.created`, ni un nom de dépôt, ni un ID d'installation ne suffit à créer un répertoire, lier S1/S2 ou exécuter un déploiement. Aucune seconde file de tâches n'est créée.

## Collecteur pilote opérateur — aucune activation automatique

Sur une version déployée et autorisée qui contient aussi ce lot, la commande à lancer **dans le conteneur MCP** est `node dist/src/cug/runPilotInventory.js`. Elle ne dépend ni d'une livraison webhook ni de l'activation de l'admission CUG. Le pilote est fixé sur UAES et utilise le même ID d'installation attesté, plus la clé CUG protégée `/app/secrets/cug-app-private.pem` en mode `0600`. Aucun nouveau droit GitHub, Plesk ou SSH n'est demandé par le code.

Le collecteur obtient un jeton CUG limité au dépôt pilote et en lecture. Il exige une preuve d'appartenance à l'installation en plus de la réponse de l'API de dépôt. Un dépôt public visible à lui seul n'est pas une preuve de couverture. Renommage, transfert ou réponse ambiguë ne produisent pas une nouvelle fiche pilote. Les autres apps restent non vérifiées et la couverture globale partielle.

Le résultat est écrit en local dans `/app/data/cug-pilot-inventory`, avec une référence de preuve, une empreinte de l'état observé du GitRegistry si lisible et un décompte des correspondances de nom. Un match de nom n'atteste ni le dépôt serveur, ni son remote, ni le chemin réel, ni un domaine Plesk. Le code n'écrit pas le GitRegistry canonique. Le rapprochement serveur, les autorisations d'écriture Plesk et la création de sous-domaines restent hors de ce lot.

## Reprise WT-MCP-CUG-GRT-20261114-01 — B1, consommateur automatique UAES

Le pilote A a été vérifié le 20 novembre 2026. Le collecteur a écrit l’instantané privé
`11ac25dfd077a1d946cb70e038920622eb6b609873665a10171657e0e05461ea`, avec `NO_NAME_MATCH`
et sans autorisation de provisioning. Dans [l’historique CUG](https://github.com/organizations/chainsolutions-wealthtech/settings/apps/chainsolutions-universal-gateway/advanced),
le `repository.edited` `fa8dc2d0-e47f-11f1-92bf-fd9772b274a6` a donné `202`, puis `204`
au rejeu du même identifiant. Le contrôle opérateur sur S1 a trouvé un reçu unique et
non vide, de 914 octets, mode `0600`. `/health` renvoyait `200` et le POST non signé `401`.
La description UAES a été rétablie et son SHA de branche principale n’a pas changé.

B1 conserve le récepteur, les reçus v1/v2 et la commande opérateur du lot A. Le traitement
se fait au démarrage du service puis toutes les minutes, hors requête HTTP, seulement avec
`MCP_CUG_RECEIPT_CONSUMER_ENABLED=true`, le récepteur actif et l’installation pilote configurée.
Le réglage est inactif par défaut. Il n’existe ni nouvelle route ni nouvelle tâche MCP.
Le consommateur relit le journal privé et n’utilise pas un nom de dépôt provenant du webhook
pour choisir le dépôt à lire. Il réutilise la vérification GitHub en lecture seule de #404.

Chaque cycle examine au plus 100 reçus et tente au plus quatre rafraîchissements, l’un après
l’autre, sans chevauchement des cycles. Le curseur reprend au début après le dernier ID et
n’est pas une preuve de traitement. Les fichiers dans `/app/data/cug-receipt-inventory` sont
les seuls marqueurs durables de traitement réussi. Un résultat privé et atomique par
`deliveryId` combine l’empreinte liée au reçu et l’instantané vérifié. Une relance évite le
nouvel appel GitHub si ce résultat est déjà valide. Deux processus peuvent appeler GitHub
pour le même reçu, mais ne publient qu’un seul résultat. Les anciennes installations sont
ignorées, les échecs sont repris lors d’un cycle suivant et n’empêchent pas de poursuivre
les autres reçus de la page. Une couverture non attestée est signalée séparément,
sans produire de fiche positive ni être assimilée à une absence. Un résultat incohérent n’est jamais écrasé automatiquement.
Le journal des entrées n’est ni purgé ni modifié. Ce lot est limité au stockage et au volume
du pilote, pas à la collecte continue multi-compte. Les fiches par livraison sont des preuves
historiques, pas un index canonique courant. La rétention et la gestion des signaux de perte
de couverture font partie de l’élargissement avant une activation multi-compte.

Mise en service et retrait par le circuit de configuration existant, sans nouvelle clé ni
nouvelle permission. Avant activation, passer les contrôles de revue et de déploiement du
MCP. Comparer ensuite les compteurs du consommateur et la présence d’un fichier de projection
`0600` pour un reçu connu, sans relever son contenu. Confirmer le comportement après relance
et préserver `200` sur `/health` et `401` pour le POST non signé. Désactiver le seul nouveau
flag pour arrêter le consommateur au prochain redémarrage du service. Le webhook et les
preuves restent en place. Aucune écriture GitRegistry, Plesk ou GRT n’est déclenchée.


## B2 — Vérifier un deuxième dépôt sans élargir le webhook

Après déploiement gouverné de la révision qui inclut la commande, lancer dans le conteneur MCP :

```sh
node dist/src/cug/runScopedInventory.js INSTALLATION_ID REPOSITORY_ID OWNER_ID OWNER/REPOSITORY
```

L'opérateur donne les quatre valeurs à partir de GitHub. Aucun nom n'est dérivé d'un reçu.
La commande réutilise la clé protégée, le jeton borné en lecture à un seul dépôt, la vérification
d'appartenance à l'installation, le recoupement des IDs et le stockage privé déjà utilisé pour UAES.
Un dépôt public simplement visible ne suffit toujours pas. Toute identité divergente est refusée.
`CUG_SCOPED_SNAPSHOT_STORED` désigne une preuve locale par empreinte. `CUG_SCOPED_COVERAGE_UNVERIFIED`
ne constitue pas une preuve d'absence. Aucun jeton, chemin serveur ni contenu privé n'est affiché.

CUG reste la seule App prouvée par cette commande. Le webhook et le consommateur automatique
restent bornés à UAES. Le stockage existant est borné à 1 000 entrées et n'est pas purgé par
cette commande. Ce mode opérateur n'active pas un abonnement multi-dépôts et ne transforme
jamais un rapprochement de nom en autorisation GitRegistry, Plesk ou GRT.

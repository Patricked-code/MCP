# Capsule isolée CUG/GRT — WT-MCP-CUG-GRT-20261114-01

## Premier incrément

Le dépôt MCP embarque sous `capsules/grt-repository-creation/` un module de consultation de reprise. Le module de lecture n’est ni monté dans Express ni enregistré comme outil MCP. L’admission CUG est raccordée séparément dans le serveur, sans dépendance au module de lecture. Le moteur GRT reste propriétaire du questionnaire, du workflow de création, du handoff et des reçus. La capsule ne contient aucune copie de ce moteur. Le pilote existant `/gouvern` reste distinct et intact. Aucun pilote à lancer avec le propriétaire pour valider cet incrément.

## Contrat et communication

Le point de reprise est référencé dans [MCP #389](https://github.com/Patricked-code/MCP/pull/389#issuecomment-6869339990), [GRT #342](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/issues/342) et [GRT #343](https://github.com/chainsolutions-wealthtech/Governed-Repository-Template/pull/343). Les fixtures viennent du contrat GRT au SHA `b1fe9bf60480680e80b4654d7c4c059894b4812e`. Le code d’admission utilise la sonde GitHub en lecture seule, uniquement si son profil est activé et configuré. Aucun workflow GRT n’est lancé. Les tests locaux utilisent des installations simulées et ne prouvent pas une connexion CUG en production.

`resumeRepositoryCreation` prend une référence d’acteur déjà vérifiée par l’hôte. Les ports d’autorisation et de lecture lui sont fournis par l’hôte, jamais par l’appelant. Le module autorise avant toute lecture, utilise d’abord la demande centrale et ne consulte le dépôt cible qu’après un handoff corrélé. L’identité du dépôt, sa révision et la provenance des lectures doivent être attestées par le futur adaptateur de l’hôte. Aucun jeton, corps d’issue ou réponse du questionnaire ne sort de la projection. `READY` signifie consultable, pas exécutable. L’attestation de baseline n’est ni un déploiement ni une évaluation d’architecture.

## Lots suivants

1. Valider en environnement autorisé le nouveau point d’entrée MCP et sa page App ID + Bearer, sans Client ID à saisir. Le Bearer présenté sur la page doit être le même jeton OAuth que celui ayant demandé le lien. Le secret partagé n’est pas accepté.
2. Vérifier les comptes autorisés par l’installation CUG et les droits de l’acteur. La sélection retrouve ou crée une identité canonique et sa racine de continuité, sans session gouvernée ni travail automatique.
3. Raccorder la lecture GRT au registre de reprise. Distinguer créer, observer et reprendre. Une création explicite reçoit son propre ID et ses checkpoints par silo. En cas de réponse incertaine, relire l’état et les preuves avant tout rejeu. Observer ne crée aucun dossier. Le contrat machine de GRT #343 et sa disponibilité réelle doivent être vérifiés avant d’autoriser une création.
4. Valider hors pilote historique les lectures autorisées et refusées, puis le raccordement réel CUG avec les autorisations requises. Vérifier les routes et le catalogue MCP, la CI exacte, la revue et le déploiement gouverné par le pipeline existant. Aucun changement manuel sur S1.

## Tests de la tranche

`node --test capsules/grt-repository-creation/test/*.test.mjs` depuis la racine. La CI dédiée ne demande que `contents: read`, ne reçoit aucun secret et ne déclenche aucun déploiement. Le pilote existant reste inchangé. Le serveur ajoute un outil et deux opérations d’admission répertoriées comme non-provisionnement. L’entrée HTTP est désactivée par défaut.

## Déploiement et activation de l’admission réelle

- Le code est intégré à l’image via `src/cug/`. L’outil `mcp_start_governed_request_auth` renvoie un lien HTTPS de cinq minutes au maximum. La référence éphémère est dans le fragment et le jeton ne transite ni dans l’URL ni dans le journal. Aucun appel, même réussi, ne crée de session gouvernée, de chantier ou de dépôt.
- Le déploiement ne configure ni n’active l’entrée. Le flag `MCP_CUG_ADMISSION_ENABLED` est faux par défaut. Pour l’activer, l’opérateur doit provisionner hors Git deux fichiers réguliers mode 0600 dans le volume protégé. `cug-admission.json` contient le couple OAuth `subject` / `clientId` explicitement autorisé, la clé d’identité hexadécimale stable `identityKey` et les comptes admis avec `login`, `installationId`, `probeRepository`. `cug-app-private.pem` contient la clé CUG. Aucune clé de l’ancien pilote n’est réutilisée par défaut.
- Le sujet OAuth historique peut être partagé entre plusieurs clients. Il ne prouve pas à lui seul l’identité d’une personne. Le premier lot est borné au couple sujet/client explicitement configuré et au jeton OAuth exact qui a ouvert la page. Il ne constitue pas une admission multi-utilisateur.
- Le serveur vérifie chaque installation avec un jeton GitHub de portée `contents:read` bornée au dépôt de preuve. Le compte choisi est revérifié avant émission des IDs. Les IDs sont stables pour une même clé et un même sujet/client/compte/installation. Ils ne confèrent aucun droit, et aucun registre de chantier n’est encore alimenté.
- Désactiver le flag suffit à retirer l’accès. Le retour de code passe par le pipeline gouverné existant. Ne pas activer la création ni annoncer de reprise GRT live tant que le raccordement et le contrat de #343 ne sont pas attestés.

Tests hôte : `node --import tsx --test tests/cugAdmission.test.ts`. Le test de transport emploie le vrai client et serveur SDK MCP, sans session de travail, avec des preuves OAuth et GitHub simulées.


## Lot 2 — Questionnaire CASE 1, soumission et reprise centrale

Après le choix du compte vérifié, l’interface collecte le nom, la visibilité et
l’objectif du dépôt. Le propriétaire vient du compte vérifié, jamais de la
requête du navigateur. Le plan de contrôle GRT est public, y compris pour un
dépôt cible privé. Les deux choix explicites sont la publication du dossier
et la demande de création sous les contrôles du moteur. Aucun champ de secret,
de Plesk ou de serveur n’est envoyé. Le formulaire ne remplace pas les étapes
adaptatives et les questions locales du moteur.

La soumission exige un profil OAuth `mcp:write`, une installation re-vérifiée,
`ENABLE_WRITE_TOOLS` et `MCP_CUG_GRT_SUBMISSION_ENABLED`, faux par défaut.
Dans le profil protégé existant, `grt` est facultatif et contient
`installationId` de l’installation CUG sur GRT, `allowedTarget` (un seul
`owner/repo` autorisé) et `expectedGrtMain` (SHA revu qui contient le contrat
machine). Le contrôle du SHA est un préflight, pas un verrou atomique du
workflow GitHub. L’adaptateur émet seulement le `repository_dispatch` existant
`governed_request_start` sur le GRT exact. Il ne crée pas le dépôt lui-même.
Le jeton éphémère de dispatch est borné à GRT, distinct de la sonde d’admission
sur le compte cible. Le profil et le pilote historique ne sont pas réutilisés.

Le formulaire emploie un cookie temporaire HttpOnly et une référence
aléatoire de formulaire pour éviter qu’un onglet réemploie l’admission d’un
autre. Aucun jeton OAuth ou CUG n’est porté par ces références. Le flux
initial demande toujours au navigateur le Bearer OAuth de l’appel MCP, et
l’usage depuis un client qui ne l’expose pas reste à raccorder.

Une réponse GitHub 204 signifie **événement accepté**, pas dossier ou dépôt
créé. Les résultats incertains ne sont pas rejoués automatiquement. Le verrou
de soumission est local au processus et borné dans le temps. La déduplication
durable du dossier appartient au moteur GRT. La lecture retourne uniquement
un checkpoint corrélé à la cible configurée, issu du dossier central.
Le lien GitHub vers le dossier et `mcp_read_governed_request_checkpoint`
retrouvent la même autorité. `mcp_start_governed_request_auth` accepte aussi
une reprise par nom ou par `projectContinuityId`, en lecture seule après
sélection. Pas de connexion GitHub web indépendante ni de démarrage
automatique du codeur dans ce lot. Un checkpoint central n’est pas le reçu
local ni une autorisation de coder.

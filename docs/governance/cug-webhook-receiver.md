# Webhook CUG — réception seule et pilote UAES

Ce lot prolonge la découverte GitHub envisagée dans [MCP #401](https://github.com/Patricked-code/MCP/pull/401), sans modifier l'admission CUG/GRT. Il ne collecte pas encore les dépôts ou les autres apps, ne modifie pas le GitRegistry et ne déclenche aucune tâche, création, écriture GitHub ou opération serveur. Aucun token d'installation ou clé privée CUG n'est nécessaire pour vérifier une livraison signée.

## Déployer et valider

1. Valider la CI et la revue de la révision exacte. Après fusion autorisée, vérifier le run **MCP Governed Deploy** et son attestation pour le SHA attendu. Ne pas modifier directement le code sur S1, ni exposer un nouveau port. Confirmer que le proxy HTTPS existant transmet la route à MCP.
2. Confirmer dans GitHub que l'installation choisie est celle de CUG (App ID `5417646`) et qu'elle couvre `chainsolutions-wealthtech/universal-agent-engineering-system` (Repository ID `1429189311`). Ne pas reprendre un ID d'installation d'un autre connecteur sans cette preuve.
3. Via la configuration opérateur de S1, placer dans `/app/secrets/cug-webhook-secret` un secret aléatoire dédié sous forme de 64 caractères hexadécimaux minuscules (32 octets d'aléa). Un saut de ligne final est accepté. Le fichier doit être régulier, lisible par le processus et en mode `0600`. Ne jamais versionner le secret. Le volume existant `/app/data` doit pouvoir accueillir le sous-répertoire privé `cug-webhook-receipts`.
4. Configurer `MCP_CUG_WEBHOOK_PILOT_INSTALLATION_ID` avec l'ID attesté et `MCP_CUG_WEBHOOK_ENABLED=true` par le circuit opérateur. Vérifier que `/health` et l'authentification MCP ne régressent pas. Un POST non signé à `/webhooks/github/cug` doit être refusé avec `401` et ne créer aucun reçu.
5. Dans les réglages de CUG, activer le webhook avec l'URL HTTPS effectivement déployée, le type JSON, le même secret et la vérification TLS. Vérifier l'abonnement `repository`. Dans **Recent deliveries**, contrôler le statut du ping s'il est livré, puis corréler un événement pilote réel accepté avec un reçu unique par `X-GitHub-Delivery`. Une relivraison identique doit rester sans doublon. Ne pas créer ou renommer de dépôt uniquement pour provoquer ce test sans autorisation de cette mutation.

## Contrat et limites

- Route inactive par défaut (`404`). Corps brut JSON borné à 2 Mio et sans compression. Signature `X-Hub-Signature-256` validée avant de lire les données métier.
- `ping` authentifié et événements hors périmètre ignorés avec `204`. Pour `repository`, l'ID stable du dépôt doit être celui d'UAES. `installation` et `installation_repositories` n'enregistrent qu'un signal relatif à l'installation pilote, pas la liste des dépôts présents dans la charge utile.
- `202` signifie reçu durable et non traitement métier. `204` signifie aussi rejeu identique, `409` identifiant réutilisé avec données différentes, `503` prérequis ou stockage indisponibles. Le récepteur ne stocke ni corps brut, ni entêtes, ni noms de dépôts privés. Le nom du fichier est l'ID de livraison normalisé. Le reçu privé contient les IDs, l'événement, l'action, l'heure et l'empreinte SHA-256 du corps.
- Journal pilote borné à 10 000 entrées et 32 demandes en attente par processus. Le volume doit permettre une écriture atomique avec lien physique et synchronisation. Le récepteur ne purge pas automatiquement. À saturation, une nouvelle livraison n'est pas acquittée. Prévoir la rétention et le rattrapage lors du raccordement du collecteur.
- Retrait : désactiver le webhook dans GitHub et remettre `MCP_CUG_WEBHOOK_ENABLED=false` via le circuit opérateur. Conserver les reçus comme preuves. L'admission CUG, `/gouvern` et le GitRegistry ne changent pas.

Prochaine tranche après preuve pilote : authentifier le collecteur comme CUG, faire l'inventaire initial, réconcilier les événements manqués et proposer un candidat GitRegistry distinct de toute association S1/S2. Les autres GitHub Apps ne sont listées que si une source autorisée confirme leur accès au dépôt.

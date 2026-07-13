# MCP_SECURITY_MODEL.md

## Rôle
Modèle de sécurité propre au MCP.

## Règles
- Tokens hors Git.
- Secrets masqués dans logs.
- Écriture contrôlée seulement.
- Pas de push force.
- Pas de déploiement sans rôle.
- Pas de suppression sans inventaire.
- Actions sensibles journalisées.

## À vérifier
Stockage réel des tokens, audit logs, RBAC, expiration des accès et séparation lecture/écriture/admin.

## Zones de confiance

- GitHub : code et documentation versionnés, jamais les valeurs sensibles ;
- conteneur MCP : runtime borné, secrets injectés hors Git ;
- S1/S2 : accès via outils nommés et règles serveur ;
- agent IA : aucun droit implicite, sortie publique sûre ;
- humain : approbation des actions sensibles selon habilitation.

## Contrôles

Moindre privilège, branches contrôlées, PR, chemins interdits, masquage, audit, validation humaine, séparation lecture/écriture/déploiement et possibilité de révocation.

## Réponse à un écart

Passer en lecture seule, préserver les preuves sans valeur secrète, consigner l’incident, révoquer ou corriger par un opérateur, tester puis mettre à jour permissions et point de reprise.

## Historique

- 2026-07-13 : formalisation des zones de confiance et de la réponse aux écarts.

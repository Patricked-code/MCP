# Suivi du chantier CUG — WT-MCP-CUG-GRT-20261114-01

## Checkpoint du 20 novembre 2026

- Baseline de préparation constatée à **05 h 38 min 41 s, Europe/Paris** : `main` et runtime `3bb76993da9a1a8e5b6577352cf7d1a1069087f5`, état documentaire aligné, verdict `FULLY_ALIGNED` dans l'observation read-only Live State v1351. Cette observation ne vaut pas attestation permanente. [Fusion documentaire #412](https://github.com/Patricked-code/MCP/pull/412).
- **A validé sur UAES.** Le runbook corrobore une collecte opérateur réelle, un `repository.edited` accepté `202`, le rejeu du même identifiant en `204` et un seul reçu privé.
- **B1 validé sur UAES.** Consommateur mis en service par le Governed Deploy MCP #206. Projection privée liée au reçu réel et à son empreinte, confirmée par contrôle opérateur. [#407](https://github.com/Patricked-code/MCP/pull/407).
- **B2 opérateur prouvé sur un deuxième dépôt.** Le 20 novembre à **04 h 21 min 55 s, Europe/Paris**, la sortie partagée pour `chainsolutions-wealthtech/Governed-Repository-Template` donne `CUG_SCOPED_SNAPSHOT_STORED`, `NO_NAME_MATCH`, `NOT_VERIFIED`, `provisioningAuthorized=false`. Empreinte et provenance dans [PREUVES.md](PREUVES.md). Le code livré dans [#411](https://github.com/Patricked-code/MCP/pull/411) n'élargit ni le webhook ni le consommateur.
- **Restent ouverts** : couverture complète et automatisation hors UAES, autres Apps, inventaire courant et pages CUG, correspondances prouvées S1/S2, mise à jour canonique gouvernée, pilote de création GRT distinct. Aucune écriture GitRegistry ou Plesk imputée à A, B1 ou au test B2.
- **Intention d'origine clarifiée par le propriétaire.** [Exigence CUG-E00](EXIGENCES.md) et [décision CUG-D08](DECISIONS_LOG.md). Cette clarification documentaire ne change ni le statut des preuves ni l'action de reprise.

**NEXT_ACTION — CUG-B2-01** : constituer en lecture seule la matrice **propriétaire attendu → installation CUG vérifiée → mode de couverture → dépôts accessibles → écart ou inconnu**. Ne pas activer une nouvelle installation ou étendre le webhook pour réaliser cet inventaire. Critère de sortie dans [TODO.md](TODO.md).

## Points d'arrêt historiques

- **14 novembre** : `478e031` reçoit et déduplique, `8f45bf5` structure les observations, #404 collecte en mode opérateur. Un déploiement n'est pas une livraison ni la preuve d'une fiche.
- **16–18 novembre** : les deux preuves UAES restent à obtenir. Une tentative du collecteur le 16 échoue sur l'accès à la clé privée attendue. La clé de collecte et le secret de signature du webhook sont distincts.
- **19 novembre** : les quatre blocs A, B, C et D sont conservés séparément ; ne pas rejouer ce qui est livré.
- **20 novembre** : A et B1 sont attestés ; la tranche opérateur B2 a un essai positif sur un deuxième dépôt. Voir [PREUVES.md](PREUVES.md) et retenir le checkpoint ci-dessus pour la suite.

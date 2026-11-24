# SECURITY.md — Sécurité du MCP WealthTech

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **consignes de sécurité**, commencer par [le document racine](../SECURITY.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Principes absolus

- Aucun secret réel dans GitHub.
- Aucun fichier `.env` réel dans le dépôt.
- Aucune clé SSH dans le dépôt.
- HTTPS obligatoire.
- Authentification bearer token obligatoire.
- Outils read-only au départ.
- Aucune action sensible sans confirmation explicite.

## Clés SSH

Les clés SSH doivent être dédiées au MCP, stockées côté serveur dans un dossier non versionné et avec des permissions strictes.

## Domaines protégés

Les domaines listés dans `GPT.md` ne doivent jamais être modifiés par un outil automatique non validé.

## Journalisation

Chaque appel d’outil doit être journalisé avec :

- nom de l’outil ;
- serveur cible ;
- commande ou action logique ;
- résultat ;
- erreur éventuelle.

## GitHub

Créer uniquement `.env.example`. Ne jamais ajouter les secrets réels.

## Politique actuelle

Le MCP est en mode lecture seule. Les outils sensibles sont volontairement exclus de la première version.

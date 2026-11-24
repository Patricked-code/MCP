# KUBERNETES_FUTURE.md — Trajectoire Kubernetes

<!-- MCP-DOC-AUTHORITY-MIRROR-20261124 -->
> **Statut documentaire au 24 novembre 2026 — référence de conception initiale, pas un état opérationnel vérifié.** Les informations ci-dessous sont conservées pour leur provenance ; elles ne certifient ni la situation actuelle des outils ni les travaux encore à faire. Pour les références actives concernant **projet Kubernetes**, commencer par [le document racine](../KUBERNETES_FUTURE.md), [les autorités documentaires](../SOURCE_OF_TRUTH.md) et les preuves GitHub/CI. Pour tout état S1/runtime, réobserver le Live State MCP. Ne pas réinterpréter les sections historiques ci-dessous comme des attestations nouvelles.
<!-- /MCP-DOC-AUTHORITY-MIRROR-20261124 -->

## Décision actuelle

Kubernetes n’est pas requis pour le premier déploiement du MCP.

## Objectif futur

Préparer une architecture compatible avec Kubernetes lorsque l’écosystème WealthTech aura plusieurs services : frontend, backend, workers, Redis, MySQL, ClickHouse, monitoring et blockchain jobs.

## À prévoir plus tard

- manifests ou Helm chart ;
- secrets Kubernetes ;
- ingress HTTPS ;
- probes de santé ;
- volumes persistants ;
- jobs et cronjobs ;
- autoscaling ;
- stratégie de rollback.

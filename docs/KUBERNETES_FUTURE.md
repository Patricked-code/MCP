# KUBERNETES_FUTURE.md — Trajectoire Kubernetes

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

# SUIVI.md — Point de reprise courant

Date : 2026-08-09

Projet : WealthTech MCP SSH Bridge

Dépôt actif : `Patricked-code/MCP`

Branche officielle : `main`

Chemin serveur : `/opt/apps/wealthtech-mcp-ssh-bridge`

## État réel attesté avant le changement

```text
GitHub main : 4228119a9950828d372d1fbacbd9a613a7efa2d6
S1 branche  : main
S1 HEAD     : 4228119a9950828d372d1fbacbd9a613a7efa2d6
S1 statut   : propre, diff vide
Conteneur   : wealthtech_mcp_ssh_bridge, healthy
Ping MCP    : wealthtech_ssh_bridge_ok
```

La baseline GitHub et le checkout S1 sont alignés. Le tag annoté
`mcp-baseline-2026-08-09-4228119` n'a pas été trouvé lors du dernier contrôle et
reste à créer/protéger par une action d'administration GitHub séparée.

## Risque de sécurité actif

Le remote S1 utilise encore :

```text
git@github.com-mcp-patricked-rw:Patricked-code/MCP.git
```

pour `fetch` et `push`. Le suffixe `rw` ne prouve pas à lui seul les droits
effectifs, mais la configuration ne garantit ni une identité GitHub read-only ni
la neutralisation locale du push.

## Changement en cours

Tâche : `TASK-20260809-001`

Branche : `mcp/s1-readonly-deploy-identity-20260809`

Objectif : réserver à S1 une identité GitHub de déploiement limitée à la lecture.

Le changement versionné :

- refuse l'ancien alias `github.com-mcp-patricked-rw` dans
  `mcp_sync_from_github_s1` ;
- autorise uniquement `github.com-mcp-patricked-ro` pour le fetch de
  `Patricked-code/MCP` ;
- exige une URL de push neutralisée égale à
  `disabled://mcp-s1-read-only` ;
- ajoute un test comportemental couvrant l'identité historique, un push actif et
  la configuration cible ;
- documente la rotation sans secret et avec rollback.

## État de production pendant la PR

La production n'est pas modifiée par la préparation de cette branche. Jusqu'à la
rotation effective, S1 demeure sur `main@4228119…` avec l'ancien remote.

## Prochaines actions, dans cet ordre

1. terminer les tests, le typecheck, le build, le contrôle documentaire et le
   scan de secrets ;
2. ouvrir une Pull Request draft et obtenir la CI/revue ;
3. créer sur S1 une nouvelle paire de clés dédiée, sans exposer la clé privée ;
4. enregistrer uniquement la clé publique comme deploy key GitHub avec écriture
   désactivée ;
5. tester la lecture de `main` avec l'alias `github.com-mcp-patricked-ro` ;
6. après fusion du correctif, synchroniser le commit fusionné par l'ancien outil
   encore actif ;
7. basculer le fetch vers l'alias `-ro` et le push vers la sentinelle désactivée ;
8. attester que le fetch réussit et que deux chemins de push sont refusés : la
   sentinelle locale et la deploy key GitHub read-only ;
9. inventorier les usages de l'ancienne identité, puis révoquer son accès à ce
   dépôt et la retirer de S1 ;
10. reconstruire/redémarrer le runtime au SHA fusionné et attester
    GitHub = S1 = image/runtime.

Runbook : `docs/runbooks/S1_GITHUB_READ_ONLY_DEPLOY_IDENTITY.md`.

## Interdictions

- aucun secret, clé privée ou contenu de `.ssh` dans Git ;
- aucun changement direct de code dans le checkout de production ;
- aucun push direct sur `main` ;
- aucune révocation de l'ancienne identité avant preuve de lecture avec la
  nouvelle ;
- aucune supposition fondée uniquement sur le nom `-ro` ou `-rw` ;
- aucun déploiement avant fusion, CI réussie et SHA attendu.

## Rollback

Tant que l'ancienne identité n'est pas révoquée, le rollback consiste à restaurer
temporairement l'ancien remote uniquement si le fetch read-only échoue, sans
modifier le code ou l'historique. Après validation complète, l'ancien accès doit
être révoqué ; un rollback ultérieur exige alors une nouvelle identité read-only,
pas la réactivation permanente d'un credential d'écriture.

# Rotation de l'identité GitHub de déploiement S1 en lecture seule

## But

Autoriser `/opt/apps/wealthtech-mcp-ssh-bridge` à récupérer
`Patricked-code/MCP:main` sans permettre à S1 de pousser vers GitHub.

Cette procédure ne publie jamais la clé privée. Elle doit être exécutée par un
administrateur S1/GitHub identifié, après fusion et CI réussie de la modification
qui autorise l'alias `github.com-mcp-patricked-ro`.

## État cible

```text
Fetch : git@github.com-mcp-patricked-ro:Patricked-code/MCP.git
Push  : disabled://mcp-s1-read-only
GitHub deploy key : Allow write access = false
```

## Préconditions

- connaître le SHA exact de `main` à déployer ;
- vérifier que S1 est sur `main`, propre et aligné avant rotation ;
- conserver l'ancienne identité uniquement pendant la fenêtre de validation ;
- disposer d'un accès administrateur au réglage Deploy keys du dépôt ;
- ne copier hors de S1 que la clé publique `.pub` et son fingerprint.

## 1. Créer la clé dédiée sur S1

Créer une nouvelle paire Ed25519 dans `/root/.ssh` avec des permissions `0700`
pour le dossier et `0600` pour la clé privée. Utiliser un nom distinct, par
exemple `id_ed25519_github_mcp_s1_ro_20260809`.

Consigner uniquement :

- le fingerprint SHA-256 produit par `ssh-keygen -lf` ;
- la date de création ;
- le chemin local ;
- le dépôt autorisé.

Ne jamais afficher, copier ou journaliser le contenu de la clé privée.

## 2. Enregistrer la deploy key dans GitHub

Dans `Patricked-code/MCP` :

```text
Settings → Deploy keys → Add deploy key
Title : S1 MCP deploy read-only 2026-08-09
Key   : contenu de la clé publique uniquement
Allow write access : désactivé
```

Relire le réglage après création et consigner l'identifiant de la deploy key.

## 3. Ajouter l'alias SSH sans remplacer l'ancien

Ajouter à la configuration SSH root de S1 un bloc dédié :

```sshconfig
Host github.com-mcp-patricked-ro
  HostName github.com
  User git
  IdentityFile /root/.ssh/id_ed25519_github_mcp_s1_ro_20260809
  IdentitiesOnly yes
  BatchMode yes
  StrictHostKeyChecking yes
```

Ne pas modifier encore le remote du dépôt et ne pas supprimer l'ancien alias.

## 4. Tester la lecture avant bascule

Depuis S1, interroger explicitement `refs/heads/main` avec le nouvel alias. Le SHA
retourné doit être exactement le SHA attendu avant toute bascule.

Échecs bloquants : clé inconnue, erreur de host key, dépôt inaccessible, SHA
différent ou demande interactive.

## 5. Synchroniser le correctif fusionné

Le runtime encore déployé accepte l'ancien remote. Il peut donc effectuer une
dernière synchronisation fast-forward contrôlée vers le SHA fusionné, à condition
que le working tree soit propre et que le SHA soit celui validé par la CI.

Ne pas utiliser `reset`, `clean`, `rebase`, `stash` ou une écriture directe dans
le checkout de production.

## 6. Basculer les URLs Git

Après la lecture réussie avec la nouvelle deploy key :

```bash
git remote set-url origin git@github.com-mcp-patricked-ro:Patricked-code/MCP.git
git remote set-url --push origin disabled://mcp-s1-read-only
```

Relire ensuite séparément :

```bash
git remote get-url origin
git remote get-url --push origin
```

## 7. Prouver lecture autorisée et écriture refusée

Quatre preuves sont obligatoires :

1. `git fetch --no-tags origin main` réussit ;
2. `FETCH_HEAD` est exactement le SHA attendu ;
3. un `git push --dry-run origin ...` échoue localement sur le protocole
   `disabled` ;
4. un `git push --dry-run` visant directement l'URL `…-ro` échoue avec le refus
   GitHub d'une deploy key en lecture seule.

Le test direct doit utiliser `--dry-run` et une ref de sonde inexistante. Aucun
commit, tag ou branche ne doit être créé.

## 8. Révoquer l'ancienne voie d'écriture

Avant révocation, inventorier tous les remotes et services qui utilisent le
fingerprint de l'ancienne identité. Si elle est dédiée au MCP :

1. révoquer son accès à `Patricked-code/MCP` dans GitHub ;
2. déplacer sa configuration et ses fichiers locaux dans une quarantaine root
   horodatée, sans les afficher ;
3. refaire les quatre preuves avec la nouvelle identité ;
4. supprimer la quarantaine seulement selon la politique de rétention validée.

Si l'ancienne clé est partagée, ne pas la supprimer à l'aveugle : retirer
uniquement son accès à ce dépôt et ouvrir une tâche distincte pour les autres
usages.

## 9. Déployer et attester

Après build et redémarrage contrôlés, vérifier :

```text
GitHub main SHA = S1 HEAD = révision de l'image/runtime
working tree propre
conteneur healthy
/health local et public attendus
/mcp sans authentification = 401 attendu
initialize MCP réussi
ping réussi
tools/list conforme
```

## Rollback

Avant révocation de l'ancienne identité, restaurer temporairement l'ancien remote
est autorisé uniquement si la nouvelle clé ne peut pas lire le SHA attendu. La
cause doit être documentée et aucune écriture GitHub ne doit être effectuée.

Après révocation, ne pas réactiver durablement une identité d'écriture. Créer une
nouvelle deploy key read-only ou corriger l'alias/host key, puis reprendre la
procédure depuis la preuve de lecture.

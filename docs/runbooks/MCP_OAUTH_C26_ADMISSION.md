# OAuth P0 / C26 — admission gouvernée sur l'autorité existante

**Source de vérité :** `Patricked-code/MCP` issue #235, PR #207 (owner `Wealthtechinnovations`), issue #346. Ce runbook ne crée **ni deuxième programme, ni seconde file, ni serveur OAuth, ni session**, et ne vaut pas autorisation de déploiement.

## Préconditions obligatoires

1. GitHub `main`, S1 HEAD et Docker runtime `FULLY_ALIGNED`, arborescence S1 propre. Préserver Regulatory et ses locks.
2. PR #207 à un **SHA exact** dont CI push et pull_request sont `SUCCESS`, sans conflits. Examen indépendant de sécurité sur ce même SHA, explicitement `APPROVED` avant fusion.
3. Identifier la seule autorité de stockage `/app/data`, le système de fichiers, les autres processus écrivains et les éventuels replicas distants. Un `docker ps` local ne peut **pas** prouver l'absence de replicas sur d'autres hôtes.
4. Pas de nouvelle session C26 ni d'accès programmé tant que son principal, son transport et son Bootstrap Receipt ne sont pas réellement attestés.
5. Aucun secret, code OAuth, refresh token ou cookie ne doit être communiqué dans GitHub, les journaux ou les conversations.

## Préflight de topologie S1 — opérateur habilité, lecture seule

Le MCP actuellement déployé n'expose pas les `.Mounts` Docker pour éviter une divulgation de chemins sensibles. L'outil existant `mcp_runtime_image_attestation_s1` **ne certifie donc pas cette propriété**. Le contrôle suivant est réservé à la console S1 d'un opérateur autorisé, et produit uniquement des statuts, sans valeurs de secret :

```bash
set -euo pipefail
container='wealthtech_mcp_ssh_bridge'
root='/opt/apps/wealthtech-mcp-ssh-bridge'
data="$(realpath -e "$root/data")"
secret_dir="$(realpath -e "$root/secrets")"

inspect_mount() {
  local target="$1" source="$2" actual
  actual="$(docker inspect --type container \
    --format "{{range .Mounts}}{{if eq .Destination \"$target\"}}{{.Type}}|{{.Source}}|{{.RW}}{{end}}{{end}}" \
    "$container")"
  test "$actual" = "bind|$source|true"
}
inspect_mount '/app/data' "$data" && echo 'OAUTH_DATA_BIND=PASS'
inspect_mount '/app/secrets' "$secret_dir" && echo 'OAUTH_SECRETS_BIND=PASS'

fstype="$(findmnt -n -T "$data" -o FSTYPE)"
case "$fstype" in
  ext4|xfs|btrfs|zfs) echo 'OAUTH_LOCAL_FS_CLASS=PASS' ;;
  *) echo 'OAUTH_LOCAL_FS_CLASS=UNVERIFIED'; exit 1 ;;
esac

# Le nombre ne constitue pas une preuve d'absence d'instances hors S1.
test "$(docker ps --filter 'name=^/wealthtech_mcp_ssh_bridge$' \
  --format '{{.Names}}' | wc -l)" -eq 1
echo 'OAUTH_S1_NAMED_CONTAINER_COUNT=1'

credential="$root/secrets/mcp-c26-oauth-login-token"
if test -f "$credential" && test ! -L "$credential" \
  && test "$(stat -c %a "$credential")" = 600; then
  echo 'C26_SECRET_FILE_PERMISSIONS=PASS'
else
  echo 'C26_SECRET_FILE_PERMISSIONS=NOT_PROVISIONED_OR_BLOCKED'
fi
```

Un résultat `PASS` sur S1 ne certifie **pas** une autre machine : l'inventaire des autres hôtes, instances Docker et écrivains reste nécessaire. Le verrou `mkdir` de la PR #207 n'est autorisé que sur un même filesystem local POSIX disposant de `mkdir` et `rename` atomiques ; **aucun NFS/volume isolé par replica** ne peut être déclaré compatible sans attestation dédiée.

## Secret OAuth distinct C26 — jamais dans le dépôt

- Utiliser le montage `./secrets:/app/secrets` déjà déclaré par `docker-compose.yml`, avec un fichier ordinaire `mcp-c26-oauth-login-token`, mode `0600`, secret aléatoire fort, différent de `MCP_AUTH_TOKEN`.
- Générer et conserver le secret directement par une procédure S1/coffre autorisée, hors Git et hors conversation. Ne jamais copier sa valeur dans les preuves.
- Une absence de fichier, un lien symbolique, des droits trop ouverts ou le réemploi du Bearer administrateur laisse **C26 désactivé**.
- Le login C26 n'autorise que `/oauth/authorize`. Son cookie `Path=/oauth` n'est pas une session administrateur. Le principal OAuth attendu est exactement `oauth:wealthtech-mcp-c26-agent`.
- Garder une session navigateur distincte de Regulatory : en présence d'un cookie administrateur valide, l'identité administrateur conserve la priorité.

## Admission, déploiement et certification

1. Faire examiner la PR #207 et ses tests (concurrence 2 processus, replay/rotation, autorisation-code one-time, redémarrage, PKCE, consentement, isolation C26/Regulatory) par un examinateur habilité **distinct de l'auteur**. Une pré-revue `COMMENT` n'est pas `APPROVED`.
2. Après preuves de topologie et de secret, fusionner **uniquement** par les protections `main` existantes, puis laisser `MCP Governed Deploy` faire la CI, le déploiement, les attestations et le rollback.
3. Vérifier à nouveau GitHub main = S1 HEAD = Docker SHA et `FULLY_ALIGNED`, santé OAuth, absence de régression Bearer historique. Rejeter tout drift.
4. Reconnecter une **liaison OAuth C26 distincte** depuis ChatGPT avec le secret dédié, par la page de consentement du MCP ; ne jamais transférer le contexte Regulatory. Vérifier côté MCP le `principalId`, le `connectionContextId`, le fingerprint du transport, la session et le Bootstrap Receipt **C26 propre**.
5. Exécuter **un véritable run SCHEDULED non interactif** avec la connexion attendue. Les appels interactifs et les préférences `Tout autoriser` ne prouvent pas la capacité non interactive. Ne réactiver l'automatisation horaire existante qu'après ce résultat `PASS`.
6. Admission agent codeur P2, claim sous véritable session C26, code/PR/CI/revue/déploiement governés, puis certificat C27 avec preuves end-to-end. Si un gate échoue, laisser l'automatisation suspendue et déclarer le blocage, **pas de GLOBAL_MCP_COMPLETE**.

## Verrou abandonné

Les répertoires `*.transaction-lock` laissés après interruption bloquent volontairement les écritures. La récupération exige une preuve opérateur qu'aucun writer de ce fichier ne peut encore s'exécuter, puis un contrôle de la révision persistée **avant** toute intervention. Aucune suppression automatique fondée sur une durée ou un PID historique n'est autorisée.

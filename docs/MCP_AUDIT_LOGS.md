# MCP Audit Logs

## Structure des logs

Les evenements d audit sont stockes dans le registre local MCP/Git. Chaque evenement contient:

- identifiant;
- date ISO;
- type;
- acteur;
- message;
- metadata assainies.

## Evenements traces

- connexion GitHub;
- demarrage de session d onboarding;
- reponse au questionnaire;
- choix bloque;
- creation de profil agent;
- generation ou proposition de bootstrap repo via `onboarding.repo_bootstrap_prepared`;
- generation ou blocage du bootstrap organisation via `onboarding.organization_bootstrap_prepared`;
- verification manuelle de politique securite organisation via `onboarding.organization_security_policy_verified`;
- future tentative d ecriture sur branche MCP.

## Exemple

```json
{
  "type": "onboarding.session_started",
  "actor": "Administrateur humain",
  "message": "Onboarding session_started: ok",
  "metadata": {
    "githubOrg": "chainsolutions-wealthtech",
    "rights": {
      "read": true,
      "write": false,
      "admin": false,
      "orgAdmin": false
    }
  }
}
```

## Non-stockage des secrets

Les champs contenant `token`, `secret`, `password` ou `private` sont rediges avant stockage par le module d audit. Les tokens bruts ne doivent jamais entrer dans un evenement.

## Lecture et pagination future

`GET /git/audit` retourne les evenements recents avec filtres simples par acteur, type et limite. Une pagination plus stricte pourra etre ajoutee quand le volume augmentera.

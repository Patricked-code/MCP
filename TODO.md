# TODO.md

## État canonique structurel

```canonical-state
{
  "repository": "Patricked-code/MCP",
  "branch": "main",
  "s1Root": "/opt/apps/wealthtech-mcp-ssh-bridge",
  "fetchRemote": "git@github.com-mcp-patricked-ro:Patricked-code/MCP.git",
  "pushRemote": "disabled://mcp-s1-read-only",
  "container": "wealthtech_mcp_ssh_bridge"
}
```

## Rôle

Travaux restant réellement à accomplir.

## Governed Autodeploy V1

- [x] Classifier les 189 Markdown Git et contrôler leur cohérence par CI.
- [x] Réattester 33 Markdown du miroir runtime : 7 suivis, 26 runtime-only.
- [x] Conserver séparément l’historique `209 = 183 + 26` et la surface courante `215 = 189 + 26`.
- [x] Terminer le bootstrap S1 et le workflow manuel exact-SHA.
- [x] Vérifier health, OAuth, MCP 401, OCI, Live State et rollback.
- [x] Corriger le polling P2 avec TDD puis résoudre le thread après fusion.
- [x] Garantir la parité exacte des candidats documentaires CI avec les sources.
- [x] Activer `pushEnabled=true` via la PR #42.
- [x] Attester le premier déploiement automatique par push.
- [x] Créer puis fusionner la seconde PR documentaire utile (#43).
- [x] Attester le second déploiement automatique canonique au SHA `eb61b97e…`.
- [x] Clore `TASK-20260809-003` sur les preuves exact-SHA observées.

## Governed Session Continuity / Operational Memory V1

- [x] Verrouiller la baseline et approuver la spécification.
- [x] Versionner le plan TDD détaillé avant tout code fonctionnel.
- [x] Reproduire en RED le faux alignement du SHA documentaire ancien.
- [x] Livrer le GREEN minimal sans changer les autres contrats Live State.
- [x] Implémenter les governed sessions durables distinctes de `MCP-Session-Id`.
- [x] Ajouter mémoire bornée, checkpoints, locks et contexte gouverné.
- [x] Observer les outils WRITE en `shadow` sans jamais les bloquer en V1.
- [x] Exécuter la régression complète avant la draft PR.
- [x] Créer la draft PR unique #44 et traiter la première revue par TDD additif.
- [x] Traiter par TDD les quatre findings de la seconde revue et les deux cas différentiels supplémentaires.
- [x] Obtenir la confirmation différentielle sans finding critique/important.
- [ ] Obtenir la CI verte du head exact, puis autoriser ready/merge.
- [ ] Après autorisation de merge, observer l’Autodeploy V1 existant et attester le runtime sans écriture directe S1.

## Maintenance séparée

- Migrer les actions GitHub encore exécutées sous compatibilité Node 24 dans une PR dédiée.
- La 2FA GitHub est explicitement exclue par décision humaine ; aucune activation ni action associée ne doit être menée dans ce chantier.

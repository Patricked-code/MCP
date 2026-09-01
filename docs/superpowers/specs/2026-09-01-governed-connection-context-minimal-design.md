# Governed Connection Context Minimal — Design

Date : 2026-09-01
Task : `TASK-20260901-001`
Repository : `Patricked-code/MCP`
Baseline : `main@184107d5705248427d322922077d18f51e133c15`
Statut : design approuvé, implémentation non commencée

## 1. Objectif

Ajouter un contexte de connexion minimal, durable, sanitizé et versionné à la Governed Session existante afin de conserver uniquement les preuves réellement disponibles lors d'une connexion MCP OAuth.

Ce premier lot prépare la résolution future identité GitHub → repository → GitRegistry V2 → projet → serveur/runtime/domaine → gouvernance héritée. Il n'effectue encore aucune de ces résolutions.

## 2. Autorités existantes conservées

Le design réutilise sans les remplacer :

- `src/auth.ts` pour produire `governedPrincipalId`, `clientId` et `identityAssurance` ;
- `RequestIdentity` et `SessionRequest` comme entrée authentifiée ;
- `GovernedSessionRecord` comme enveloppe durable ;
- le Session Store d'Operational Memory comme persistance ;
- `TransportBindings` pour les transports MCP éphémères ;
- `autoResumeCompatibleSession()` pour `ATTACHED`, `RESUMED`, `NONE` et `AMBIGUOUS` ;
- Governed Context comme projection de la session ;
- Live State, Governed Task Queue et Bootstrap Receipt dans leurs rôles actuels.

Aucun second Session Manager, store global, registre de connexion, Live State, audit journal ou chemin de déploiement n'est créé.

## 3. Invariants de non-régression

1. Les sessions persistées avant ce lot restent lisibles sans migration destructive.
2. Une nouvelle connexion OAuth compatible conserve les comportements `ATTACHED` et `RESUMED` existants.
3. Une attache de transport ne modifie pas la révision optimiste de la Governed Session.
4. Un credential partagé ne devient jamais une identité durable et ne permet toujours aucune reprise automatique.
5. Aucun token, code OAuth, secret, header Authorization ou identifiant de transport brut n'est persisté.
6. Aucun `conversation_id`, workspace, project ref ou nom de client n'est inventé.
7. `Patricked-code/MCP` reste le repository historique supporté.
8. Le Bootstrap Receipt, GitRegistry V1/V2, le WRITE gate et les mappings serveur ne changent pas dans ce lot.
9. Aucun push direct sur `main` ni aucune écriture directe sur S1.
10. Toute évolution passe par test RED, implémentation minimale GREEN, CI, PR, merge exact-head et attestation GitHub/S1/runtime.

## 4. Modèle minimal

Un nouveau type `ConnectionContext` est ajouté dans Operational Memory :

```ts
type ConnectionContext = {
  schemaVersion: 1;
  connectionContextId: string;
  governedSessionId: string;
  repository: 'Patricked-code/MCP';
  principalId: string;
  observedClientId: string | null;
  identityAssurance: 'oauth_subject';
  clientClassification: 'UNRESOLVED';
  evidenceSource: 'oauth_auth_info';
  createdAt: string;
};
```

### Signification

- `connectionContextId` : UUID stable du contexte logique, distinct du transport MCP.
- `governedSessionId` : référence vers la Governed Session propriétaire.
- `repository` : repository explicitement gouverné par la session actuelle.
- `principalId` : principal OAuth déjà sanitizé, par exemple `oauth:<subject>`.
- `observedClientId` : `AuthInfo.clientId` lorsqu'il est réellement disponible ; cette valeur reste opaque.
- `identityAssurance` : preuve que le contexte repose sur un sujet OAuth stable.
- `clientClassification` : reste `UNRESOLVED` ; aucun mapping arbitraire vers ChatGPT, Claude ou Codex.
- `evidenceSource` : indique que les données proviennent du contexte OAuth authentifié.
- `createdAt` : date de création du contexte, immuable dans ce lot.

Aucun champ `externalConversationRef` n'est ajouté tant qu'aucun client ne fournit une telle preuve. L'absence de donnée est conservée comme absence, pas transformée en identifiant fictif.

### Contraintes de validation exactes

- `connectionContextId` et `governedSessionId` : UUID ;
- `principalId` : chaîne trimée de 1 à 256 caractères commençant par `oauth:` ;
- `observedClientId` : `null` ou chaîne trimée de 1 à 256 caractères ;
- `createdAt` : date ISO-8601 avec offset ;
- objet strict : toute propriété supplémentaire est refusée.

## 5. Compatibilité du schéma

`GovernedSessionRecordSchema` reçoit :

```ts
connectionContext: ConnectionContextSchema.nullable().optional()
```

Cette forme garantit :

- anciennes sessions sans champ : acceptées ;
- nouvelles sessions OAuth : contexte présent ;
- sessions ouvertes sous credential partagé : contexte `null` ;
- aucune réécriture automatique de l'historique ;
- aucun changement du `schemaVersion: 1` du document de session.

Le champ est public parce qu'il ne contient aucune matière secrète. `resumeSecretHash` reste le seul champ retranché par `publicSession()`.

## 6. Création et cycle de vie

Une fonction pure et isolée est ajoutée dans `src/operationalMemory/connectionContext.ts` :

```ts
createConnectionContext(input: {
  governedSessionId: string;
  repository: 'Patricked-code/MCP';
  identity: RequestIdentity;
  createdAt: Date;
}): ConnectionContext | null
```

Règles :

- identité `oauth_subject` avec `principalId` OAuth non nul : crée le contexte ;
- `shared_credential` ou principal absent : retourne `null` ;
- `clientId` absent : `observedClientId = null` ;
- aucune classification de client n'est tentée ;
- les entrées sont validées par le schéma strict avant persistance.

`openSession()` appelle cette fonction après génération du `governedSessionId` et stocke le résultat.

`resumeSession()` et `autoResumeCompatibleSession()` conservent le contexte existant sans générer un nouvel identifiant. Les anciennes sessions sans contexte restent sans contexte dans ce lot ; leur enrichissement éventuel exigera un lot séparé et une règle de provenance explicite.

## 7. Projection

Le contexte est exposé uniquement par les surfaces qui exposent déjà la Governed Session :

- `mcp_get_governed_session` ;
- `mcp_list_governed_sessions` ;
- `GovernedOperationalContext.session` ;
- Current State lorsqu'il projette la session.

Aucun nouvel outil MCP ni endpoint HTTP n'est ajouté.

Le Bootstrap Receipt n'est pas enrichi dans cette PR. Cet enrichissement reste le lot D3, après les résolutions GitHub, repository et project binding.

## 8. Sécurité et redaction

Le schéma interdit :

- propriétés supplémentaires ;
- principal vide ou non borné ;
- clientId non borné ;
- identifiants non UUID ;
- repository autre que `Patricked-code/MCP` ;
- assurance autre que `oauth_subject` ;
- classification client autre que `UNRESOLVED` dans ce lot.

Les tests inspectent également la sérialisation afin de vérifier l'absence des motifs de token et de clé privée déjà interdits par GitRegistry V2.

Le journal opérationnel existant n'ajoute pas les valeurs du contexte dans ses métadonnées. L'événement `session.opened` reste borné par son allowlist actuelle.

## 9. Stratégie TDD

Ordre obligatoire :

1. RED : schéma et factory inexistants ;
2. GREEN : modèle et factory minimaux ;
3. RED : ouverture OAuth doit persister le contexte ;
4. GREEN : intégration minimale dans `openSession()` ;
5. RED : credential partagé doit produire `null` ;
6. GREEN : branche fail-closed ;
7. RED : `ATTACHED` et `RESUMED` doivent conserver le même `connectionContextId` ;
8. GREEN : aucune régénération pendant le cycle de reprise ;
9. RED : une session historique sans champ doit rester lisible ;
10. GREEN : compatibilité du schéma optionnel ;
11. suite complète : tests ciblés, tests Operational Memory, tests gouvernance, typecheck, build, docs, secret scan et read-only safety.

Chaque RED doit échouer pour l'absence du comportement attendu, jamais pour une erreur de syntaxe ou de fixture.

## 10. Fichiers envisagés

Création :

- `src/operationalMemory/connectionContext.ts` ;
- `tests/connectionContext.test.ts`.

Modification :

- `src/operationalMemory/types.ts` ;
- `src/operationalMemory/sessionService.ts` ;
- `tests/governedConnectionBootstrap.test.ts` ;
- `tests/governedSessionService.test.ts` pour prouver explicitement la lecture des sessions historiques sans `connectionContext` ;
- `SUIVI.md`, `CHANGELOG.md` et `DECISIONS_LOG.md` pour la traçabilité finale.

Non modifiés dans ce lot :

- `src/auth.ts` ;
- `src/server.ts` ;
- `src/github/registry.ts` ;
- `src/github/registryV2.ts` ;
- `src/governedContext/service.ts` ;
- Bootstrap Receipt ;
- `.mcp/*.json` ;
- workflows GitHub ;
- configuration runtime et S1.

## 11. Critères de DONE du premier lot

Le lot est DONE seulement si :

- le design et le plan sont validés ;
- tous les RED ont été observés ;
- tous les GREEN et la suite complète réussissent ;
- le diff reste borné au contexte minimal et à sa documentation ;
- aucune session historique n'est rejetée ;
- les comportements `ATTACHED`, `RESUMED`, `NONE` et `AMBIGUOUS` restent verts ;
- aucun secret n'apparaît dans le diff ou les réponses publiques ;
- la PR est fusionnée sous garde exact-head ;
- GitHub, S1 et runtime sont réattestés selon le pipeline gouverné ;
- Live State revient à `FULLY_ALIGNED` ;
- la task, les locks, le checkpoint et la session sont réconciliés dans Operational Memory.

## 12. Lots suivants explicitement différés

Après ce lot uniquement :

1. GitHub Identity Resolution ;
2. Repository Resolution ;
3. GitRegistry V2 Project Binding ;
4. Server / Runtime / Domain Resolution ;
5. Governance Inheritance et Effective Capabilities ;
6. Bootstrap Receipt Enrichment ;
7. Guided Context Completion.

Chaque lot futur devra disposer de son propre contrat TDD et de son propre périmètre de revue.
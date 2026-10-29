# 28 octobre 2026 — évolution détaillée de GD-U sur l'issue #349 et la PR #355

Cette pièce conserve les **jalons distincts** du 28 octobre, sans assimiler le mandat architectural à une implémentation, une CI verte à un déploiement, ni une habilitation souhaitée à un droit déjà accordé. Toutes les sources référencées sont des commentaires GitHub originaux consultables en entier. Un commentaire est un checkpoint historique, pas une autorité runtime.

## Précurseurs de la nouvelle phase universelle
- [#6459154498](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6459154498) : mandat A→Z, cas du dépôt non encore hébergé ; sous-chemin `/regulatory` distinct du sous-domaine, domaine entier, alias ou service privé. Classification des destinations et de leurs recettes indépendantes. Réutilisation `Task Queue / Governed Sessions / Claim / Lock / Operational Memory / Live State / TargetContext / GitRegistry V2`, et méthode `REUSE → COMPOSE → WRAP → EXPOSE → GENERALIZE → EXTEND → NEW`.
- [#6459168274](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6459168274) : mandat structurant de bout en bout ; GitRegistry comme relation durable, consentement, admission, publication, santé HTTPS, alertes, sauvegarde, restauration, reprise et preuve terminale. Contrat `OPERATOR_CONFIGURED_SERVER_TARGET` lié à #220, sans seconde autorité.
- [#6459201967](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6459201967) : matrice entre capacités **acquises**, manquantes et cibles. Sépare explicitement autodeploy du MCP, PROJECT_RUNTIME déjà fusionné, DOMAIN_BINDING incomplet, extension Plesk #350 et pilotes.
- [#6459697794](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6459697794) : réconciliation de l'existant ; main `48a529889517aa1c11974802d23acc3f35e0f187`, PR #350 fusionnée et workflow MCP déployé ; #351 candidat indépendant, aucune mutation Regulatory attestée.
- [#6460002460](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460002460) : audit read-only à `2026-10-28T03:33:20Z`, Live State 1147, baseline GitHub/S1/runtime alignée et healthy au SHA `48a529...`. Trois PR pilotes #351/#352/#353 sous revue ; blocage de l'écriture tant que le contrat du produit et l'admission ne sont pas réconciliés.

## Ouverture de la branche universelle
- [#6460680374](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460680374) : bifurcation GitHub-first `mcp/universal-github-plesk-server-capabilities-20261028`, PR #355 draft, base exacte `48a529889517aa1c11974802d23acc3f35e0f187`. Première capacité de vérification des permissions GitHub App par installation, sans en déduire un droit d'écriture. HEAD `2371d222975ed35de46a348d4918a75012d0421a`; CI #40632447512 en cours au moment du checkpoint.
- [#6460687375](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460687375) : CI #40632447512 déclarée SUCCESS sur le HEAD précédent ; revue et lot de découverte GD-U-02 à poursuivre sans activation write.

## Composition et représentation des capacités
- [#6460775637](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460775637) : GD-U-A1, composition consultative `src/provisioning/universalAutonomyAdvice.ts` des mécanismes de continuité, candidats, permissions et blocages. Tests de non-collision et de refus des fausses attestations. CI #40632948919 révèle deux défauts de fixture partagée ; commit `66be34dfeb882f92aebfea9dcbef60872220250a` corrige l'isolation des tests ; CI #40633113465 déclarée SUCCESS.
- [#6460936452](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6460936452) : GD-U-MAX/COMPOSE/CONTINUITY ; catalogue documentaire, non une délégation admin. HEAD `d45c15f4ca9f6013ce6414273da3a6dde506dd82`, CI #40634271648 SUCCESS annoncée. Aucun jeton admin, clé root, privilège Plesk ou accès serveur supplémentaire acquis par ce lot.
- [#6461020317](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461020317) : exposition des capacités et de la méthode ; RED commit `83be411d3b71ac443361caa167a90a8c529952f4` CI #40634710646 ; GREEN head `3e6c3592d7e0402dad5fc48a35d69f626b946147` CI #40634860846, SUCCESS déclarée. TDD + régression exigés avant toute généralisation.
- [#6461198869](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461198869) : GD-U-02A/B, table de 13 mappings catalogue→outils MCP réellement enregistrés, expose trois états distincts `REGISTERED_READ_ONLY`, `REGISTERED_GOVERNED_WRITE`, `REGISTERED_PREFLIGHT_ONLY`; pas de privilège créé par une simple entrée du catalogue. RED/CI et GREEN/CI séparées et liées dans la pièce.

## Exécuteur Plesk borné et raccordement aux autorités
- [#6461347131](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461347131) : GD-U-02C, module `src/provisioning/governedPleskSubdomainExecutor.ts` et tests. Compose planner/port/SSH existants ; refuse toute mutation faute d'attestation Task/Session/Lock/CI/E3 et scope exact. RED commit `07ce84b020633d9a84697c650c1dc506a5b7ab6f`, CI #40636818226 ; GREEN initiale #40637058702.
- [#6461357601](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461357601) : durcissement du transport privé ; CI #40637355488 SUCCESS sur le HEAD exact rapporté, mais PR #355 non fusionnée et aucune création Plesk réellement effectuée. Distinction : implémentation d'un backend capable de commander un port ≠ admission pour le faire en production.
- [#6461545940](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461545940) : GD-U-02D-A, lecture des **vraies** autorités Task Queue, Governed Session et Lock Service via `existingPleskAuthorityReader.ts` ; normalise la ressource `plesk:s1:wealthtechinnovations.com` en clé de lock gouverné. Sans consommateur E3 et revue/CI : `consent:null`, `reviewAndCiApproved:false`, donc aucune commande SSH admise.

## B1/B2, parcours UI et découverte
- [#6461724141](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461724141) : GD-U-02D-B1, passerelle `pleskWebOauthBridge.ts` ; vérification du ticket E3 réel et preuve OAuth sans prétendre lier la session gouvernée. B2 découple contrôle CI/revue et décision d'écriture ; retour `runtimeWriteAuthorized:false` tant que l'identité du transport n'est pas attestée. RED #40639430433 ; GREEN/CI référencées dans la source.
- [#6461732693](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461732693) : CI GREEN B1/B2 au HEAD `29c4a6ac2628398bb59b3f4b6460fd29655307d4`, refus préservé sans l'association web-E3↔transport.
- [#6461758220](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461758220) : modus operandi conversationnel, décisions demandées progressivement, pas de tâche fictive ni d'orchestrateur bis.
- [#6461801536](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461801536) : test pas à pas arrêté à l'étape 0/1 en lecture seule ; aucun privilège Plesk nouveau observé.
- [#6461939290](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461939290) : déclenchement cible à la connexion GitHub/Bridge, `NO_MAPPING` première installation vs `MAPPING_VERIFIED` reconnexion ; distinguer absence de mapping, absence OAuth, refus de scope GitHub et impossibilité d'observer l'événement client. **Proposition de UX**, non preuve qu'un client ChatGPT déclenche déjà ce flux automatiquement.

## B3a–B3j — série de jalons indépendants
- [#6461976834](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6461976834) : B3a, liaison contrôlée à un transport MCP authentifié existant sous tests RED/GREEN.
- [#6462137449](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462137449) : B3b/B3c, CI finale SUCCESS déclarée et contrôle de l'admission ; pas de write présumé.
- [#6462344808](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462344808) : B3d, mécanisme de ticket E3 atomique à usage unique en code et tests.
- [#6462497888](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462497888) : B3e, raccordement route web Plesk existante ; pas de nouvelle route parallèle.
- [#6462503769](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462503769) : B3e, CI GREEN exacte sur HEAD précisé dans source.
- [#6462636991](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462636991) : B3f, observation des autorités HTTP web E3 et transport OAuth MCP, sans inférer un privilège.
- [#6462841101](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6462841101) : B3g, contrôle de fraîcheur au moment de la consommation.
- [#6463111697](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6463111697) : B3h, vérification de l'intégrité CI GitHub.
- [#6463272263](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6463272263) : demande d'activation Plesk exprimée par le propriétaire. Une demande n'ouvre pas automatiquement les permissions serveur.
- [#6463812950](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6463812950) : B3i, défaut d'horodatage des revues GitHub, tests RED/GREEN.
- [#6464805449](https://github.com/Patricked-code/MCP/issues/349#issuecomment-6464805449) : B3j, revue de reprise / admission Plesk maintenue en HOLD.

## Frontières non franchies au terme des checkpoints du 28 octobre
Aucune preuve d'une opération Plesk réelle sous permission administrateur, aucune preuve d'un déploiement Regulatory bout-en-bout, aucune justification pour confondre les corrections candidates #355 avec les modules déjà déployés dans MCP main/S1.

## Accès à la totalité des textes
Le registre numéroté `10_REGISTRE_EXHAUSTIF_COMMENTAIRES_349.md` et les trois fichiers `11_REF_TECHNIQUES_ISSUE349_TRANCHE_*.md` donnent chaque URL originale, chaque SHA complet et chaque lien de workflow découvert sans supprimer les pièces sources.

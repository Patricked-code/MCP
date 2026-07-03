# Plan Execution Complet WealthTech Actualise - 2026-07-02

## Statut

Ce plan consolide les memoires disponibles apres integration :

- des conversations et prompts stockes dans `memory/` ;
- du document local `Loop Engineering Instructions.docx` ;
- des rapports A/A2/A3 et inventaires S1/S2 ;
- des documents `docs/` et `agents/` ;
- des sources locales ChainSolutions et workspace WealthTech ;
- des scripts historiques Niakara/WealthTech lus sans execution ;
- des 5 fichiers trouves uniquement dans `/root/wealthtech_project_memory/memory/`.

Limite maintenue : le transcript brut complet de la conversation externe `chatgpt.com/share/6a448c60-5794-83ed-8558-f1f4871748e5` n'est pas encore importe.

## Regles Non Negociables

1. Aucun secret dans GitHub, dans les rapports ou dans les fichiers memoire.
2. Ne lire que les noms de variables sensibles, jamais les valeurs.
3. Aucune suppression, migration, transaction blockchain, restart, reload, build, changement Plesk/vhost/Docker/PM2 ou push Git sans validation explicite.
4. Les scripts historiques sont des preuves documentaires, pas des commandes a rejouer.
5. Le mode par defaut est `read-only-first`.
6. La production doit rester intacte tant qu'une preproduction isolee n'a pas ete validee.
7. Le point de reprise principal reste `memory/LOOPBACK_WEALTHTECH_CURRENT.md`, puis `memory/SUIVI_MEMORY.md`, puis ce plan.

## Sources Canoniques

- Memoire canonique Git/MCP : `/opt/apps/wealthtech-mcp-ssh-bridge/memory/`
- Copie serveur : `/root/wealthtech_project_memory/memory/`
- Etats machine : `/root/wealthtech_project_memory/state/`
- Rapports : `/root/wealthtech_project_memory/reports/`
- GitHub MCP : `Patricked-code/MCP`
- S1 : `crazy-mendel` / `212.227.212.33`
- S2 : `priceless-mayer` / `217.160.249.254`
- MCP : `wealthtech_ssh_bridge`, mode `read-only-first`

## Objectif Global

Construire un pilotage durable de l'ecosysteme WealthTech permettant :

- de comprendre tous les serveurs, domaines, applications, depots, APIs et dependances ;
- de refondre le site principal WealthTech sans casser l'existant ;
- de consolider EWARI / KOREE / XOF, FundAfrica, ChainSolutions, OPCVM et les applications associees ;
- de tracer chaque action dans la memoire, dans les rapports serveur et, apres validation, dans GitHub ;
- de rendre chaque boucle repriseable par Codex, Claude, ChatGPT ou un agent MCP sans perte de contexte.

## Sequence Prioritaire

### Phase F0 - Stabilisation Memoire / Git / MCP

Objectif : rendre la memoire 20260702 durable.

Etapes :

1. Relire `git status` dans `/opt/apps/wealthtech-mcp-ssh-bridge`.
2. Exclure du commit tout fichier hors perimetre, notamment `package-lock.json` tant qu'il n'est pas analyse.
3. Stager uniquement les fichiers `memory/` crees ou modifies pour le Loop Engineering.
4. Executer :
   - `git diff --cached --check`
   - `node scripts/check-docs.mjs`
   - scan secret cible sur les fichiers indexes
5. Commit propose : `chore(memory): consolidate WealthTech loop engineering memory`
6. Push `origin main` seulement apres validation explicite.
7. Creer un rapport post-push dans `/root/wealthtech_project_memory/reports/`.

Critere de sortie :

- `origin/main` contient tous les fichiers memoire 20260702 ;
- `/root/wealthtech_project_memory/memory/` est synchronise ;
- `loop_state.json` contient le commit pousse.

### Phase A4 - Refonte Site Principal WealthTech En Preproduction

Objectif : preparer la refonte de `wealthtechinnovations.com` sans toucher la production.

Preuves actuelles :

- site principal recommande : `wealthtechinnovations.com` sur S1 ;
- stack actuelle : Nuxt/Vue production build present ;
- docroot actif identifie par A.3 ;
- `wealthtechinnovation.com` est alias/associe ;
- ChainSolutions/FundAfrica/Stablecoin sont applications metier liees mais distinctes.

Etapes :

1. Auditer le code actif en lecture seule : docroot, `.nuxt`, `production`, packages, routes, reverse proxy.
2. Identifier toutes les dependances visibles : API WealthTech, Stablecoin, Blockchain, TokenFactory, FundAfrica, ChainSolutions.
3. Definir un chemin preproduction separe, sans modification vhost production.
4. Creer une specification fonctionnelle du site institutionnel WealthTech.
5. Definir une strategie de refonte : reprise Nuxt existante ou nouveau front isole.
6. Tester preproduction par URL separee ou port interne avant tout basculement.
7. Preparer un plan de rollback avant demande de validation production.

Interdictions :

- pas de `npm run build` production ;
- pas de `systemctl reload` ;
- pas de changement Plesk/vhost ;
- pas de suppression du site existant.

### Phase B1 - Stablecoin EWARI / KOREE / XOF

Objectif : transformer les memoires EWARI en cahier d'architecture, conformité et execution technique, sans transaction blockchain.

Exigences issues des memoires :

- EWARI, E-WARI, KOREE et XOF appartiennent a la meme famille projet ;
- parite cible : `1 FCFA = 1 Koree` ;
- montage prudent : monnaie electronique ou representation technique blockchain selon validation reglementaire ;
- WITTI Finances est le partenaire financier identifie ;
- WealthTech Innovations est fournisseur technique ;
- documents attendus : livre blanc, architecture, dossier BCEAO/monnaie electronique, modele de partenariat, wallet, smart contract, API, OPCVM tokenises.

Etapes :

1. Auditer l'existant Stablecoin S2 en lecture seule : routes, containers, PM2, APIs, wallet.
2. Verifier la route vraie `/profil/wallet/` et ne pas confondre avec `/profil/portefeuille/`.
3. Cartographier smart contracts et fichiers blockchain sans cle privee, sans seed, sans transaction.
4. Produire le cahier d'architecture EWARI v1.
5. Produire la liste des documents BCEAO/WITTI a rediger.
6. Classer les risques : reglementaire, reserve, KYC/AML, emissions/rachats, audit smart contract, conservation fonds.
7. Definir un backlog technique separe : wallet, API, compliance, admin, reporting reserve, audit.

Critere de sortie :

- rapport B1 complet ;
- aucune transaction ;
- aucun secret lu ;
- aucune modification production.

### Phase C1 - FundAfrica / OPCVM / Applications Metier

Objectif : comprendre FundAfrica, OPCVM et applications financieres sans regression.

Etapes :

1. Lire les apps S2 FundAfrica/Chainsolutions en lecture seule.
2. Cartographier APIs, bases, workers, PDF/XLS services, domaines et reverse proxies.
3. Identifier ce qui doit etre relie au site principal WealthTech ou au site ChainSolutions.
4. Produire une matrice : garder, lier, migrer plus tard, auditer avant decision.
5. Ne pas toucher aux services `pdfsvc`, `xlsconv`, relayers, containers instables ou bases.

### Phase H1 - Site Corporate ChainSolutions

Objectif : preparer le futur site `chainsolutions.fr` SSR/SEO-first.

Exigences locales lues :

- Next.js SSR/SEO ;
- pages BRVM Research PRO, Profil Investisseur UEMOA, Simulateur Epargne, Parcours Epargnant UEMOA, Funds/OPCVM Afrique ;
- blog administrable, formulaire contact, stockage base, notification email, superadmin ;
- SEO : sitemap, robots, canonical `https://chainsolutions.fr`, schema.org.

Etapes :

1. Garder S2 protege, aucune modification directe.
2. Preparer specification UI/SEO/fonctionnelle.
3. Choisir preproduction separee.
4. Integrer seulement apres audit et validation.

### Phase E1 - Matrice Nettoyage S1/S2

Objectif : preparer le nettoyage futur sans supprimer.

Etapes :

1. Reprendre inventaires A, A2, A3 et rapports legacy.
2. Ajouter les domaines mentionnes par scripts historiques Niakara/WealthTech.
3. Classer chaque app en :
   - `garder`
   - `lier_au_site_principal`
   - `migrer_plus_tard`
   - `auditer_avant_decision`
   - `supprimer_plus_tard_apres_validation`
4. Pour chaque candidat nettoyage : preuve, risque, dependances, plan rollback.
5. Demander validation avant toute action.

### Phase D1 - Migration WealthTech S2 Vers S1

Objectif : planifier une migration future sans deplacement premature.

Etapes :

1. Identifier ce qui est vraiment WealthTech sur S2.
2. Identifier ce qui doit rester ChainSolutions/FundAfrica.
3. Concevoir une migration par lots, avec backups et tests.
4. Aucun transfert applicatif avant validation.

### Phase G1 - Architecture Ecosysteme Unifie

Objectif : produire une carte lisible de tout l'ecosysteme.

Livrables :

- carte serveurs/domaines/apps/APIs/bases ;
- diagramme de dependances ;
- ownership par projet ;
- risques et ordre de priorite ;
- politique de traces/audit.

### Phase I1 - Inventaire GitHub Global

Objectif : relier serveurs, depots et historique.

Etapes :

1. Lister les depots GitHub concernes.
2. Relier chaque depot a un chemin serveur ou a une application.
3. Identifier depots orphelins, apps sans depot, branches non poussees.
4. Ne rien pousser sans validation.

## Gates De Validation

Validation explicite requise pour :

- commit/push MCP ;
- modification production ;
- build/restart/reload ;
- changement Plesk/vhost/Docker/PM2 ;
- migration ;
- suppression ;
- lecture ou manipulation de secrets ;
- transaction blockchain ;
- changement base de donnees.

## Prochaine Action Recommandee

Action la plus utile maintenant :

1. Commit/push MCP des fichiers `memory/` 20260702 apres validation explicite.
2. Ensuite lancer A4 preproduction pour `wealthtechinnovations.com`.
3. En parallele, demander a l'utilisateur un export texte complet de la conversation ChatGPT externe pour fermer la seule lacune documentaire.

<!-- DOCUMENTS_DOWNLOADS_PLAN_ADDENDUM_20260702_START -->
## Addendum - Corpus local Documents/Downloads

Le corpus local ajoute deux sous-tracks a preparer apres stabilisation Git :

- `C2 - Corpus OPCVM local et data lake documentaire` : trier prompts, cahiers des charges, specs ClickHouse, wireframes, delivery, datasets BRVM/UEMOA/Tunisie/Maroc.
- `B2 - Dossier reglementaire EWARI/BCEAO/WITTI` : compiler architecture Hyperledger/Fabric, MiCA, BCEAO/AMF UMOA, WITTI, livre blanc et documents institutionnels.

Ces sous-tracks restent documentaires tant que le commit/push memoire F0 n'est pas valide.
<!-- DOCUMENTS_DOWNLOADS_PLAN_ADDENDUM_20260702_END -->

<!-- DOCUMENTS_DOWNLOADS_COMPLETE_REGISTER_PLAN_20260702_START -->
## Addendum - Registre complet Documents/Downloads

Le corpus local est maintenant classe par registre complet sanitizé : 204 documents sûrs extraits, datasets/structured data/code separes pour audit futur, fichiers sensibles exclus. Les sous-tracks `C2` et `B2` deviennent des tracks documentaires officiels apres stabilisation Git.
<!-- DOCUMENTS_DOWNLOADS_COMPLETE_REGISTER_PLAN_20260702_END -->

<!-- MCP_SERVER_SYNC_PLAN_ADDENDUM_20260703_START -->
## Addendum - Sources MCP/serveur/synchronisation

Le track `F0` inclut maintenant une verification future des automations et synchronisations (`CLAUDE/Scheduled`, MCP local, inventaires serveur). Les outils d'ecriture MCP detectes restent bloques sans validation explicite. Les documents institutionnels WealthTech/ChainSolutions lus localement alimentent `A4`.
<!-- MCP_SERVER_SYNC_PLAN_ADDENDUM_20260703_END -->

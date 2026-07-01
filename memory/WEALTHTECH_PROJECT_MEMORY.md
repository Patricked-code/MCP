# WEALTHTECH_PROJECT_MEMORY.md — Mémoire consolidée WealthTech / OPCVM / MCP

Date de consolidation : 2026-07-01  
Dépôt : `Patricked-code/MCP`  
Branche cible : `main`  
Dossier GitHub : `memory/`  
Dossier serveur cible : `/root/wealthtech_project_memory/memory/`

> Ce fichier compile les consignes opérationnelles, techniques et financières exprimées dans la conversation ChatGPT concernant le projet WealthTech, le MCP, le module OPCVM/FundAfrica et les règles de travail sans régression. Il ne contient volontairement aucun secret, aucune clé SSH, aucun `.env`, aucun mot de passe et aucun dump de base de données.

---

## 1. Règle absolue de travail

Toute intervention sur le projet doit respecter une règle stricte : **aucune régression, aucune action bloquante, aucune action destructive non validée, aucune intervention à l’aveugle**.

Avant toute modification de code, de base de données, de cron, d’architecture, de front-end, d’API, de calcul financier ou de documentation, l’agent doit :

1. lire les fichiers de documentation obligatoires du projet ;
2. comprendre l’état réel de l’application ;
3. vérifier le dernier point de reprise ;
4. lire le snapshot de production s’il existe ;
5. lire `PRODUCTION_STATE.json` s’il existe ;
6. diagnostiquer l’état réel de la base et de l’application ;
7. éviter toute hypothèse non vérifiée ;
8. documenter précisément ce qui est fait ;
9. garantir que ce qui fonctionne déjà reste fonctionnel ;
10. fournir, lorsque nécessaire, des commandes SSH complètes, claires, groupées en un seul flux.

L’objectif n’est jamais de réécrire sans contrôle, mais d’améliorer progressivement et proprement l’existant.

---

## 2. Fichiers de documentation à lire et maintenir

Avant toute action importante, l’agent doit relire et prendre en compte les fichiers suivants, lorsqu’ils existent :

- `CLAUDE.md`
- `SUIVI.md`
- `README_DEV.md`
- `ROADMAP.md`
- `CODE_REVIEW.md`
- `CHANGELOG.md`
- `TASKS.md`
- `README.md`
- `TODO.md`
- `DEPLOYMENT_PRODUCTION.md`
- le `POINT DE REPRISE COURANT` dans `SUIVI.md`

Si certains fichiers n’existent pas, ils doivent être créés afin de ne pas perdre les informations importantes du projet.

Après chaque intervention, les fichiers `.md` concernés doivent être mis à jour de façon minutieuse :

- état réel observé ;
- décisions prises ;
- fichiers modifiés ;
- commandes exécutées ;
- risques identifiés ;
- tests effectués ;
- points de reprise ;
- éléments restant à faire ;
- anomalies constatées ;
- corrections apportées ;
- éléments à ne surtout pas casser.

---

## 3. Compétence permanente à appliquer

Pour le module OPCVM, FundAfrica et les pages financières associées, l’agent doit toujours appliquer la compétence :

`expert-opcvm-fundafrica-developpement-sans-regression`

Cette compétence signifie que l’agent doit travailler à la fois comme :

- expert financier OPCVM ;
- analyste quantitatif ;
- analyste de données financières ;
- développeur full-stack ;
- ingénieur production ;
- gardien de non-régression ;
- responsable documentation projet ;
- auditeur technique et fonctionnel.

Aucune évolution ne doit casser les calculs, les pages, les classements, les données existantes, les crons existants, les endpoints existants ou l’expérience utilisateur déjà validée.

---

## 4. Production, base de données et diagnostic réel

L’agent ne doit pas évoluer à l’aveugle.

Pour les sujets nécessitant une analyse réelle, il doit :

- se connecter à l’état réel de production lorsque c’est nécessaire et autorisé ;
- vérifier la base de données réellement utilisée ;
- confirmer l’état des tables, colonnes, index, données et volumes ;
- vérifier les endpoints réellement exposés ;
- vérifier les crons réellement actifs ;
- vérifier les logs sans les rendre trop lourds ;
- vérifier les migrations existantes ;
- vérifier les données importées ;
- vérifier les derniers états de production via snapshot.

La règle `CLAUDE.md` à appliquer au démarrage :

1. récupérer le dernier snapshot production s’il existe ;
2. lire `PRODUCTION_STATE.json` ;
3. diagnostiquer l’état réel de la base et de l’application ;
4. ne jamais travailler sans état réel ;
5. confirmer si la base de production a bien été inspectée lorsque cela fait partie de la tâche.

---

## 5. ClickHouse — position actuelle

ClickHouse ne doit pas être intégré maintenant.

ClickHouse reste une piste long terme pour une application financière qui manipule beaucoup de calculs, de mises à jour et de recalculs.

Cas d’usage futurs possibles :

- recalculs massifs de performances ;
- recalculs de ratios ;
- recalculs de classements nationaux ;
- recalculs de classements régionaux ;
- recalculs de moyennes de catégories ;
- comparaisons entre fonds ;
- insertion rétroactive de VL ;
- insertion rétroactive de dividendes ;
- intégration de nouveaux fonds ;
- recalculs historiques multi-devises ;
- recalculs à partir d’indices de référence ;
- calculs de risques et statistiques avancées.

Mais toute future intégration ClickHouse devra respecter ces règles :

- ne jamais bloquer l’application principale ;
- ne jamais faire planter les autres applications ;
- ne jamais saturer le serveur ;
- ne jamais produire des logs trop lourds ;
- rester progressive ;
- rester isolée ;
- rester contrôlée ;
- rester observable ;
- être documentée ;
- pouvoir être désactivée sans casser l’application.

Pour l’instant, l’objectif est de consolider l’existant sans dépendre de ClickHouse.

---

## 6. Priorité d’audit OPCVM immédiate

L’audit prioritaire concerne l’exhaustivité, la cohérence et l’affichage des données OPCVM.

Points à vérifier en priorité :

### 6.1 Exhaustivité des VL

Vérifier l’exhaustivité des valeurs liquidatives des fonds par pays, au minimum sur les cinq dernières années :

- 2026 ;
- 2025 ;
- 2024 ;
- 2023 ;
- 2022 ;
- 2021 ;
- et, si possible, au-delà.

Objectif : éviter les trous, les VL mal renseignées, les VL manquantes, les dates incohérentes, les doublons et les données qui empêchent les calculs propres.

### 6.2 Crons

Vérifier que tous les crons tournent correctement :

- récupération des VL ;
- insertion des VL ;
- validation des VL ;
- recalcul des performances ;
- recalcul des ratios ;
- recalcul des classements ;
- recalcul des catégories ;
- recalcul des positionnements ;
- rafraîchissement des données affichées.

### 6.3 Données et validation

Vérifier que les valeurs liquidatives de tous les pays sont :

- récupérées ;
- insérées ;
- contrôlées ;
- validées ;
- non dupliquées ;
- cohérentes avec leur devise ;
- cohérentes avec leur date ;
- cohérentes avec le fonds concerné ;
- exploitables pour les performances et les ratios.

---

## 7. Anomalies observées par l’utilisateur

L’utilisateur a commencé à faire des captures d’écran sur certaines pages, notamment en devise locale. Ces anomalies peuvent aussi concerner les pages EUR et USD.

Anomalies signalées :

1. certains classements apparaissent à `null` ;
2. certains classements apparaissent à `infini` ;
3. certaines valeurs de classement sont incohérentes ;
4. certains ratios sont affichés mais semblent mal interprétés ;
5. les barres bleues de niveau ou de comparaison ne s’affichent pas correctement ;
6. certaines moyennes de catégories ne sont pas calculées ;
7. certaines pages fonds en devise locale ne montrent pas correctement la moyenne de catégorie ;
8. certaines incohérences peuvent venir de la donnée, du calcul, de l’API, du front-end ou de la structure de base.

L’agent doit donc identifier précisément l’origine des problèmes, sans supposer :

- données manquantes ;
- données invalides ;
- division par zéro ;
- absence d’historique suffisant ;
- devise mal traitée ;
- conversion EUR/USD incomplète ;
- catégorie absente ;
- benchmark absent ;
- requête SQL incomplète ;
- endpoint incomplet ;
- calcul non recalculé après insertion ;
- front-end affichant mal une valeur `null`, `NaN`, `Infinity` ou non normalisée ;
- barre visuelle non bornée ;
- problème de normalisation des ratios.

---

## 8. Audit complet demandé

L’agent doit réanalyser tout le système OPCVM :

- calculs ;
- ratios ;
- classements ;
- affichages ;
- barres visuelles ;
- moyennes de catégories ;
- comparaisons ;
- historiques ;
- performances mensuelles ;
- performances YTD ;
- performances 1 an, 2 ans, 3 ans, 5 ans si disponibles ;
- onglets devise locale ;
- onglets EUR ;
- onglets USD ;
- pages fonds ;
- pages pays ;
- pages catégories ;
- endpoints API ;
- structure DB ;
- front-end ;
- crons ;
- scripts d’import ;
- scripts de recalcul.

L’audit doit dire clairement :

- ce qui fonctionne ;
- ce qui ne fonctionne pas ;
- ce qui manque ;
- ce qui est incohérent ;
- ce qui doit être corrigé ;
- ce qui doit être protégé ;
- ce qui peut être amélioré plus tard ;
- ce qui ne doit pas être modifié maintenant.

---

## 9. Performances et historiques multi-devises

Concernant l’historique et les performances mensuelles, l’agent doit vérifier que tout est correctement calculé dans chaque onglet :

- devise locale ;
- EUR ;
- USD.

Les performances, historiques, ratios, moyennes de catégories, comparaisons avec indice de référence et classements doivent être cohérents :

- par fonds ;
- par pays ;
- par devise ;
- par catégorie ;
- par période ;
- par indice de référence lorsque disponible.

Si une moyenne de catégorie n’est pas calculée sur certaines pages, il faut déterminer si le problème vient :

- des données ;
- des catégories ;
- des requêtes API ;
- du front-end ;
- de la base de données ;
- de la devise ;
- des conversions ;
- du manque d’historique ;
- du traitement des valeurs non numériques.

---

## 10. Phase future : indices de référence et taux sans risque

Cette phase n’est pas prioritaire immédiatement.

Plus tard, il faudra prévoir une grande phase sur :

- les indices de référence par pays ;
- les indices de référence par catégorie ;
- les taux sans risque par pays ;
- les taux monétaires ;
- les benchmarks régionaux ;
- les benchmarks OPCVM ;
- les comparaisons par devise locale, EUR et USD.

Objectif futur : permettre des calculs financiers plus propres et plus complets :

- alpha ;
- bêta ;
- Sharpe ;
- Sortino ;
- tracking error ;
- information ratio ;
- VaR si applicable ;
- drawdown ;
- volatilité ;
- performance relative ;
- comparaison à l’indice de référence ;
- comparaison à la catégorie.

Cette phase pourra nécessiter des crons dédiés pour récupérer les indices et taux sans risque de chaque pays.

---

## 11. Commandes serveur attendues

Lorsque l’utilisateur demande une analyse ou une mise à jour serveur, l’agent doit fournir des commandes SSH :

- complètes ;
- robustes ;
- copiables en un seul flux ;
- non destructives par défaut ;
- documentées ;
- avec sauvegarde si nécessaire ;
- avec vérifications avant/après ;
- sans secrets ;
- sans suppression non validée ;
- sans redémarrage risqué non justifié.

Les commandes doivent idéalement :

1. afficher le dossier courant ;
2. vérifier l’état Git ;
3. lire les fichiers `.md` ;
4. vérifier `PRODUCTION_STATE.json` ;
5. vérifier Docker/PM2/crons ;
6. vérifier la base ;
7. exporter un diagnostic ;
8. ne corriger qu’après compréhension ;
9. enregistrer le résultat dans les fichiers `.md`.

---

## 12. Contexte MCP WealthTech

Le dépôt `Patricked-code/MCP` contient le projet `wealthtech_ssh_bridge`, destiné à exposer à ChatGPT/Codex des outils contrôlés pour inventorier, documenter et préparer les opérations sur les serveurs WealthTech.

Serveurs connus dans la documentation du dépôt :

- S1 : `root@212.227.212.33`
- S2 : `root@217.160.249.254`

Mode initial : **read-only first**.

Aucune suppression, aucun redémarrage, aucun vidage de dossier, aucune migration destructive ne doit être activé sans validation explicite.

Le MCP ne doit pas devenir une console root libre. Il doit exposer uniquement des outils contrôlés, nommés, documentés, journalisés et validés.

---

## 13. Mémoire de projet associée à BRVM / OPCVM

Éléments de contexte précédemment consolidés dans la conversation :

- application financière autour de la BRVM, UEMOA, OPCVM, fonds, valeurs liquidatives, obligations, actions et analyses ;
- besoin de maintenir une logique de production sans régression ;
- besoin de documenter les fichiers `CLAUDE.md`, `SUIVI.md`, `README_DEV.md`, `ROADMAP.md`, `TASKS.md`, `TODO.md`, `CODE_REVIEW.md`, `CHANGELOG.md`, `DEPLOYMENT_PRODUCTION.md` ;
- nécessité de lire le point de reprise courant avant toute intervention ;
- importance des données multi-pays, multi-devises et multi-catégories ;
- importance des performances YTD, mensuelles, 1 an, 2 ans, 3 ans, 5 ans ;
- importance des comparaisons entre fonds, catégories et indices ;
- importance d’éviter les valeurs `null`, `NaN`, `Infinity`, incohérentes ou non bornées dans les écrans ;
- importance de séparer l’audit immédiat de la phase future sur les benchmarks et taux sans risque.

---

## 14. Point de reprise courant proposé

Point de reprise courant pour les prochains agents :

1. Ne rien modifier avant lecture de la documentation.
2. Lire tous les fichiers `.md` du projet applicatif concerné.
3. Lire `PRODUCTION_STATE.json` s’il existe.
4. Identifier le dernier snapshot production.
5. Diagnostiquer l’état réel de la base et des crons.
6. Auditer les VL par pays de 2021 à 2026 au minimum.
7. Identifier les trous et incohérences de VL.
8. Contrôler les recalculs de performances, ratios et classements.
9. Repérer les `null`, `NaN`, `Infinity` et valeurs incohérentes.
10. Corriger les garde-fous de calcul et d’affichage sans régression.
11. Vérifier les onglets devise locale, EUR et USD.
12. Vérifier les moyennes de catégories.
13. Documenter tout changement.
14. Ne pas intégrer ClickHouse maintenant.
15. Garder ClickHouse comme piste long terme seulement.

---

## 15. Fichiers complémentaires créés dans `memory/`

Ce dossier doit contenir au minimum :

- `WEALTHTECH_PROJECT_MEMORY.md` : mémoire consolidée du projet ;
- `INSTALLATION_MCP_WEALTHTECH.md` : installation et synchronisation des fichiers mémoire vers le serveur ;
- `PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md` : prompt d’audit complet à donner à un agent IA/code ;
- `README.md` : index du dossier mémoire.

Ces fichiers sont destinés à être synchronisés vers :

```text
/root/wealthtech_project_memory/memory/
```

---

## 16. Rappel final

La priorité est l’amélioration continue, professionnelle, documentée et non destructive.

Aucune correction ne doit être faite à l’aveugle.

Aucune régression n’est acceptable.

Aucun secret ne doit être poussé dans GitHub.

ClickHouse n’est pas à intégrer maintenant.

Le module OPCVM doit être audité comme un vrai produit financier : données, calculs, ratios, classements, catégories, comparaisons, devises, historisation, front-end et production réelle.

# PROMPT_AUDIT_OPCVM_SANS_REGRESSION.md

Ce fichier contient le prompt d’audit OPCVM sans régression à utiliser pour le projet WealthTech/FundAfrica.

## Règle principale

Toujours travailler sans régression, sans action destructive, sans blocage de l’application et sans modification à l’aveugle.

## Documentation obligatoire

Avant toute intervention, lire :

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

Mettre à jour les fichiers de documentation après chaque intervention.

## Audit demandé

Auditer le module OPCVM/FundAfrica avec une approche d’expert financier et de développeur full-stack senior.

Points à contrôler :

- exhaustivité des VL par pays de 2021 à 2026 au minimum ;
- absence de trous dans les historiques ;
- crons de récupération et d’insertion ;
- validation des VL ;
- recalcul des performances ;
- recalcul des ratios ;
- recalcul des classements nationaux et régionaux ;
- catégories et positionnements ;
- moyennes de catégories ;
- comparaisons entre fonds ;
- cohérence des onglets devise locale, EUR et USD ;
- historiques et performances mensuelles ;
- affichage des ratios ;
- affichage des barres visuelles bleues ;
- gestion propre des valeurs `null`, `NaN`, `Infinity` et non calculables.

## ClickHouse

Ne pas intégrer ClickHouse maintenant. Le garder comme piste long terme uniquement, pour de futurs recalculs lourds, sans blocage serveur et sans logs excessifs.

## Benchmarks et taux sans risque

La phase sur les indices de référence par pays et les taux sans risque est à traiter plus tard. Pour l’instant, se concentrer sur l’existant.

## Livrables attendus

Fournir les constats, les anomalies, les corrections, les tests, les fichiers modifiés, les risques résiduels et le nouveau point de reprise.

Aucune régression n’est acceptable.

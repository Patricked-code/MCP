# Arbre hiérarchique des autorités, programmes, réalisations et pilotes

```text
Patricked-code/MCP — programme global (#235)
├── Gouvernance existante : Task / Session / Claim / Lock / Consent / Checkpoint
├── Gouvernance GitHub et GitRegistry
│   ├── Reprise non destructive : PR #15
│   ├── GitRegistry V2 dry-run : PR #23 (historique non fusionné) → #27
│   ├── Résolution GitHub : PR #75
│   └── Control plane Git/GitHub : PR #88 → #89 → #90 (statuts à réconcilier)
├── Governed Deploy historique : déploiement du MCP lui-même
│   ├── Traces PR #63, #76, #84, #85
│   ├── Workflow MCP Governed Deploy, attestations exact-SHA
│   └── Traces de déploiement PR #168, #228..#269
├── Provisioning initial PB-F / TB-W3-F
│   ├── F-01 : PR #257 → clôture #258
│   ├── F-03 : PR #259 → #260 → #261 → clôture #263
│   └── F-04 : PR #267 → #269 → #271 ; état terminal à réconcilier
└── Extension universelle (#349) [ne remplace aucune branche ci-dessus]
    ├── Mandat général et tranches A/B/C/D/E : commentaire #6353793573
    ├── Plesk S1/S2 : PR #350 (merge et déploiement MCP attestés)
    ├── Pilote GRT : PR #351
    ├── Pilote Regulatory : PR #352, #353
    │   ├── Produit distinct : chainsolutions-wealthtech/Regulatory
    │   ├── Contradiction sous-chemin/sous-domaine : Regulatory issue #3
    │   └── Session et checkpoints propres ; aucune reprise de claim OAuth
    └── Extension GD-U : PR #355
        └── B3i : GD-U-02D-CONT-20261029-B3I-ROOT-01

Pilotes → observations → anomalies → exigences génériques → correctifs TDD → attestation → nouveau pilote.
Cette boucle est une filiation de conception, pas une permission d'écriture.
```

## Relations transversales à conserver
- #349 dépend du provisioning antérieur, mais ne marque pas l'origine technique de Governed Deploy.
- Regulatory est simultanément un produit métier autonome et un pilote d'intégration de l'orchestrateur.
- Les workflows déployant le MCP et ceux permettant au MCP de déployer des applications sont distincts.
- Les issues/PR documentaires n'accordent jamais de privilège d'exécution.

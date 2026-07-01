# Handoff Codex — Stablecoin E-WARI / WealthTech

Copier ce document dans Codex avant de reprendre le projet Stablecoin E-WARI.

---

## Mission immédiate

Reprendre le travail sur Stablecoin E-WARI sans perdre le fil de la conversation précédente.

Ne pas commencer par coder. Commencer par lire la mémoire :

```text
memory/2026-05-05-stablecoin-ewari-conversation-memory.md
memory/PROMPT_AUDIT_6BI_B.md
memory/INSTALL_MCP_WEALTHTECH_MEMORY.md
```

---

## Projet applicatif

Repo :

```text
https://github.com/Patricked-code/Stablecoin.git
```

Serveur :

```text
/var/www/vhosts/chainsolutions.fr/stablecoin.chainsolutions.fr/stablecoin
```

URL :

```text
https://stablecoin.chainsolutions.fr
```

Wallet réel :

```text
https://stablecoin.chainsolutions.fr/profil/wallet/
```

Ne pas utiliser comme Wallet :

```text
https://stablecoin.chainsolutions.fr/profil/portefeuille/
```

Cette dernière route est un faux miroir historique, à traiter plus tard.

---

## État validé

Commit applicatif validé :

```text
6216755d318677ed9a56c36731a57531d02bf751
```

Build public validé :

```text
qCotQPq7AlEarYmuz0wu4
```

Transaction technique minimale validée :

```text
txHash: 0xb3a686345418e2f42cea46b4b7a4059f1c3ccd6aa312bf836ec0cd8438ccb0f1
relayerTransactionId: 8236afa5-06c4-47fb-b5a1-673ea41f10a0
receipt status: 1
relayer status: confirmed
```

Contrat E-WARI actuel :

```text
0xe2C51e1da04F23ef214eD45Dac84Bd49c8D7aa64
```

Relayer :

```text
0x87E792E9064568361D88F8738221F8e659B0abB1
```

---

## Décisions déjà prises

1. Le frontend ne doit plus appeler directement `metaTransfer`.
2. Le frontend doit passer par `/api/metaTransfer/`.
3. Le backend peut contenir `encodeFunctionData("metaTransfer")` et les appels relayer.
4. Le relayer fonctionne techniquement.
5. La prochaine étape ne doit pas être une nouvelle transaction UX immédiate.
6. Il faut d’abord auditer les règles métier : rôle, abonnement, autorisation relayer, commission, quota, type de transaction.
7. `/profil/wallet/` est la seule route Wallet de référence.
8. `/profil/portefeuille/` est une dette technique à supprimer ou rediriger plus tard.

---

## Prochaine étape à exécuter

```text
6BI-B — Audit métier pré-transaction Wallet / Relayer / Abonnement / Rôle / Commission, sans transaction.
```

Contraintes absolues :

- pas de transaction ;
- pas de modification ;
- pas de build ;
- pas de restart ;
- pas de commit ;
- pas de push ;
- ne pas afficher de secrets ;
- produire un rapport lisible ;
- garder la méthode par étapes.

---

## Règle de sécurité

Ne jamais demander ou afficher dans Codex :

- token Bearer utilisateur ;
- clé privée ;
- `.env.local` complet ;
- API key ;
- clé OpenZeppelin Relayer ;
- mot de passe ;
- secret.

Pour les scripts, afficher seulement :

```text
présent longueur=<n>
```

ou des valeurs masquées.

---

## Style attendu

Répondre en français.  
Donner des commandes copiables.  
Ne pas faire de promesses floues.  
Toujours conclure par :

```text
Ce qui est validé
Ce qui manque
Prochaine étape logique
```

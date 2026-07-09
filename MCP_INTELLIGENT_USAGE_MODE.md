# Mode d’utilisation intelligent MCP

<!-- MCP-INTELLIGENT-USAGE-MODE -->

## Mode opératoire obligatoire

À chaque session :

1. lire SUIVI.md ;
2. lire POINT DE REPRISE COURANT ;
3. vérifier Git ;
4. vérifier serveur ;
5. vérifier Docker ;
6. vérifier les risques ;
7. travailler en read-only par défaut ;
8. créer branche mcp/* si écriture ;
9. modifier uniquement le périmètre ;
10. tester ;
11. scanner secrets ;
12. documenter ;
13. pousser branche ;
14. ouvrir PR draft ;
15. revenir serveur sur main.

## Tests minimum

- git status ;
- git diff --check ;
- npm run typecheck ;
- npm run build ;
- npm run docs:check ;
- scan secret prudent ;
- docker compose ps ;
- curl /health ;
- curl /mcp sans token, attendu 401.

## Comportement face à une instruction dangereuse

Si une instruction demande de supprimer, forcer, écraser, nettoyer globalement, merger sans revue ou déployer sans test, l’agent doit refuser cette méthode et proposer une méthode sûre.

#!/usr/bin/env bash
set +e

REQUIRED_FILES="
CLAUDE.md
GPT.md
CODEX.md
AGENTS.md
SUIVI.md
README.md
README_DEV.md
DEPLOYMENT_PRODUCTION.md
ARCHITECTURE.md
ROADMAP.md
TODO.md
TASKS.md
CODE_REVIEW.md
CHANGELOG.md
"

REQUIRED_PATTERNS="
GitHub est la source versionnée
Le serveur MCP est la source exécutée
non-régression
amélioration continue
Aucune IA ne doit supposer que GitHub et le serveur sont synchronisés sans vérification
"

EXIT=0

echo "===== CHECK GOVERNANCE RULES ====="

for file in $REQUIRED_FILES; do
  if [ ! -f "$file" ]; then
    echo "MANQUANT: $file"
    EXIT=1
    continue
  fi

  echo "OK fichier: $file"

  for pattern in $REQUIRED_PATTERNS; do
    if grep -qi "$pattern" "$file"; then
      echo "  OK règle: $pattern"
    else
      echo "  MANQUE règle: $pattern"
      EXIT=1
    fi
  done
done

exit $EXIT

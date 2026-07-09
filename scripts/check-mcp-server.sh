#!/usr/bin/env bash
set +e

cd /opt/apps/wealthtech-mcp-ssh-bridge || {
  echo "ERREUR: dossier MCP introuvable"
  exit 1
}

echo "===== MCP SERVER CHECK ====="
date
echo

echo "===== DOSSIER ====="
pwd
echo

echo "===== GIT REMOTE ====="
git remote -v
echo

echo "===== BRANCHE ====="
git branch --show-current
echo

echo "===== STATUS ====="
git status --short
echo

echo "===== DERNIERS COMMITS ====="
git log --oneline -n 5
echo

echo "===== FICHIERS MARKDOWN OBLIGATOIRES ====="
for f in CLAUDE.md GPT.md CODEX.md AGENTS.md SUIVI.md README.md README_DEV.md DEPLOYMENT_PRODUCTION.md ARCHITECTURE.md ROADMAP.md TODO.md TASKS.md CODE_REVIEW.md CHANGELOG.md; do
  if [ -f "$f" ]; then
    echo "OK $f"
  else
    echo "MANQUANT $f"
  fi
done
echo

echo "===== PRODUCTION_STATE.json ====="
if [ -f PRODUCTION_STATE.json ]; then
  cat PRODUCTION_STATE.json
else
  echo "MANQUANT PRODUCTION_STATE.json"
fi
echo

echo "===== DOCKER ====="
docker compose ps
docker ps -a | grep -E 'wealthtech_mcp_ssh_bridge|CONTAINER' || true
echo

echo "===== PORTS ====="
ss -ltnp | grep -E ':8787|apache|nginx|node' || true
echo

echo "===== LOGS MCP ====="
docker logs --tail=100 wealthtech_mcp_ssh_bridge 2>&1 || true
echo

echo "===== ENDPOINTS PUBLICS ====="
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/health 2>&1 || true
echo
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/.well-known/oauth-protected-resource 2>&1 || true
echo
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/.well-known/oauth-authorization-server 2>&1 || true
echo
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/mcp 2>&1 || true

#!/usr/bin/env bash
set -euo pipefail

cd /opt/apps/wealthtech-mcp-ssh-bridge

echo "===== AVANT SYNC ====="
pwd
git remote -v
git branch --show-current
git status --short

if [ -n "$(git status --short)" ]; then
  echo "STOP: modifications locales présentes. Synchronisation refusée pour éviter d'écraser du travail non documenté."
  exit 1
fi

echo "===== FETCH ====="
git fetch origin

echo "===== PULL FF-ONLY ====="
git pull --ff-only origin main

echo "===== BUILD DOCKER ====="
docker compose build

echo "===== UP DOCKER ====="
docker compose up -d

echo "===== CHECK ====="
docker compose ps
docker logs --tail=100 wealthtech_mcp_ssh_bridge || true

echo "===== HEALTH ====="
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/health || true
curl -i --max-time 20 https://mcp.wealthtechinnovations.com/mcp || true

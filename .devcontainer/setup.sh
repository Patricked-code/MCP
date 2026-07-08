#!/usr/bin/env bash
set -e
echo "===== Codespace MCP setup ====="
node --version || true
npm --version || true
gh --version || true
if [ -f package.json ]; then
  npm install
fi
mkdir -p data logs
echo "Codespace prêt pour MCP Onboarding Engine."
echo "Organisation cible : chainsolutions-wealthtech"
